import type { ReportAlternativeInput } from "./reportCommonData"
import type { ReportInputModel } from "./reportInputModel"
import { fmtManwon } from "./priceGuidance"

interface TradeStats {
  count: number
  latestDate: string
}

interface Horizon {
  horizon: number
  regionScore: number | null
  total: number
}

export interface InvestorScenario {
  years: number
  projectedExitPrice: number
  projectedChangePct: number
  grossGain: number
  interestCost: number
  holdingTax: number
  saleCost: number
  capitalGainsTax: number
  totalCost: number
  netProfit: number
  returnOnCashPct: number | null
}

function scenarioScore(horizons: Horizon[], years: number) {
  const horizonMonths = years === 2 ? 24 : 48
  const row = horizons.find((item) => item.horizon === horizonMonths)
  return row ? (row.regionScore ?? row.total) : null
}

function projectedChangePctFromScore(score: number | null, years: number) {
  if (score == null) return years === 2 ? 2 : 4
  const factor = years === 2 ? 20 : 28
  return Math.max(-18, Math.min(24, score * factor))
}

function annualHoldingTaxRate(homesOwned: number) {
  return homesOwned >= 1 ? 0.35 : 0.25
}

function saleCostRate() {
  return 0.5
}

function capitalGainsTaxRate(homesOwned: number, years: number) {
  if (homesOwned >= 1) return years >= 2 ? 30 : 38
  return years >= 2 ? 15 : 22
}

export function buildInvestorScenario(input: {
  years: number
  targetPrice: number
  reportInput: ReportInputModel
  horizons: Horizon[]
}): InvestorScenario {
  const { years, targetPrice, reportInput, horizons } = input
  const score = scenarioScore(horizons, years)
  const projectedChangePct = projectedChangePctFromScore(score, years)
  const projectedExitPrice = Math.max(0, Math.round(targetPrice * (1 + projectedChangePct / 100)))
  const grossGain = projectedExitPrice - targetPrice
  const interestCost = Math.round(reportInput.effectiveLoanAmount * (reportInput.interestRate / 100) * years)
  const holdingTax = Math.round(targetPrice * (annualHoldingTaxRate(reportInput.homesOwned) / 100) * years)
  const saleCost = Math.round(projectedExitPrice * (saleCostRate() / 100))
  const capitalGainsTax = grossGain > 0
    ? Math.round(grossGain * (capitalGainsTaxRate(reportInput.homesOwned, years) / 100))
    : 0
  const totalCost = reportInput.acquisitionTax + reportInput.brokerFee + interestCost + holdingTax + saleCost + capitalGainsTax
  const netProfit = grossGain - totalCost
  const returnOnCashPct = reportInput.totalUpfrontCost > 0
    ? Number(((netProfit / reportInput.totalUpfrontCost) * 100).toFixed(1))
    : null

  return {
    years,
    projectedExitPrice,
    projectedChangePct: Number(projectedChangePct.toFixed(1)),
    grossGain,
    interestCost,
    holdingTax,
    saleCost,
    capitalGainsTax,
    totalCost,
    netProfit,
    returnOnCashPct,
  }
}

export function buildInvestorPersonaMetrics(input: {
  targetPrice: number
  reportInput: ReportInputModel
  horizons: Horizon[]
  stats: TradeStats | null
}) {
  const { targetPrice, reportInput, horizons, stats } = input
  const scenario2 = buildInvestorScenario({ years: 2, targetPrice, reportInput, horizons })
  const scenario4 = buildInvestorScenario({ years: 4, targetPrice, reportInput, horizons })
  return [
    { label: "권장 진입가", value: fmtManwon(targetPrice), note: "보수적 매수가 가정" },
    { label: "2년 세후손익", value: fmtManwon(scenario2.netProfit), note: `${scenario2.projectedChangePct >= 0 ? "+" : ""}${scenario2.projectedChangePct}% 출구 가정` },
    { label: "4년 세후손익", value: fmtManwon(scenario4.netProfit), note: `${scenario4.projectedChangePct >= 0 ? "+" : ""}${scenario4.projectedChangePct}% 출구 가정` },
    { label: "거래량", value: `${stats?.count ?? 0}건`, note: stats?.latestDate ? `최신 거래월 ${stats.latestDate}` : "환금성 보수적 해석 필요" },
  ]
}

export function buildInvestorPersonaSections(input: {
  targetPrice: number
  reportInput: ReportInputModel
  horizons: Horizon[]
  stats: TradeStats | null
  topAlt?: ReportAlternativeInput | null
}) {
  const { targetPrice, reportInput, horizons, stats, topAlt } = input
  const scenario2 = buildInvestorScenario({ years: 2, targetPrice, reportInput, horizons })
  const scenario4 = buildInvestorScenario({ years: 4, targetPrice, reportInput, horizons })

  return [
    {
      title: "2년 보유 세후 판단",
      items: [
        `2년 출구 가정에서는 매도 후 손에 남는 금액을 ${fmtManwon(scenario2.netProfit)} 수준으로 보는 보수적 계산입니다.`,
        `취득세·중개보수·이자·보유세·매도비용·양도세를 합친 총비용은 ${fmtManwon(scenario2.totalCost)}입니다.`,
        stats?.count && stats.count >= 4 ? "거래량이 아주 마른 구간은 아니지만, 2년 뒤에도 바로 팔린다는 보장은 없습니다." : "거래량이 얇아 2년 보유 후에도 매도 체결이 늦어질 가능성을 먼저 봐야 합니다.",
      ],
    },
    {
      title: "4년 보유 세후 판단",
      items: [
        `4년 출구 가정에서는 세후손익이 ${fmtManwon(scenario4.netProfit)}로 계산됩니다. 장기 보유 명분은 결국 여기서 남는지로 판단해야 합니다.`,
        `4년 동안 이자비용 ${fmtManwon(scenario4.interestCost)}, 보유세 ${fmtManwon(scenario4.holdingTax)}가 누적된다고 보고 있습니다.`,
        scenario4.returnOnCashPct != null ? `초기투입금 대비 세후 수익률은 ${scenario4.returnOnCashPct}% 수준으로 읽히므로, 대안 단지 대비 우위가 있는지 같이 봐야 합니다.` : "초기투입금 대비 수익률 비교가 가능하도록 자기자금 입력이 같이 들어오면 더 좋습니다.",
      ],
    },
    {
      title: "세금·환금성·기회비용 체크",
      items: [
        `현재 가정은 보유주택수 ${reportInput.homesOwned}채 기준으로 양도세를 보수적으로 반영합니다. 실제 세율은 개인 조건에 따라 다시 점검해야 합니다.`,
        topAlt ? `같은 예산 대안 ${topAlt.apt_nm}보다 이 단지를 사야 한다면, 최소 ${fmtManwon(Math.max(scenario4.netProfit, scenario2.netProfit))} 이상 남는 논리가 있어야 합니다.` : "같은 예산의 다른 단지보다 왜 이 단지를 사야 하는지 세후 손익과 환금성으로 비교해야 합니다.",
        "투자 리포트는 상승 기대보다 안 팔릴 리스크와 세후로 얼마 남는지부터 보여줘야 의미가 있습니다.",
      ],
    },
  ]
}
