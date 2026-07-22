import type { ReportAlternativeInput } from "./reportCommonData"
import type { ReportInputModel } from "./reportInputModel"
import { fmtManwon } from "./priceGuidance"

interface TradeStats {
  count: number
}

interface FirstHomeMetric {
  label: string
  value: string
  note?: string
}

interface FirstHomeSection {
  title: string
  items: string[]
}

function cashBufferLabel(reportInput: ReportInputModel) {
  if (reportInput.cashBufferAfterPurchase == null) return "현금 입력 필요"
  if (reportInput.cashBufferAfterPurchase < 0) return "즉시 보강 필요"
  if (reportInput.cashBufferAfterPurchase < reportInput.monthlyTotalHousingCost * 6) return "비상자금 얇음"
  return "버틸 여력 있음"
}

export function buildFirstHomeCostMetrics(input: {
  targetPrice: number
  budgetLabel: string
  reportInput: ReportInputModel
}): FirstHomeMetric[] {
  const { targetPrice, budgetLabel, reportInput } = input
  return [
    { label: "권장 진입가", value: fmtManwon(targetPrice), note: "보수적 진입가 기준" },
    { label: "총초기투입금", value: fmtManwon(reportInput.totalUpfrontCost), note: "자기자금 + 취득세 + 중개보수 + 이사/인테리어" },
    { label: "월 총주거비", value: fmtManwon(reportInput.monthlyTotalHousingCost), note: `월상환 ${fmtManwon(reportInput.estimatedMonthlyPayment)} + 고정비 ${fmtManwon(reportInput.monthlyFixedCost)}` },
    { label: "계약 후 잔여현금", value: reportInput.cashBufferAfterPurchase != null ? fmtManwon(reportInput.cashBufferAfterPurchase) : "입력 필요", note: cashBufferLabel(reportInput) },
    { label: "예산 판정", value: budgetLabel, note: reportInput.budget ? `입력 예산 ${fmtManwon(reportInput.budget)}` : "예산 입력 시 더 정확해짐" },
  ]
}

export function buildFirstHomeCostSections(input: {
  ageText: string
  reportInput: ReportInputModel
  stats: TradeStats | null
  topAlt?: ReportAlternativeInput | null
}): FirstHomeSection[] {
  const { ageText, reportInput, stats, topAlt } = input
  return [
    {
      title: "총주거비 판단",
      items: [
        `${ageText} 후보라도 계약 직후 실제 빠져나가는 돈은 매매가 자체보다 총초기투입금 ${fmtManwon(reportInput.totalUpfrontCost)}에 더 가깝습니다.`,
        `취득세 ${fmtManwon(reportInput.acquisitionTax)}, 중개보수 ${fmtManwon(reportInput.brokerFee)}, 이사·인테리어 ${fmtManwon(reportInput.moveCost + reportInput.interiorCost)}까지 같이 봐야 계약 직후 흔들리지 않습니다.`,
        stats?.count ? `최근 24개월 거래 ${stats.count}건이라 계약 직전에는 총주거비를 최신 체결가에 다시 대입해봐야 합니다.` : "직접 실거래가 얇다면 최신 호가보다 총주거비를 먼저 보수적으로 잡아야 합니다.",
      ],
    },
    {
      title: "12개월 버티기 점검",
      items: [
        `월상환과 고정비를 합친 월 총주거비는 ${fmtManwon(reportInput.monthlyTotalHousingCost)} 수준으로 보고, 최소 12개월 버틸 수 있는지 먼저 확인해야 합니다.`,
        reportInput.cashBufferAfterPurchase != null
          ? `계약 후 남는 현금은 ${fmtManwon(reportInput.cashBufferAfterPurchase)}로 계산됩니다. 비상자금은 최소 월 총주거비 6개월치와 비교해 봐야 안전합니다.`
          : "보유 현금을 입력하면 계약 후 남는 비상자금까지 같이 판단할 수 있습니다.",
        topAlt ? `같은 예산 대안으로 ${topAlt.apt_nm}${topAlt.umd_nm ? `(${topAlt.umd_nm})` : ""}도 같이 보면서 총주거비가 더 가벼운지 비교해야 후회 확률이 줄어듭니다.` : "같은 예산의 다른 후보와 총주거비를 나란히 비교해야 감정적 결정이 줄어듭니다.",
      ],
    },
    {
      title: "배우자 합의 포인트",
      items: [
        `우리 집은 '살 수 있나'보다 '사고 나서 버틸 수 있나'가 핵심이라, 총초기투입금 ${fmtManwon(reportInput.totalUpfrontCost)}과 월 총주거비 ${fmtManwon(reportInput.monthlyTotalHousingCost)}를 먼저 같이 봐야 합니다.`,
        `대출은 ${fmtManwon(reportInput.effectiveLoanAmount)} 기준이고, 금리 ${reportInput.interestRate.toFixed(1)}% · ${reportInput.loanYears}년 가정이라 실제 조건이 바뀌면 다시 계산해야 합니다.`,
        reportInput.cashBufferAfterPurchase != null
          ? `잔여현금 ${fmtManwon(reportInput.cashBufferAfterPurchase)}이 비상자금 기준에 못 미치면, 좋은 집이어도 지금은 보류가 더 자연스러울 수 있습니다.`
          : "보유 현금과 비상자금 기준을 같이 적어두면 배우자 합의가 훨씬 빨라집니다.",
      ],
    },
  ]
}
