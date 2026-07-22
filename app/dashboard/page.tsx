// app/dashboard/page.tsx — 서버 컴포넌트
// 카테고리 AI 분석은 클라이언트 사이드에서 스트리밍 로드 (Dashboard.tsx useEffect)
import { Dashboard } from "@/components/dashboard/Dashboard"
import type { CategoryId, DashboardData, MlForecastData } from "@/lib/types"
import type { RecommendationContext } from "@/lib/recommendationCopy"

const SIDO_NAMES: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천",
  "29": "광주", "30": "대전", "31": "울산", "36": "세종",
  "41": "경기", "43": "충북", "44": "충남", "46": "전남",
  "47": "경북", "48": "경남", "50": "제주",
}

async function fetchMlForecast(lawdCd: string): Promise<MlForecastData> {
  try {
    const gateUrl = process.env.ML_ENGINE_URL || process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "http://localhost:8001"
    const res = await fetch(
      `${gateUrl}/market/score?lawd_cd=${lawdCd}`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = await res.json()
    const sidoCd = lawdCd ? lawdCd.slice(0, 2) : null
    const horizons = (raw.results ?? []).map((r: {
      horizon: number; yyyymm: string; total: number
      sido_scores: Record<string, number>; dir_acc: number
    }) => ({
      horizon: r.horizon,
      yyyymm: r.yyyymm,
      total: r.total,
      regionScore: sidoCd ? (r.sido_scores[sidoCd] ?? null) : null,
      dirAcc: r.dir_acc,
    }))
    return {
      available: true,
      timestamp: raw.timestamp,
      horizons,
      lawdCd,
      regionName: sidoCd ? SIDO_NAMES[sidoCd] : undefined,
    }
  } catch {
    return { available: false }
  }
}

async function fetchExplainability(aptId: number | null) {
  if (!aptId) return null
  try {
    const gateUrl = process.env.ML_ENGINE_URL || process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "http://localhost:8001"
    const res = await fetch(
      `${gateUrl}/apt/${aptId}?horizon=6`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = await res.json()
    return {
      score_explanation: raw.score_explanation,
      score_components: raw.score_components,
      evidence: raw.evidence,
    }
  } catch {
    return null
  }
}

async function fetchAptIdFromLookup(aptName: string, lawdCd: string): Promise<number | null> {
  if (!aptName || !lawdCd) return null
  try {
    const gateUrl = process.env.ML_ENGINE_URL || process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "http://localhost:8001"
    const sigunguCd = lawdCd.slice(0, 5)
    if (!sigunguCd) return null
    const res = await fetch(
      `${gateUrl}/apt/lookup?apt_nm=${encodeURIComponent(aptName)}&sigungu_cd=${sigunguCd}`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const raw = await res.json()
    return raw?.apt_id ? Number(raw.apt_id) : null
  } catch {
    return null
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string; apt?: string; lawdCd?: string; area?: string; gateScore?: string; dbFinalScore?: string; is_presale?: string; aptId?: string; purpose?: string; timeline?: string; budget?: string }>
}) {
  const params = await searchParams

  // 기본값: .env 설정
  let address       = process.env.MY_ADDRESS  || "서울특별시 강남구 역삼동"
  let aptName       = process.env.MY_APT_NAME || "역삼 래미안"
  let lawdCd        = process.env.LAWD_CD     || "11680"
  let purchasePrice = Number(process.env.PURCHASE_PRICE || 0)
  let interiorCost  = Number(process.env.INTERIOR_COST  || 0)
  let userName      = "게스트"
  let myHomeAddress: string | null = null   // DB에 저장된 우리집 주소 (비교용)
  let myHomeAptName: string | null = null   // DB에 저장된 우리집 아파트명 (비교용)

  // 로그인된 경우 DB에서 사용자 부동산 정보로 덮어씀 (Supabase + NextAuth 통합)
  if (process.env.DATABASE_URL) {
    try {
      const { getSessionUser } = await import("@/lib/getSessionUser")
      const { prisma } = await import("@/lib/prisma")
      const sessionUser = await getSessionUser().catch(() => null)
      if (sessionUser) {
        const user = await prisma.user.findUnique({
          where: { id: sessionUser.id },
          include: { property: true },
        })
        if (user) {
          userName = user.name || user.email.split("@")[0]
          if (user.property) {
            myHomeAddress = user.property.address
            myHomeAptName = user.property.aptName
            address       = user.property.address
            aptName       = user.property.aptName
            lawdCd        = user.property.lawdCd || lawdCd
            purchasePrice = user.property.purchasePrice
            interiorCost  = user.property.interiorCost
          }
        }
      }
    } catch {
      // DB 조회 실패해도 기본값으로 계속 진행
    }
  }

  // URL 파라미터가 있으면 최우선 적용 (메인페이지 검색에서 넘어온 경우)
  if (params.address) address = params.address
  if (params.apt)     aptName = params.apt
  if (params.lawdCd)  lawdCd  = params.lawdCd

  // URL로 특정 아파트를 보고 있는데, DB에 저장된 우리집과 다른 아파트면
  // 매매가/인테리어/투자금을 0으로 초기화 (다른 아파트에 내 집 값이 뜨는 버그 수정)
  const isViewingSpecificApt = !!(params.apt || params.address)
  if (isViewingSpecificApt && myHomeAptName && myHomeAddress) {
    const isMyHome = (aptName === myHomeAptName && address === myHomeAddress)
    if (!isMyHome) {
      purchasePrice = 0
      interiorCost = 0
    }
  }

  const area = params.area || process.env.MY_AREA || ""

  // 지도 팝업에서 넘어온 경우: 오를지 게이트 사전계산 점수 (Gemini 없이 빠른 분석)
  const gateScore = params.gateScore !== undefined && params.gateScore !== "" ? Number(params.gateScore) : null
  // gate.db에서 미리 계산된 통합점수 (ML 65% + AI 35%), 있으면 최우선 사용
  const dbFinalScore = params.dbFinalScore !== undefined && params.dbFinalScore !== "" ? Number(params.dbFinalScore) : null
  const isPresale = params.is_presale === "1"
  const aptId = params.aptId !== undefined && params.aptId !== "" ? Number(params.aptId) : null
  const recommendationContext: RecommendationContext = {
    purpose: params.purpose === "투자" ? "투자" : params.purpose === "실거주" ? "실거주" : "",
    timeline: params.timeline === "3개월" || params.timeline === "6개월" || params.timeline === "1년" || params.timeline === "미정"
      ? params.timeline
      : "",
    budget: params.budget ? Number(params.budget) || 0 : 0,
  }

  const resolvedAptId = aptId || await fetchAptIdFromLookup(aptName, lawdCd)

  const [mlForecast, explainability] = await Promise.all([
    fetchMlForecast(lawdCd),
    fetchExplainability(resolvedAptId),
  ])

  const data: DashboardData = {
    totalScore: gateScore ?? 50,  // 카테고리 로드 전 초기값, 클라이언트에서 실시간 갱신
    gateScore,
    finalScore: dbFinalScore,     // DB 값 있으면 사용, 없으면 클라이언트 계산
    categories: {} as Record<CategoryId, never>,  // 클라이언트 스트리밍 로드
    myProperty: {
      address,
      aptName,
      area,
      purchasePrice,
      interiorCost,
      totalInvestment: purchasePrice + interiorCost,
    },
    sellScenarios: [],
    lastUpdated: new Date().toISOString(),
    mlForecast,
    is_presale: isPresale || undefined,
    presale_score_label: isPresale ? "분양가 경쟁력 70% + 지역 리스크 30%" : undefined,
    score_explanation: explainability?.score_explanation || (isPresale ? (
      "실거래 데이터가 없는 분양예정 단지입니다. 주변 아파트 시세와 분양가를 비교해 점수를 산출했습니다."
    ) : undefined),
    score_components: explainability?.score_components,
    evidence: explainability?.evidence,
  }

  return <Dashboard data={data} userName={userName} lawdCd={lawdCd} recommendationContext={recommendationContext} />
}
