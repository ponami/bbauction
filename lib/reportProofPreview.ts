import type { ReportPersona } from "@/lib/reportProducts"
import { buildInvestorScenario } from "@/lib/riskAnalysis/investorAfterTaxSheet"
import { buildReportInputModel, type ReportInputOverrides } from "@/lib/riskAnalysis/reportInputModel"
import { fmtManwon } from "@/lib/riskAnalysis/priceGuidance"

export interface ReportProofPreview {
  title: string
  lines: string[]
  note?: string
}

export function buildReportProofPreview(input: ReportInputOverrides & {
  persona: ReportPersona
  targetPrice?: number | null
}): ReportProofPreview | null {
  if (!input.targetPrice || input.targetPrice <= 0) return null
  const reportInput = buildReportInputModel({
    ...input,
    targetPrice: input.targetPrice,
  })

  if (input.persona === "agent") {
    return {
      title: "잠금 해제 후 바로 보는 상담 방어 자료",
      lines: [
        `권장 진입가 ${fmtManwon(input.targetPrice)} 기준 추천/보류 멘트`,
        reportInput.budget ? `예산 판정 ${input.targetPrice <= reportInput.budget ? "예산 안" : "예산 재조정 필요"} + 대안 비교표` : "대안 2~3개 비교표 + 고객유형별 반론 대응",
        "현장 확인 질문 + 다음 상담 액션",
      ],
      note: "고객 앞에서 바로 읽을 수 있는 구조로 열립니다.",
    }
  }

  if (input.persona === "investor") {
    const scenario2 = buildInvestorScenario({ years: 2, targetPrice: input.targetPrice, reportInput, horizons: [] })
    const scenario4 = buildInvestorScenario({ years: 4, targetPrice: input.targetPrice, reportInput, horizons: [] })
    return {
      title: "잠금 해제 후 바로 보는 세후 손익표",
      lines: [
        `2년 세후손익 ${fmtManwon(scenario2.netProfit)} · 예상 매도가 ${fmtManwon(scenario2.projectedExitPrice)}`,
        `4년 세후손익 ${fmtManwon(scenario4.netProfit)} · 예상 매도가 ${fmtManwon(scenario4.projectedExitPrice)}`,
        `이자 ${fmtManwon(scenario4.interestCost)} · 보유세 ${fmtManwon(scenario4.holdingTax)} · 양도세 ${fmtManwon(scenario4.capitalGainsTax)} 포함`,
      ],
      note: "세금과 비용을 뺀 뒤 실제로 얼마 남는지부터 봅니다.",
    }
  }

  return {
    title: "잠금 해제 후 바로 보는 총주거비 표",
    lines: [
      `총초기투입금 ${fmtManwon(reportInput.totalUpfrontCost)}`,
      `월 총주거비 ${fmtManwon(reportInput.monthlyTotalHousingCost)} · 월상환 ${fmtManwon(reportInput.estimatedMonthlyPayment)}`,
      reportInput.cashBufferAfterPurchase != null
        ? `계약 후 잔여현금 ${fmtManwon(reportInput.cashBufferAfterPurchase)}`
        : "예산/보유 현금 기준 잔여현금 계산",
    ],
    note: "좋은 집인지보다 사고 나서 버틸 수 있는지부터 보여줍니다.",
  }
}
