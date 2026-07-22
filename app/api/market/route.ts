// app/api/market/route.ts
import { NextResponse } from "next/server"
import { analyzeWithClaude } from "@/lib/claude"
import { withCache, CACHE_TTL } from "@/lib/cache"
import { fetchRealPrices, filterMyApt, calcStats } from "@/services/kosis"
import type { ApiResponse, CategoryResult, TradeRecord } from "@/lib/types"
import { getRentalAnalysisBlockReason } from "@/lib/propertyClassification"
import { buildReferenceTrades } from "@/lib/riskAnalysis/comparableTrades"

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || "http://localhost:8000"
const GATE_URL      = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"

async function fetchMlRegionScore(lawdCd: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${ML_ENGINE_URL}/market/score?lawd_cd=${lawdCd}&horizon=12`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (!res.ok) return null
    const raw = await res.json()
    return raw.region_score ?? null
  } catch {
    return null
  }
}

/** gate API에서 단지 실거래 데이터 조회 (aptId 직빵) */
async function fetchGateRecentTrades(aptId: string): Promise<TradeRecord[] | null> {
  try {
    const res = await fetch(
      `${GATE_URL}/apt/${aptId}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const apt = await res.json()
    if (apt?.is_presale || apt?.no_trade_data) return []
    if (!apt.recent_trades || !Array.isArray(apt.recent_trades)) return null
    return apt.recent_trades.map((t: { ym: string; floor: string; area_m2: number; price_man: number; dealType?: string }) => ({
      aptName: apt.apt_nm ?? "",
      dealDate: t.ym.replace(".", "-"),
      floor: String(t.floor),
      area: String(t.area_m2),
      price: t.price_man,
      dong: "",
      dealType: (t.dealType as "매매" | "전세" | "월세") || "매매",
    }))
  } catch {
    return null
  }
}

/** gate API에서 전세 데이터 + 단지 최근 실거래가 조회 */
async function fetchGateJeonseData(aptName: string, lawdCd: string): Promise<{
  isPresale: boolean
  umdNm: string | null
  jeonseMedianPy: number | null
  jeonseRiskLevel: string | null
  jeonseRiskScore: number | null
  latestPrice: number | null       // 단지 확정 실거래가 (만원)
  latestPriceYyyymm: string | null // 거래월 (YYYYMM)
} | null> {
  try {
    // 1) apt_id 조회
    const lookupRes = await fetch(
      `${GATE_URL}/apt/lookup?apt_nm=${encodeURIComponent(aptName)}&sigungu_cd=${lawdCd}`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (!lookupRes.ok) return null
    const lookup = await lookupRes.json()
    const aptId = lookup?.apt_id
    if (!aptId) return null

    // 2) 단지 분석 데이터 조회
    const aptRes = await fetch(
      `${GATE_URL}/apt/${aptId}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!aptRes.ok) return null
    const apt = await aptRes.json()
    if (apt?.is_presale || apt?.no_trade_data) {
      return {
        isPresale: true,
        umdNm: typeof lookup?.umd_nm === "string" ? lookup.umd_nm : null,
        jeonseMedianPy: null,
        jeonseRiskLevel: null,
        jeonseRiskScore: null,
        latestPrice: null,
        latestPriceYyyymm: null,
      }
    }

    return {
      isPresale: false,
      umdNm: typeof lookup?.umd_nm === "string" ? lookup.umd_nm : null,
      jeonseMedianPy:      apt.jeonse_median_py    ?? null,
      jeonseRiskLevel:     apt.jeonse_risk_level    ?? null,
      jeonseRiskScore:     apt.jeonse_risk_score    ?? null,
      latestPrice:         apt.price               ?? null,
      latestPriceYyyymm:  apt.latest_price_yyyymm  ?? null,
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address  = searchParams.get("address") || undefined
  const aptName  = searchParams.get("apt")     || undefined
  const lawdCd   = searchParams.get("lawdCd")  || process.env.LAWD_CD || ""
  const areaM2   = searchParams.get("area") ? parseFloat(searchParams.get("area")!) : null  // 전용면적 ㎡
  const aptId    = searchParams.get("aptId")   || undefined
  const aptKey   = (aptName || aptId || "default").replace(/\s+/g, "-").slice(0, 20)
  const areaKey  = lawdCd || address?.replace(/\s+/g, "-").slice(0, 12) || "nokey"
  try {
    const { data, cached, cachedAt } = await withCache(
      `market:${areaKey}:${aptKey}`,
      CACHE_TTL.market,
      async () => {
        let allTrades = await fetchRealPrices(6, lawdCd)
        let myTrades  = filterMyApt(allTrades, aptName)
        // 6개월 내 거래가 없으면 36개월까지 확장 조회
        if (myTrades.length === 0) {
          allTrades = await fetchRealPrices(36, lawdCd)
          myTrades = filterMyApt(allTrades, aptName)
        }

        const rentalBlockReason = getRentalAnalysisBlockReason(aptName, address, myTrades.length)
        if (rentalBlockReason) {
          return {
            id: "market",
            score: 0,
            trend: "neutral" as const,
            summary: rentalBlockReason,
            items: [],
            updatedAt: new Date().toISOString(),
            error: rentalBlockReason,
          } as CategoryResult
        }

        let recentTrades = [...myTrades].sort((a, b) => {
          const da = new Date(`${a.dealDate}-01`).getTime()
          const db = new Date(`${b.dealDate}-01`).getTime()
          return db - da
        }).slice(0, 3)
        let latestTrade: TradeRecord | null = recentTrades[0] ?? null
        let latestScope: "apt" | "lawd" | "none" = recentTrades.length > 0 ? "apt" : "none"
        let stats       = calcStats(myTrades)
        const [mlScore, gateJeonse, gateTrades] = await Promise.all([
          lawdCd ? fetchMlRegionScore(lawdCd) : Promise.resolve(null),
          (aptName && lawdCd) ? fetchGateJeonseData(aptName, lawdCd) : Promise.resolve(null),
          aptId ? fetchGateRecentTrades(aptId) : Promise.resolve(null),
        ])
        const referenceTrades = buildReferenceTrades(
          allTrades,
          aptName,
          areaM2,
          gateJeonse?.umdNm ?? null,
        )

        if (gateJeonse?.isPresale) {
          myTrades = []
          recentTrades = []
          latestTrade = null
          latestScope = "none"
          stats = calcStats([])
        }

        // Gate API recent_trades가 있으면 MOLIT보다 우선 (NaverMap과 동일한 최신 데이터)
        if (!gateJeonse?.isPresale && gateTrades && gateTrades.length > 0) {
          const sorted = [...gateTrades].sort((a, b) => {
            const da = new Date(a.dealDate + "-01").getTime()
            const db = new Date(b.dealDate + "-01").getTime()
            return db - da
          })
          recentTrades = sorted.slice(0, 5)
          latestTrade = sorted[0]
          latestScope = "apt"
        }
        const referencePrices = referenceTrades.trades.map((trade) => trade.price)
        const referenceAvg = referencePrices.length > 0
          ? Math.round(referencePrices.reduce((sum, price) => sum + price, 0) / referencePrices.length)
          : 0
        const currentAvg = stats.avg || latestTrade?.price || gateJeonse?.latestPrice || referenceAvg || 0
        const regretPct = mlScore == null ? null : Math.round(100 - (((mlScore + 1) / 2) * 85))
        const targetPrice = currentAvg > 0 && regretPct != null
          ? Math.round(currentAvg * (100 - Math.max(4, Math.min(18, Math.round(4 + regretPct * 0.12)))) / 100)
          : null

        // 전세가율 계산: (평당 전세가 × 평수) / 매매가 × 100
        const pyeong = areaM2 != null ? areaM2 / 3.3058 : null
        const jeonseTotal = (gateJeonse?.jeonseMedianPy != null && pyeong != null)
          ? gateJeonse.jeonseMedianPy * pyeong
          : null
        const jeonseRatio = (jeonseTotal && currentAvg > 0)
          ? Math.round((jeonseTotal / currentAvg) * 100)
          : null
        const capRatio = jeonseRatio != null ? 100 - jeonseRatio : null
        // 아파트 전용 최근 거래 (fallback 아파트 제외)
        const aptLatestTrade = recentTrades[0] ?? null
        const aptLatestTradeText = aptLatestTrade
          ? `${aptLatestTrade.dealDate} ${Math.round(aptLatestTrade.price / 1000)}억 (${aptLatestTrade.floor}층 ${aptLatestTrade.area}㎡)`
          : null

        // Gemini에게 넘기는 데이터: null 제거 + 한국어로 포맷팅
        const analysisData: Record<string, unknown> = {
          단지명: aptName || process.env.MY_APT_NAME || "분석 대상 아파트",
          지역: address?.split(" ").slice(0, 3).join(" ") || "분석 지역",
          단지거래건수_36개월: myTrades.length,
          공급동향: "수도권 신축 입주물량 감소 추세",
        }

        if (currentAvg > 0) {
          analysisData["법정동_평균거래가"] = `${Math.round(currentAvg / 10000)}억원`
        }
        if (aptLatestTradeText) {
          analysisData["단지_최근거래"] = aptLatestTradeText
        } else {
          analysisData["단지_최근거래"] = gateJeonse?.isPresale
            ? "분양예정 단지 — 확정 실거래 없음"
            : "36개월 내 단지 자체 거래 없음"
        }
        if (recentTrades.length > 0) {
          analysisData["최근거래목록"] = recentTrades.slice(0, 3).map(t =>
            `${t.dealDate} ${Math.round(t.price / 10000)}억 (${t.floor}층 ${t.area}㎡)`
          )
        }
        if (referenceTrades.trades.length > 0) {
          analysisData["지역_동일평형_참고기준"] = referenceTrades.note
          analysisData["지역_동일평형_참고거래"] = referenceTrades.trades.slice(0, 3).map(t =>
            `${t.dealDate} ${t.aptName} ${Math.round(t.price / 10000)}억 (${t.area}㎡)`
          )
        }
        if (mlScore != null) {
          analysisData["ML지역점수_12개월"] = mlScore.toFixed(2)
        }
        if (regretPct != null) {
          analysisData["후회확률"] = `${regretPct}%`
        }
        if (targetPrice != null && currentAvg > 0) {
          analysisData["AI권장매도가"] = `${Math.round(targetPrice / 10000)}억원`
        }
        if (jeonseRatio != null) {
          analysisData["전세가율"] = `${jeonseRatio}%`
        }
        if (capRatio != null) {
          analysisData["갭투자비율"] = `${capRatio}%`
        }
        if (gateJeonse?.jeonseRiskLevel) {
          analysisData["전세리스크"] = gateJeonse.jeonseRiskLevel
        }

        let analysis
        let error: string | undefined
        try {
            analysis = await analyzeWithClaude("market", analysisData, address, aptName)
            // Gemini가 영문 변수명을 그대로 출력한 항목 필터링 (ex: "miScore null", "latestTrade: ...")
            const BAD_PATTERN = /\b[a-z][a-zA-Z]+[\s:]*(null|undefined|\d)/
            analysis = {
              ...analysis,
              items: analysis.items.filter(item => !BAD_PATTERN.test(item.detail ?? "")),
            }
        } catch (err) {
          console.error("[market] Claude 분석 오류:", err)
          error = err instanceof Error ? err.message : "분석 중 오류 발생"
          analysis = { score: 50, trend: "neutral" as const, summary: "분석 오류", items: [] }
        }

        return {
          ...analysis,
          id: "market",
          updatedAt: new Date().toISOString(),
          rawData: {
            stats,
            tradeCount: myTrades.length,
            recentTrades,
            latestTrade,
            latestScope,
            mlScore,
            isPresale: gateJeonse?.isPresale ?? false,
            referenceTrades: referenceTrades.trades,
            referenceScope: referenceTrades.scope,
            referenceNote: referenceTrades.note,
          },
          error,
        } as CategoryResult & { rawData: unknown }
      }
    )

    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      cached,
      cachedAt,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" } as ApiResponse<never>,
      { status: 500 }
    )
  }
}
