import { generateJsonWithAI } from "@/lib/claude"
import { fmtManwon } from "./priceGuidance"
import type { estimateOfferRange } from "./floorParser"
import type { buildSchoolInsight, buildTransitInsight } from "./insights"
import type { NewsItem, TradeRecord } from "@/lib/types"
import {
  buildAlternativesSummary,
  buildExitStrategySummary,
  buildReferenceTradeSummary,
  type ReportAlternativeInput,
} from "./reportCommonData"
import { buildDecisionTables, type ReportDecisionTable } from "./decisionTables"
import type { ReportPersona } from "@/lib/reportProducts"
import { buildPersonaSheets, type PersonaSheet } from "@/lib/reportPersonaSheets"
import {
  buildReportInputModel,
  type ReportAssumptionRow,
  type ReportInputModel,
} from "./reportInputModel"

type OfferRange      = ReturnType<typeof estimateOfferRange>
type SchoolInsight   = ReturnType<typeof buildSchoolInsight> | null
type TransitInsight  = ReturnType<typeof buildTransitInsight> | null

interface TradeStats {
  avg: number; min: number; max: number; count: number; latest: number; latestDate: string
}

interface Horizon {
  horizon: number; regionScore: number | null; total: number; dirAcc: number
}

interface RiskAnalysisParams {
  aptName:          string
  lawdCd:           string
  buildYear?:       number | null
  safetyScore:      number
  regretPct:        number
  stats:            TradeStats | null
  trades:           { price: number; area: number; floor: string; dealDate: string }[]
  horizons:         Horizon[]
  regionName:       string
  schoolInsight:    SchoolInsight
  transitInsight:   TransitInsight
  lifeInfraSummary: string
}

interface ReportParams {
  aptName:          string
  regionName:       string
  buildYear?:       number | null
  households?:      number | null
  sigunguNm?:       string | null
  umdNm?:           string | null
  safetyScore:      number
  oreuljiScore?:    number
  regretPct:        number
  targetPrice:      number
  discountPct:      number
  offerRange:       OfferRange
  mlScore:          number | null
  stats:            TradeStats | null
  trades:           { price: number; area: number; floor: string; dealDate: string }[]
  horizons:         Horizon[]
  schoolInsight:    SchoolInsight
  transitInsight:   TransitInsight
  lifeInfraSummary: string
  regionNews?:      NewsItem[]
  categoryScores?: {
    transport?: { score: number; trend: string; summary: string } | null
    policy?:    { score: number; trend: string; summary: string } | null
    politics?:  { score: number; trend: string; summary: string } | null
    momcafe?:   { score: number; trend: string; summary: string } | null
  }
  referenceTrades?: TradeRecord[]
  referenceTradeScope?: "umd" | "lawd" | "none"
  referenceTradeNote?: string | null
  alternatives?: ReportAlternativeInput[] | null
  budget?: number | null
  purpose?: "실거주" | "투자" | ""
  reportPersona?: ReportPersona
  reportInput?: ReportInputModel
}

function makeBusLine(transitInsight: TransitInsight): string {
  const stops = transitInsight?.busStops ?? []
  if (stops.length === 0) return ""
  return " " + stops.map(s => {
    const routes = s.routes.length > 0 ? `(${s.routes.join("·")}번)` : ""
    return `${s.name}${routes} ${s.distance}m`
  }).join(", ") + " 버스정류장이 가깝습니다."
}

function makeTransitLine(transitInsight: TransitInsight): string {
  const busLine = makeBusLine(transitInsight)
  return transitInsight?.nearestStation
    ? `가장 가까운 대중교통은 ${transitInsight.nearestStation.name}로, ${transitInsight.nearestStation.distance}m(${transitInsight.nearestStation.walkMinutes}분) 거리입니다.${busLine}`
    : `지하철역은 현재 확인되지 않았습니다.${busLine}`
}

export async function generateRiskAnalysis(params: RiskAnalysisParams) {
  const { aptName, buildYear, safetyScore, regretPct, stats, trades, horizons, regionName, schoolInsight, transitInsight, lifeInfraSummary } = params

  const horizonSummary     = horizons.slice(0, 4).map(h => `${h.horizon}개월 ${(h.regionScore ?? h.total).toFixed(2)}점`).join(", ")
  const lowLiquidity        = (stats?.count ?? 0) < 4
  const weakMomentum        = horizons.some(h => (h.regionScore ?? h.total) < 0)
  const safetyPressure      = safetyScore < 50 || regretPct >= 58
  const recentTradePressure = !!stats?.latest && !!stats?.avg && stats.latest > stats.avg * 1.05
  const schoolCount         = schoolInsight?.schoolCount ?? 0
  const academyCount        = schoolInsight?.academyCount ?? 0
  const schoolDistance      = schoolInsight?.schoolDistance ?? null
  const hasChoopuma         = schoolInsight?.hasChoopuma ?? false
  const hasChoopumaViaGate  = schoolInsight?.hasChoopumaViaGate ?? false
  const choopumaLabel       = schoolInsight?.choopumaLabel ?? "초품아 여부 미확인"
  const academyDensity      = schoolInsight?.academyDensity ?? "낮음"
  const parentConvenience   = schoolInsight?.parentConvenience ?? "보수적으로 보는 편"
  const transitLine         = makeTransitLine(transitInsight)
  const buildYearText       = buildYear ? `${buildYear}년 준공` : "준공연도 미확인"

  return {
    risks: [
      {
        icon:  lowLiquidity ? "📊" : "📈",
        title: lowLiquidity ? "거래 얇음" : "거래 확인",
        level: lowLiquidity ? "MEDIUM" : "LOW",
        description: lowLiquidity
          ? `최근 24개월 거래가 ${stats?.count ?? 0}건이라 가격 판단이 거칠 수 있습니다.`
          : `최근 24개월 ${stats?.count ?? 0}건 거래로 흐름은 보이지만, 체결가 점검은 필요합니다.`,
      },
      {
        icon:  safetyPressure ? "⚠️" : "🛡️",
        title: safetyPressure ? "후회 부담" : "안전 구간",
        level: safetyPressure ? "HIGH" : "LOW",
        description: `안전 점수 ${safetyScore}점과 후회 확률 ${regretPct}%를 함께 보면 무리한 추격은 부담됩니다.`,
      },
      {
        icon:  weakMomentum ? "⬇️" : "➡️",
        title: weakMomentum ? "방향 둔화" : "방향 안정",
        level: weakMomentum ? "MEDIUM" : "LOW",
        description: horizonSummary
          ? `오를지 엔진 흐름은 ${horizonSummary}처럼 보이며, 일부 구간은 상승 탄력이 약합니다.`
          : "오를지 엔진 흐름 데이터가 충분하지 않아 방향성 해석은 보수적으로 보는 편이 낫습니다.",
      },
      {
        icon:  recentTradePressure ? "💸" : "🏷️",
        title: recentTradePressure ? "최근가 부담" : "가격 점검",
        level: recentTradePressure ? "MEDIUM" : "LOW",
        description: recentTradePressure
          ? `최근 거래 ${stats?.latestDate ?? "-"}가 평균가보다 높아 현재 호가가 더 중요합니다.`
          : `최근 거래 ${stats?.latestDate ?? "-"}는 평균가와 큰 차이가 없어 가격 점검이 핵심입니다.`,
      },
      {
        icon:  (hasChoopuma || hasChoopumaViaGate) ? "🏫" : "🧒",
        title: (hasChoopuma || hasChoopumaViaGate) ? "초품아" : "통학 동선 확인",
        level: (hasChoopuma || hasChoopumaViaGate) ? "LOW" : "MEDIUM",
        description: schoolInsight
          ? `주변 초등학교 ${schoolCount}곳, 학원 ${academyCount}곳. ${choopumaLabel}. 학원 밀도는 ${academyDensity}, 부모 체감 편의성은 ${parentConvenience}으로 읽힙니다.`
          : "학교·학원 정보가 없어 통학 동선과 생활 편의는 별도 확인이 필요합니다.",
      },
    ],
    summary: `${regionName || aptName}은 ${buildYearText} 기준으로도 점수만 보면 무난하지만, 거래와 호가를 같이 봐야 합니다.`,
    alternativeTip: lowLiquidity
      ? "거래가 더 많은 인근 단지와 함께 비교해보세요"
      : "실거래보다 무리한 호가가 붙는지 먼저 확인해보세요",
  }
}

export async function generateReport(params: ReportParams) {
  const {
    aptName, regionName, buildYear, households, sigunguNm, umdNm,
    safetyScore, oreuljiScore, regretPct, targetPrice, discountPct, offerRange,
    mlScore, stats, trades, horizons, schoolInsight, transitInsight, lifeInfraSummary,
    regionNews, categoryScores, referenceTrades = [], referenceTradeScope = "none", referenceTradeNote = null, alternatives,
    budget = null,
    purpose = "", reportPersona, reportInput,
  } = params

  const resolvedInput = reportInput ?? buildReportInputModel({
    targetPrice,
    buildYear,
    budget,
    purpose,
    reportPersona: reportPersona && reportPersona !== "general" ? reportPersona : undefined,
  })
  const resolvedPersona: ReportPersona = resolvedInput.reportPersona !== "general"
    ? resolvedInput.reportPersona
    : resolvedInput.purpose === "투자"
    ? "investor"
    : "first-home"
  const reportTitle = `${aptName} · 관점별 판단 리포트`
  const currentYear    = new Date().getFullYear()
  const ageYears       = buildYear ? currentYear - buildYear : null
  const buildYearLabel = buildYear ? `${buildYear}년 준공` : "준공연도 미확인"
  const ageLabel       = ageYears !== null ? `${ageYears}년 경과` : "노후도 미확인"
  const householdsLabel = households ? `${households}세대` : "세대수 미확인"

  const conditionNote = ageYears === null ? "노후도 데이터 없음" :
    ageYears >= 30 ? `준공 ${ageYears}년으로 리모델링 또는 재건축 검토 연한에 접어든 단지입니다.` :
    ageYears >= 20 ? `준공 ${ageYears}년으로 배관·외벽 등 부분 수선 수요가 발생하는 시기입니다.` :
    `준공 ${ageYears}년으로 아직 대규모 수선 필요성은 낮은 편입니다.`

  const horizonText = horizons.length > 0
    ? horizons.map(h => `${h.horizon}개월 ${(h.regionScore ?? h.total).toFixed(2)}점`).join(", ")
    : "오를지 엔진 연결 필요"

  const mlNegativeContext = (() => {
    const h12 = horizons.find(h => h.horizon === 12)
    if (!h12) return ""
    const score = h12.regionScore ?? h12.total
    if (score < -0.5) return "이 점수는 주변 신축 공급 증가, 지역 매매거래량 위축, 가격 탄력 둔화가 복합적으로 반영된 결과입니다."
    if (score < -0.2) return "이 점수는 지역 매매 흐름이 다소 둔화되고 있음을 반영합니다."
    return ""
  })()

  const regionalContextNote = (() => {
    const news = regionNews ?? []
    if (news.length === 0) return `이 지역의 개발 호재와 신축 공급 동향은 별도 확인이 필요합니다.`
    // 재건축·재개발 뉴스 우선 표시
    const redev = news.filter(n => n.title.includes("재건축") || n.title.includes("재개발") || n.title.includes("정비사업"))
    const hoae  = news.filter(n => !redev.includes(n))
    const clean = (t: string) => t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '')
    const headlines: string[] = [
      ...redev.slice(0, 2).map(n => `• ${clean(n.title)}`),
      ...hoae.slice(0, 2).map(n => `• ${clean(n.title)}`),
    ]
    return headlines.length > 0
      ? `최근 관련 뉴스: ${headlines.join(" / ")}`
      : `이 지역의 개발 호재와 신축 공급 동향은 별도 확인이 필요합니다.`
  })()

  const purposeNote = (() => {
    if (safetyScore >= 60) return `실거주 목적이라면 생활권과 가격이 맞는 경우 진입 가능성이 있습니다. 투자 목적이라면 오를지 엔진 흐름과 후회 확률을 더 무게 있게 봐야 합니다.`
    if (safetyScore >= 40) return `실거주 목적으로는 가격 조건이 맞을 때 검토할 수 있지만, 순수 투자 목적으로는 지금 오를지 엔진 흐름이 우호적이지 않습니다. 보유 기간과 출구 전략을 먼저 정하는 편이 맞습니다.`
    return `실거주라면 조건(가격·층·향)을 꼼꼼히 따지고, 투자라면 현 시점은 관망이 더 자연스럽습니다. 후회 확률 ${regretPct}%는 빠른 시세 차익을 기대하기 어렵다는 신호입니다.`
  })()

  // ─── 실거주 위험도 계산 ───────────────────────────────────────
  const residenceRiskScore = (() => {
    let score = 40
    // 노후도
    if (ageYears !== null) {
      if (ageYears >= 30) score += 20
      else if (ageYears >= 20) score += 10
    }
    // 교통 (지하철 거리)
    const stationDist = transitInsight?.nearestStation?.distance ?? 9999
    if (stationDist > 1500) score += 15
    else if (stationDist > 800) score += 7
    // 초등학교 접근성
    if (schoolInsight?.hasChoopuma) score -= 10
    else if ((schoolInsight?.schoolDistance ?? 9999) > 800) score += 5
    // 생활 인프라 (lifeInfraSummary에서 병원/약국 언급 여부로 간접 판단)
    if (lifeInfraSummary && lifeInfraSummary.includes("병원")) score -= 5
    return Math.max(10, Math.min(90, score))
  })()

  const residenceRiskLevel =
    residenceRiskScore < 40 ? "낮음" :
    residenceRiskScore < 65 ? "보통" : "높음"

  const residenceRiskBullets = [
    ageYears !== null
      ? (ageYears >= 30
          ? `준공 ${ageYears}년으로 재건축 검토 연한 — 관리비·수선충당금 급증 가능성 있음`
          : ageYears >= 20
            ? `준공 ${ageYears}년 — 배관·외벽 등 부분 수선 비용 발생 시기`
            : `준공 ${ageYears}년 — 당분간 대규모 수선 필요성 낮음`)
      : "노후도 미확인",
    transitInsight?.nearestStation
      ? (transitInsight.nearestStation.distance > 1500
          ? `지하철 ${transitInsight.nearestStation.distance}m — 도보 ${transitInsight.nearestStation.walkMinutes}분, 대중교통 의존도 낮은 편`
          : `지하철 ${transitInsight.nearestStation.distance}m — 일상 통근 동선 무난`)
      : "지하철 접근성 미확인",
    schoolInsight
      ? (schoolInsight.hasChoopuma
          ? `초품아 확인 — 초등학교 ${schoolInsight.schoolDistance}m, 실거주 선호 수요 강함`
          : `초등학교 ${schoolInsight.schoolDistance ?? "-"}m — 초품아 기준(350m) 미달`)
      : "학교 접근성 미확인",
    `중학교 ${schoolInsight?.middleSchoolCount ?? 0}곳 · 고등학교 ${schoolInsight?.highSchoolCount ?? 0}곳 (도보권)`,
    lifeInfraSummary ? lifeInfraSummary : "생활 인프라 미확인",
  ]

  // ─── 투자 위험도 계산 ───────────────────────────────────────
  const investmentRiskScore = (() => {
    let score = 100 - safetyScore  // 안전 점수 반전이 기본
    const allNegative = horizons.length > 0 && horizons.every(h => (h.regionScore ?? h.total) < 0)
    if (allNegative) score += 10
    const liquidityLow = (stats?.count ?? 0) < 4
    if (liquidityLow) score += 10
    if (regretPct >= 65) score += 10
    else if (regretPct < 45) score -= 10
    // 최신 거래가 평균보다 높으면 고점 매수 리스크
    if (stats?.latest && stats?.avg && stats.latest > stats.avg * 1.08) score += 8
    return Math.max(10, Math.min(90, score))
  })()

  const investmentRiskLevel =
    investmentRiskScore < 35 ? "낮음" :
    investmentRiskScore < 60 ? "보통" : "높음"

  const mlTrend = (() => {
    const scores = horizons.map(h => h.regionScore ?? h.total)
    if (scores.length < 2) return "데이터 부족"
    const allNeg = scores.every(s => s < 0)
    const worsening = scores[scores.length - 1] < scores[0]
    if (allNeg && worsening) return "전 구간 하락, 장기로 갈수록 심화"
    if (allNeg) return "전 구간 마이너스, 상승 탄력 약함"
    return "혼조세, 구간별 확인 필요"
  })()

  const investmentRiskBullets = [
    `오를지 엔진 시장 흐름: ${horizonText} (${mlTrend})`,
    `후회 확률 ${regretPct}% — ${regretPct >= 60 ? "2년 내 후회 가능성 높음" : regretPct >= 45 ? "보통 수준" : "비교적 낮은 편"}`,
    `유동성: 최근 24개월 거래 ${stats?.count ?? 0}건 — ${(stats?.count ?? 0) < 4 ? "거래 얇아 출구 전략 세우기 어려움" : "일정 수준의 거래량 확인"}`,
    (stats?.latest && stats?.avg && stats.latest > stats.avg * 1.05)
      ? `최근 거래가 평균 대비 높음 — 고점 진입 리스크 존재`
      : `최근 거래가 평균 대비 큰 차이 없음`,
    (regionNews && regionNews.length > 0)
      ? `최근 뉴스: ${regionNews[0].title.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#\d+;/g,'')}`
      : "인근 신축 공급 동향 별도 확인 필요",
  ]

  const latestTradeText = trades[0]
    ? `${trades[0].dealDate} ${fmtManwon(trades[0].price)} (${Math.round(trades[0].area / 3.3058)}평 ${trades[0].floor}층)`
    : "데이터 없음"

  const schoolLine = schoolInsight
    ? `초등학교 ${schoolInsight.schoolCount}곳(${schoolInsight.schoolList}), 중학교 ${schoolInsight.middleSchoolCount}곳(${schoolInsight.middleSchoolList}), 고등학교 ${schoolInsight.highSchoolCount}곳(${schoolInsight.highSchoolList})이 확인되고, 가장 가까운 초등학교는 ${schoolInsight.schoolDistance ?? "-"}m(${schoolInsight.schoolWalkMin ?? "-"}분)입니다.`
    : "주변 초등학교와 학원 수는 별도 확인이 필요합니다."

  const schoolConvenienceLine = schoolInsight
    ? `${schoolInsight.choopumaLabel} 학원 ${schoolInsight.academyCount}곳(${schoolInsight.academyList})이 확인됩니다. 학원 밀도는 ${schoolInsight.academyDensity}이고, 부모 체감 편의성은 ${schoolInsight.parentConvenience}으로 보는 편이 맞습니다.`
    : "초품아 여부와 학원 밀도는 별도 확인이 필요합니다."

  const transitLine = makeTransitLine(transitInsight)

  const offerRangeText = offerRange.marketOfferMidLowPct > 0
    ? `중층 +${offerRange.marketOfferMidLowPct.toFixed(1)}~+${offerRange.marketOfferMidHighPct.toFixed(1)}% / 저층 +${offerRange.lowFloorOfferLowPct.toFixed(1)}~+${offerRange.lowFloorOfferHighPct.toFixed(1)}% / 꼭대기층 +${offerRange.topFloorOfferLowPct.toFixed(1)}~+${offerRange.topFloorOfferHighPct.toFixed(1)}%`
    : "호가 차이 추정 불가"
  const referenceTradeSummary = buildReferenceTradeSummary(referenceTrades, referenceTradeScope, referenceTradeNote)
  const alternativesSummary = buildAlternativesSummary(alternatives)
  const exitStrategySummary = buildExitStrategySummary({ stats, regretPct, horizons })
  const decisionTables = buildDecisionTables({
    stats,
    targetPrice,
    discountPct,
    offerRange,
    referenceTrades,
    referenceTradeNote,
    alternatives,
    horizons,
    reportInput: resolvedInput,
  })
  const personaSheets = buildPersonaSheets({
    buildYear,
    targetPrice,
    stats,
    horizons,
    alternatives,
    reportInput: resolvedInput,
  })
  const assumptionRows: ReportAssumptionRow[] = resolvedInput.assumptions

  const gradeLabel =
    safetyScore >= 70 ? "안전" :
    safetyScore >= 50 ? "주의" :
    safetyScore >= 35 ? "위험" : "고위험"
  const personaFocusSection = (() => {
    if (resolvedPersona === "agent") {
      return {
        id: "persona_focus",
        heading: "상담용 한 줄 정리",
        body: [
          "이 리포트는 고객 설득보다 고객 이탈을 줄이는 용도로 써야 합니다.",
          alternativesSummary
            ? alternativesSummary.body
            : "첫 설명은 장점 나열보다 가격 설명과 비교 기준을 먼저 맞추는 편이 좋습니다.",
          budgetFitLine(targetPrice, discountPct, regretPct),
        ].join(" "),
      }
    }
    if (resolvedPersona === "investor") {
      return {
        id: "persona_focus",
        heading: "투자 판단 체크",
        body: [
          exitStrategySummary.body,
          alternativesSummary
            ? alternativesSummary.body
            : "같은 예산 대안 단지와 비교해도 이 단지가 더 낫다는 근거가 있어야 투자 판단이 섭니다.",
          "투자는 좋아 보이는 단지보다 지금 들어가도 나올 수 있는 단지를 고르는 과정에 가깝습니다.",
        ].join(" "),
      }
    }
    return {
      id: "persona_focus",
      heading: "신혼부부 실거주 체크",
      body: [
        `첫 매수라면 ${buildYearLabel} 여부보다도 실제 생활비와 대출 부담을 견딜 수 있는 가격인지가 더 중요합니다.`,
        schoolConvenienceLine,
        transitLine,
        alternativesSummary
          ? `또한 ${alternativesSummary.body}`
          : "비슷한 예산의 대안 단지도 같이 봐야 계약 후 후회 가능성을 낮출 수 있습니다.",
      ].join(" "),
    }
  })()
  const finalConclusion = resolvedPersona === "agent"
    ? `${aptName}은 상담에서 밀어붙일 단지라기보다, 가격 설명이 되면 추천하고 아니면 대안을 같이 제시해야 하는 단지입니다. 고객에게는 점수보다 왜 지금 검토해도 되는지, 혹은 왜 비교가 더 필요한지를 한 문장으로 전달하는 편이 좋습니다.`
    : resolvedPersona === "investor"
    ? `${aptName}은 좋은 집일 수 있어도 투자에서는 출구 전략이 먼저 서야 하는 단지입니다. 거래량, 후회 확률, 대안 기회비용을 같이 놓고 봤을 때 지금은 수익 기대보다 환금성 확인이 더 중요한 구간입니다.`
    : `${aptName}은 첫 집으로 볼 때 장점은 분명하지만, 가격을 비싸게 잡으면 생활 부담이 오래 남을 수 있는 단지입니다. 한 줄로 정리하면, 살 만한 이유가 있어도 예산과 생활권 설명이 먼저 되는 집인지 확인하고 들어가야 합니다.`
  const oneLiner = "공통 지표 위에 신혼부부·중개사·투자자 관점을 따로 펼쳐 보는 판단 리포트입니다."

  const buildDeterministicReport = () => {
    const offerRangeTextLocal = offerRange.marketOfferMidLowPct > 0
      ? `중층 +${offerRange.marketOfferMidLowPct.toFixed(1)}~+${offerRange.marketOfferMidHighPct.toFixed(1)}%, 저층 +${offerRange.lowFloorOfferLowPct.toFixed(1)}~+${offerRange.lowFloorOfferHighPct.toFixed(1)}%, 꼭대기층 +${offerRange.topFloorOfferLowPct.toFixed(1)}~+${offerRange.topFloorOfferHighPct.toFixed(1)}%`
      : "호가 차이 추정 불가"
    const regionLabel    = regionName || "이 지역"
    const latestTradeLine = latestTradeText !== "데이터 없음"
      ? `최근 실거래는 ${latestTradeText}입니다.`
      : "최근 실거래 데이터가 충분하지 않습니다."
    const marketTone = stats && stats.count >= 4
      ? `최근 24개월 거래 ${stats.count}건이 확인되어, 흐름 자체는 읽히는 편입니다.`
      : `최근 24개월 거래가 많지 않아, 숫자 하나로 단정을 내리기보다 보수적으로 봐야 합니다.`
    const offerTone = offerRange.marketOfferMidLowPct > 0
      ? `호가는 금액보다 %로 봐야 하고, 중층 기준 ${offerRange.marketOfferMidLowPct.toFixed(1)}~${offerRange.marketOfferMidHighPct.toFixed(1)}% 정도의 차이를 기본으로 읽는 편이 맞습니다. 저층과 꼭대기층은 그보다 조금 다르게 봐야 합니다.`
      : `호가 차이는 단지별 편차가 커서, 이번 데이터만으로는 % 범위를 단정하기 어렵습니다.`

    const forcedSections = [
      {
        id: "overview", heading: "지역 요약",
        body: `${aptName}은 ${regionLabel} 안에서도 무난한 생활권에 놓인 단지지만, 지금 중요한 건 "좋은 지역이냐"보다 "지금 가격이 얼마나 버티느냐"입니다. 안전 점수 ${safetyScore}점, 후회 확률 ${regretPct}%를 같이 보면 무작정 공격적으로 보기보다는 조건을 따져가며 들어가야 하는 구간에 더 가깝습니다. 강하게 치고 올라가는 장세라기보다는, 체력과 가격이 맞아야 비로소 선택할 수 있는 성격입니다.`,
      },
      {
        id: "safety_score", heading: "단지 요약",
        body: `${aptName}은 ${buildYearLabel}(${ageLabel}) ${householdsLabel} 단지입니다. ${conditionNote} 안전 점수 ${safetyScore}점은 "나쁘다"기보다 "조심해서 봐야 한다"에 가깝고, 후회 확률 ${regretPct}%는 성급한 추격이 얼마나 불리한지를 보여줍니다. ${latestTradeLine} 단지의 질감보다 진입 가격 관리가 더 중요한 타입입니다.`,
      },
      {
        id: "transit", heading: "교통 해석",
        body: `${regionLabel}의 교통은 ${transitLine} 지하철·버스 접근성은 현재 확인된 생활 동선의 핵심이고, 추가 예정 교통은 아직 자료상 보이지 않습니다. 그래서 이 단지는 교통 호재를 기다리는 곳이라기보다, 현재 교통 편의가 어느 정도 받쳐주는지 보는 쪽이 맞습니다.`,
      },
      {
        id: "school_lifestyle", heading: "학군 해석",
        body: `교육부터 보면, 이 단지는 기본 생활권은 갖춘 편이지만 숫자만 보고 단정하면 안 됩니다. 주변 초등학교는 ${schoolInsight ? schoolInsight.schoolList : "별도 확인"}이고, 학원은 ${schoolInsight ? schoolInsight.academyList : "별도 확인"}입니다. ${schoolLine} ${schoolConvenienceLine} 학군은 점수의 일부일 뿐이고, 실거주 수요가 얼마나 오래 붙느냐가 더 큰 변수입니다.`,
      },
      {
        id: "life_infra", heading: "생활 인프라",
        body: lifeInfraSummary,
      },
      {
        id: "regional_context", heading: "지역 호재 비교",
        body: `${regionalContextNote} 구축 단지가 인근 신축 호재의 수혜를 받으려면 도보 접근성, 학군 연동, 브랜드 인지도 중 최소 하나 이상이 맞아야 합니다. 이 단지가 그 조건을 얼마나 충족하는지 따로 확인하는 것이 진입 판단의 핵심입니다.`,
      },
      {
        id: "market", heading: "시장 해석",
        body: `${marketTone} 현재 평균가는 ${fmtManwon(stats?.avg ?? 0)}이고, 최근 거래는 ${fmtManwon(stats?.latest ?? 0)}(${stats?.latestDate ?? "-"}) 수준입니다. ${offerTone} 최근 거래만 보면 가격이 괜찮아 보여도, 실제 매수에서 더 중요한 건 호가가 실거래보다 얼마나 위에 붙어 있느냐입니다.`,
      },
      {
        id: "trade_offer", heading: "실거래와 호가",
        body: `가장 중요한 건 "최근 얼마에 거래됐는가"보다 "지금 내가 살 수 있는 가격이 얼마인가"입니다. 최근 거래 ${latestTradeText}를 기준으로 보면, 체결가와 호가 사이 간격을 반드시 %로 비교해야 하고, 저층·중층·꼭대기층은 같은 가격표로 보면 안 됩니다. 특히 꼭대기층이라고 해도 단순 최상층인지, 펜트하우스인지에 따라 판단이 달라지니 그 부분까지 따로 확인해야 합니다.`,
      },
      ...(referenceTradeSummary ? [{
        id: "reference_market",
        heading: referenceTradeSummary.heading,
        body: referenceTradeSummary.body,
      }] : []),
      {
        id: "entry_price", heading: "24개월 후회확률 관점",
        body: `${horizonText !== "오를지 엔진 연결 필요" ? "오를지 엔진 흐름은 " + horizonText + "처럼 보입니다." : "오를지 엔진 흐름은 현재 데이터가 부족해 보수적으로 봐야 합니다."} ${mlNegativeContext} 지금 이 단지를 사는 리스크는 더 오를까보다, 2년 뒤에 왜 이 가격을 샀는지 스스로 설명하기 어려워지는 데 있습니다. 후회 확률 ${regretPct}%라는 숫자는 바로 그 불편함이 얼마나 빨리 올 수 있는지를 보여줍니다.`,
      },
      {
        id: "purpose", heading: "실거주 vs 투자",
        body: `${purposeNote} 실거주라면 관리비·주차·층향 같은 생활 조건을 먼저 따지고, 투자라면 보유 기간·출구 전략·주변 신축 경쟁력을 먼저 계산해야 합니다. 두 목적이 섞이면 판단이 흐려지니, 이 집을 왜 사는지 한 줄로 정리하는 것부터 시작하세요.`,
      },
      personaFocusSection,
      {
        id: "residence_risk",
        heading: `실거주 위험도 — ${residenceRiskLevel} (${residenceRiskScore}점)`,
        body: [
          `실거주 관점에서 이 단지의 위험도는 ${residenceRiskLevel} 수준(${residenceRiskScore}점/100)으로 판단됩니다.`,
          ...residenceRiskBullets.map(b => `• ${b}`),
          residenceRiskLevel === "낮음"
            ? "전반적으로 생활 인프라와 통학 동선이 갖춰진 편이라, 실거주 조건 자체는 무난합니다."
            : residenceRiskLevel === "보통"
              ? "생활 편의는 기본적으로 갖췄지만, 노후도나 교통 동선 중 한두 가지는 직접 확인이 필요한 단지입니다."
              : "노후도·교통·학군 중 실거주에 영향을 주는 요소가 복수 확인됩니다. 진입 전 반드시 현장 확인이 필요합니다.",
        ].join("\n"),
      },
      {
        id: "investment_risk",
        heading: `투자 위험도 — ${investmentRiskLevel} (${investmentRiskScore}점)`,
        body: [
          `투자 관점에서 이 단지의 위험도는 ${investmentRiskLevel} 수준(${investmentRiskScore}점/100)으로 판단됩니다.`,
          ...investmentRiskBullets.map(b => `• ${b}`),
          investmentRiskLevel === "낮음"
            ? "지역 흐름과 거래 유동성이 비교적 우호적입니다. 단, 단지 개별 조건(층·향·관리 상태)은 별도 검토가 필요합니다."
            : investmentRiskLevel === "보통"
              ? "일부 지표는 긍정적이지만, 오를지 엔진 흐름과 유동성에서 보수적으로 접근해야 할 요소가 있습니다. 단기 시세 차익보다 실거주 안정성 중심으로 판단하세요."
              : "오를지 엔진 흐름, 후회 확률, 유동성 세 지표가 모두 투자에 불리한 방향을 가리킵니다. 순수 투자 목적이라면 현 시점보다 시장 흐름이 전환되는 시점을 기다리는 편이 낫습니다.",
        ].join("\n"),
      },
      {
        id: "exit_strategy",
        heading: exitStrategySummary.heading,
        body: exitStrategySummary.body,
      },
      ...(alternativesSummary ? [{
        id: "same_budget_alternatives",
        heading: alternativesSummary.heading,
        body: alternativesSummary.body,
      }] : []),
      {
        id: "category_scores",
        heading: oreuljiScore != null ? `오를지 종합점수 ${oreuljiScore}점` : "AI 카테고리 분석",
        body: (() => {
          const cs = categoryScores
          if (!cs) return "카테고리 분석 데이터 없음"
          const trendIcon = (t?: string) => t === "up" ? "↑" : t === "down" ? "↓" : "→"
          const scoreBar  = (s?: number | null) => s == null ? "미분석" : `${s}점`
          const lines = [
            oreuljiScore != null ? `📊 오를지 종합점수: ${oreuljiScore}점 (오를지 엔진·AI 분석 통합)` : null,
            cs.transport ? `🚆 교통 호재 ${scoreBar(cs.transport.score)} ${trendIcon(cs.transport.trend)} — ${cs.transport.summary}` : null,
            cs.policy    ? `📋 부동산 정책 ${scoreBar(cs.policy.score)} ${trendIcon(cs.policy.trend)} — ${cs.policy.summary}` : null,
            cs.politics  ? `🗳️ 지역 공약 ${scoreBar(cs.politics.score)} ${trendIcon(cs.politics.trend)} — ${cs.politics.summary}` : null,
            cs.momcafe   ? `🏫 실거주 수요 ${scoreBar(cs.momcafe.score)} ${trendIcon(cs.momcafe.trend)} — ${cs.momcafe.summary}` : null,
          ].filter(Boolean)
          return lines.length > 0 ? lines.join("\n") : "카테고리 분석 데이터 없음"
        })(),
      },
      {
        id: "conclusion", heading: "최종 판단",
        body: finalConclusion,
      },
    ]

    return {
      title:      reportTitle,
      grade:      gradeLabel,
      oneLiner,
      sections:   forcedSections,
      assumptions: assumptionRows,
      decisionTables,
      personaSheets,
      disclaimer: "본 리포트는 실거래와 오를지 엔진 점수를 바탕으로 자동 생성된 참고 자료입니다. 최종 투자 판단의 책임은 이용자에게 있으며, 반드시 전문가 상담을 병행하시기 바랍니다.",
      facts: {
        latestTrade:         latestTradeText,
        mlScore:             mlScore?.toFixed(2) ?? "데이터 없음",
        jeonseRatio:         "데이터 없음",
        regretPct:           `${regretPct}%`,
        currentAvg:          fmtManwon(stats?.avg ?? 0),
        buildYear:           buildYearLabel,
        marketOffer:         offerRangeText,
        targetPrice:         `${discountPct}% 할인 기준`,
        discountPct:         `${discountPct}%`,
        schoolCount:         schoolInsight ? `${schoolInsight.schoolCount}곳` : "데이터 없음",
        middleSchoolCount:   schoolInsight ? `${schoolInsight.middleSchoolCount}곳` : "데이터 없음",
        highSchoolCount:     schoolInsight ? `${schoolInsight.highSchoolCount}곳` : "데이터 없음",
        academyCount:        schoolInsight ? `${schoolInsight.academyCount}곳` : "데이터 없음",
        closestSchool:       schoolInsight?.closestSchool ? `${schoolInsight.closestSchool.name} / ${schoolInsight.schoolDistance ?? "-"}m` : "데이터 없음",
        closestMiddleSchool: schoolInsight?.closestMiddleSchool ? `${schoolInsight.closestMiddleSchool.name} / ${schoolInsight.middleSchoolDistance ?? "-"}m` : "데이터 없음",
        closestHighSchool:   schoolInsight?.closestHighSchool ? `${schoolInsight.closestHighSchool.name} / ${schoolInsight.highSchoolDistance ?? "-"}m` : "데이터 없음",
        choopuma:            schoolInsight ? schoolInsight.choopumaLabel : "데이터 없음",
        residenceRiskLevel,
        residenceRiskScore:  `${residenceRiskScore}점`,
        investmentRiskLevel,
        investmentRiskScore: `${investmentRiskScore}점`,
        referenceTradeWindow: referenceTradeNote ?? "데이터 없음",
        alternativeComparison: alternativesSummary?.body ?? "데이터 없음",
        exitStrategy: exitStrategySummary.body,
      },
      article: forcedSections.map(s => `${s.heading}\n${s.body}`).join("\n\n"),
    }
  }

  const aiPrompt = `
아래 JSON 초안을 자연스럽고 사람 같은 한국어 리포트로 다듬어 주세요.
반드시 JSON만 반환하고, 코드블록이나 설명을 넣지 마세요.
숫자, 사실, 순서는 그대로 유지하고 문장만 매끄럽게 바꾸세요.
섹션 제목은 유지하고, 본문은 스크린샷처럼 문단형 한국어 리포트로 써 주세요.
학군 섹션은 "교육부터 보면"으로 시작하는 자연스러운 문단형 톤을 우선하세요.
학군 섹션에는 학교 수, 학원 수, 가장 가까운 초등학교 거리, 초품아 여부, 통학동선, 학원 밀도, 부모 체감 편의성을 반드시 자연스럽게 포함하세요.
호가 차이와 진입 기준은 반드시 %로만 설명하고, 절대 가격 추정이나 임의의 예시는 넣지 마세요.
실거주 위험도와 투자 위험도 섹션은 bullet(•) 형식을 유지하고, 등급(낮음/보통/높음)과 점수는 반드시 유지하세요.
과장하거나 어색한 표현은 피하고, 메타 설명이나 "챗GPT/다음 버전" 같은 문구는 넣지 마세요.
각 섹션은 2~4문장 정도로 읽히게 하고, 전체 톤은 차분하고 단정하게 유지해 주세요.

초안 JSON:
${JSON.stringify(buildDeterministicReport(), null, 2)}
`

  try {
    const raw     = await generateJsonWithAI(aiPrompt)
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed  = JSON.parse(cleaned) as ReturnType<typeof buildDeterministicReport>
    const base    = buildDeterministicReport()
    const sectionsById = new Map(
      (Array.isArray(parsed?.sections) ? parsed.sections : []).map(
        (s: { id?: string; heading?: string; body?: string }) => [s.id, s]
      )
    )

    return {
      ...base,
      grade:      parsed?.grade      || base.grade,
      oneLiner:   parsed?.oneLiner   || base.oneLiner,
      disclaimer: parsed?.disclaimer || base.disclaimer,
      sections: base.sections.map(section => ({
        ...section,
        ...(sectionsById.get(section.id) ?? {}),
      })),
      assumptions: base.assumptions,
      decisionTables: base.decisionTables,
      personaSheets: base.personaSheets,
      article: base.sections.map(section => {
        const aiSection = sectionsById.get(section.id)
        const body = aiSection?.body || section.body
        return `${aiSection?.heading || section.heading}\n${body}`
      }).join("\n\n"),
    }
  } catch {
    return buildDeterministicReport()
  }
}

function budgetFitLine(targetPrice: number, discountPct: number, regretPct: number) {
  return `목표 진입가는 최근 기준가보다 약 ${discountPct}% 낮춘 ${fmtManwon(targetPrice)} 수준을 먼저 염두에 두는 편이 맞고, 후회 확률 ${regretPct}%는 성급한 추격 매수를 피하라는 신호에 가깝습니다.`
}
