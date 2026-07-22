import { fmtManwon } from "./priceGuidance"
import type { TradeRecord } from "@/lib/types"
import type { ReportAlternativeInput } from "./reportCommonData"
import { estimateMonthlyPayment, type ReportInputModel } from "./reportInputModel"
import { buildInvestorScenario } from "./investorAfterTaxSheet"

interface TradeStats {
  avg: number
  latest: number
  count: number
  latestDate: string
}

interface Horizon {
  horizon: number
  regionScore: number | null
  total: number
}

export interface DecisionTableRow {
  label: string
  value: string
  note?: string
}

export interface DecisionTableCard {
  title: string
  subtitle?: string
  metrics: DecisionTableRow[]
  note?: string
}

export interface ReportDecisionTable {
  id: string
  title: string
  description?: string
  rows?: DecisionTableRow[]
  cards?: DecisionTableCard[]
  footnote?: string
}

interface BuildDecisionTablesInput {
  stats: TradeStats | null
  targetPrice: number
  discountPct: number
  offerRange: {
    marketOfferMidLowPct: number
    marketOfferMidHighPct: number
  }
  referenceTrades: TradeRecord[]
  referenceTradeNote?: string | null
  alternatives?: ReportAlternativeInput[] | null
  horizons: Horizon[]
  reportInput: ReportInputModel
}

function averagePrice(trades: TradeRecord[]) {
  if (!trades.length) return 0
  return Math.round(trades.reduce((sum, trade) => sum + trade.price, 0) / trades.length)
}

export function flowLabel(score: number | null) {
  if (score == null) return "데이터 부족"
  if (score >= 0.3) return "상대 강세"
  if (score >= 0.1) return "완만한 강세"
  if (score <= -0.3) return "상대 약세"
  if (score <= -0.1) return "완만한 약세"
  return "중립"
}

function budgetFitLabel(budget: number, targetPrice: number) {
  if (budget <= 0 || targetPrice <= 0) return null
  if (targetPrice <= budget) return "예산 안"
  if (targetPrice <= Math.round(budget * 1.05)) return "살짝 초과"
  return "초과"
}

export function buildDecisionTables(input: BuildDecisionTablesInput): ReportDecisionTable[] {
  const {
    stats,
    targetPrice,
    discountPct,
    offerRange,
    referenceTrades,
    referenceTradeNote,
    alternatives,
    horizons,
    reportInput,
  } = input

  const directLatest = stats?.latest ?? 0
  const directAvg = stats?.avg ?? 0
  const referenceAvg = averagePrice(referenceTrades)
  const loanPrincipal = reportInput.effectiveLoanAmount
  const neededCash = reportInput.effectiveCashNeeded
  const monthlyPayment = estimateMonthlyPayment(loanPrincipal, reportInput.interestRate, reportInput.loanYears)
  const h24 = horizons.find((h) => h.horizon === 24)
  const h48 = horizons.find((h) => h.horizon === 48)
  const budgetFit = budgetFitLabel(reportInput.budget ?? 0, targetPrice)

  const tables: ReportDecisionTable[] = [
    {
      id: "entry-price",
      title: "진입 가격 판단표",
      description: "직접 실거래와 참고 거래를 나눠서 보고, 권장 진입가를 현재 체결 흐름과 비교합니다.",
      rows: [
        { label: "최근 평균 실거래", value: fmtManwon(directAvg), note: stats?.count ? `24개월 ${stats.count}건 기준` : "직접 실거래 부족" },
        { label: "최신 실거래", value: fmtManwon(directLatest), note: stats?.latestDate || "데이터 없음" },
        { label: "주변 동일평형 평균", value: fmtManwon(referenceAvg), note: referenceTradeNote ?? "참고 거래 없음" },
        {
          label: "권장 진입가",
          value: fmtManwon(targetPrice),
          note: `${discountPct}% 할인 기준${offerRange.marketOfferMidLowPct > 0 ? ` · 중층 호가 +${offerRange.marketOfferMidLowPct.toFixed(1)}~+${offerRange.marketOfferMidHighPct.toFixed(1)}%` : ""}`,
        },
      ],
      footnote: "권장 진입가는 절대 정답이 아니라, 최근 체결가·호가 간격·리스크를 같이 본 보수적 출발점입니다.",
    },
    {
      id: "funding-plan",
      title: "자금 부담 가정표",
      description: `대출 ${reportInput.ltvPct}%, 금리 ${reportInput.interestRate.toFixed(1)}%, ${reportInput.loanYears}년 상환 가정 기준 빠른 판단표입니다.`,
      rows: [
        { label: "매수 가정가", value: fmtManwon(targetPrice), note: "권장 진입가 기준" },
        { label: "대출 가정액", value: fmtManwon(loanPrincipal), note: reportInput.loanAmount != null ? "입력한 대출예정액 기준" : `LTV ${reportInput.ltvPct}% 가정` },
        { label: "필요 자기자금", value: fmtManwon(neededCash), note: "세금·인테리어 제외" },
        { label: "예상 월상환", value: fmtManwon(monthlyPayment), note: `${reportInput.interestRate.toFixed(1)}% · ${reportInput.loanYears}년 가정` },
      ],
      footnote: "실제 대출 가능액, 금리, 취득세, 인테리어는 개인 조건에 따라 달라지므로 사전 점검이 필요합니다.",
    },
    {
      id: "total-housing-cost",
      title: "총주거비 가정표",
      description: "계약 직후 빠져나가는 초기비용과 계약 후 월 부담을 같이 보는 표입니다.",
      rows: [
        { label: "취득세 가정", value: fmtManwon(reportInput.acquisitionTax), note: `${reportInput.acquisitionTaxRate.toFixed(1)}% 가정` },
        { label: "중개보수 가정", value: fmtManwon(reportInput.brokerFee), note: `${reportInput.brokerFeeRate.toFixed(1)}% 가정` },
        { label: "이사·인테리어", value: fmtManwon(reportInput.moveCost + reportInput.interiorCost), note: `이사 ${fmtManwon(reportInput.moveCost)} + 인테리어 ${fmtManwon(reportInput.interiorCost)}` },
        { label: "총초기투입금", value: fmtManwon(reportInput.totalUpfrontCost), note: "자기자금 포함 총합" },
        { label: "월 총주거비", value: fmtManwon(reportInput.monthlyTotalHousingCost), note: `월상환 ${fmtManwon(reportInput.estimatedMonthlyPayment)} + 고정비 ${fmtManwon(reportInput.monthlyFixedCost)}` },
        {
          label: "계약 후 잔여현금",
          value: reportInput.cashBufferAfterPurchase != null ? fmtManwon(reportInput.cashBufferAfterPurchase) : "입력 필요",
          note: reportInput.cashBufferAfterPurchase != null ? "보유 현금 입력 기준" : "보유 현금 입력 시 계산",
        },
      ],
      footnote: "특히 첫 매수라면 매매가보다 총초기투입금과 계약 후 남는 현금이 더 중요합니다.",
    },
    {
      id: "liquidity-exit",
      title: "유동성·출구 전략표",
      description: "거래량과 중기 흐름을 같이 보고, 보유 후 매도가 가능한 단지인지 판단합니다.",
      rows: [
        { label: "최근 24개월 거래", value: `${stats?.count ?? 0}건`, note: stats?.latestDate ? `최신 거래월 ${stats.latestDate}` : "직접 실거래 부족" },
        { label: "24개월 흐름", value: flowLabel(h24?.regionScore ?? h24?.total ?? null), note: h24 ? `${(h24.regionScore ?? h24.total).toFixed(2)}점` : "데이터 없음" },
        { label: "48개월 흐름", value: flowLabel(h48?.regionScore ?? h48?.total ?? null), note: h48 ? `${(h48.regionScore ?? h48.total).toFixed(2)}점` : "데이터 없음" },
      ],
      footnote: "거래량이 얇으면 보유 2년이 지나도 바로 팔리지 않을 수 있으니, 체결 속도와 대안 단지 경쟁력까지 같이 봐야 합니다.",
    },
  ]

  if (reportInput.budget && reportInput.budget > 0) {
    tables.splice(2, 0, {
      id: "budget-fit",
      title: "예산 비교표",
      description: "예산과 권장 진입가를 비교해 바로 가능한 후보인지 구분합니다.",
      rows: [
        { label: "입력 예산", value: fmtManwon(reportInput.budget), note: "사용자 입력 기준" },
        { label: "권장 진입가", value: fmtManwon(targetPrice), note: budgetFit ?? "비교 불가" },
        { label: "예산 차이", value: fmtManwon(Math.abs(reportInput.budget - targetPrice)), note: reportInput.budget >= targetPrice ? "예산 안" : "추가 자금 필요" },
      ],
    })
  }

  if (alternatives && alternatives.length > 0) {
    tables.push({
      id: "alternatives",
      title: "같은 예산 대안 비교표",
      description: "지금 보는 단지와 비슷한 예산 구간에서 같이 봐야 할 대안입니다.",
      cards: alternatives.slice(0, 3).map((alt) => ({
        title: alt.apt_nm,
        subtitle: alt.umd_nm ?? undefined,
        metrics: [
          { label: "점수", value: `${alt.display_score ?? "-"}점` },
          { label: "최근 가격", value: fmtManwon(alt.latest_price ?? 0) },
          { label: "가격 차이", value: alt.price_diff_pct != null ? `${alt.price_diff_pct > 0 ? "+" : ""}${alt.price_diff_pct}%` : "미확인" },
        ],
        note: alt.personalization_reason ?? undefined,
      })),
      footnote: "좋은 집인가보다 중요한 질문은, 같은 돈으로 더 나은 선택지가 있는가입니다.",
    })
  }

  if (reportInput.reportPersona === "investor") {
    const scenario2 = buildInvestorScenario({ years: 2, targetPrice, reportInput, horizons })
    const scenario4 = buildInvestorScenario({ years: 4, targetPrice, reportInput, horizons })
    tables.push({
      id: "investor-after-tax",
      title: "투자 세후 손익 비교표",
      description: "보유 2년/4년별로 세후 손익과 총비용을 나눠 보는 보수적 출구 가정표입니다.",
      cards: [scenario2, scenario4].map((scenario) => ({
        title: `${scenario.years}년 보유`,
        subtitle: `${scenario.projectedChangePct >= 0 ? "+" : ""}${scenario.projectedChangePct}% 출구 가정`,
        metrics: [
          { label: "예상 매도가", value: fmtManwon(scenario.projectedExitPrice) },
          { label: "총비용", value: fmtManwon(scenario.totalCost) },
          { label: "세후손익", value: fmtManwon(scenario.netProfit) },
        ],
        note: `이자 ${fmtManwon(scenario.interestCost)} · 보유세 ${fmtManwon(scenario.holdingTax)} · 양도세 ${fmtManwon(scenario.capitalGainsTax)} · 매도비용 ${fmtManwon(scenario.saleCost)}`,
      })),
      footnote: "세율과 보유세는 개인 조건에 따라 달라질 수 있으므로, 현재는 보유주택수 기준 보수적 가정으로 읽는 편이 맞습니다.",
    })
  }

  return tables
}
