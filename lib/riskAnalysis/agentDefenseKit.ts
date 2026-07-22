import type { ReportAlternativeInput } from "./reportCommonData"
import { fmtManwon } from "./priceGuidance"

interface TradeStats {
  count: number
  latestDate: string
}

export function buildAgentDefenseSections(input: {
  targetPrice: number
  stats: TradeStats | null
  budgetLabel: string
  flow24Label: string
  topAlt?: ReportAlternativeInput | null
}): { title: string; items: string[] }[] {
  const { targetPrice, stats, budgetLabel, flow24Label, topAlt } = input
  return [
    {
      title: "추천 근거 3개",
      items: [
        "추천은 장점 나열보다 가격 설명이 되는지부터 확인해야 성립합니다.",
        stats?.count && stats.count >= 4 ? `최근 거래 ${stats.count}건으로 직접 거래 근거가 있어 가격 설명을 붙이기 좋습니다.` : "직접 거래가 적다면 동일 예산 대안 비교를 먼저 붙여야 신뢰가 생깁니다.",
        topAlt ? `대안 ${topAlt.apt_nm}와 비교했을 때도 이 단지를 고르는 이유를 설명할 수 있어야 추천이 버팁니다.` : "대안 후보가 없으면 단독 추천보다 후보군 안에서 설명하는 편이 안전합니다.",
      ],
    },
    {
      title: "보류 근거 3개",
      items: [
        budgetLabel === "예산 초과" ? "예산 초과 구간이면 추천보다 대안 전환이 먼저입니다." : "예산 안이어도 가격 설명이 약하면 보류가 더 안전합니다.",
        flow24Label.includes("약세") ? "중기 흐름이 약하면 지금 계약 명분보다 나중에 되돌아볼 리스크가 큽니다." : "흐름이 중립이면 지금 계약해야 할 숫자 근거를 더 보강해야 합니다.",
        `최신 거래월 ${stats?.latestDate || "확인 필요"} 이후 호가가 벌어졌다면, 현장 확인 전 확답은 피하는 편이 맞습니다.`,
      ],
    },
    {
      title: "고객 유형별 반론 대응",
      items: [
        `예산 민감형: "좋은 집인 건 맞지만 ${fmtManwon(targetPrice)} 안에서 설명이 안 되면 같은 예산 후보까지 같이 보시는 게 안전합니다."`,
        topAlt ? `실거주 안정형: "생활 만족이 중요하시면 ${topAlt.apt_nm}와 이 단지를 같이 놓고 출퇴근·통학·관리상태를 비교해 드리는 게 맞습니다."` : "실거주 안정형: \"생활 만족이 중요하시면 가격보다 동선·관리상태까지 같이 본 뒤 결정하시는 게 맞습니다.\"",
        `상승 기대형: "흐름이 ${flow24Label}라서 기대감만으로 밀기보다, 왜 지금 들어가도 되는지 숫자로 설명되는 단지만 추천드리는 게 맞습니다."`,
      ],
    },
    {
      title: "다음 상담 액션",
      items: [
        "고객에게 추천 이유 1개보다 보류 이유 1개를 먼저 설명해 신뢰를 확보합니다.",
        topAlt ? `${topAlt.apt_nm} 포함 대안 2~3개를 같은 예산 비교표로 다시 묶어 보여줍니다.` : "같은 예산 후보 2~3개를 다시 묶어 비교표를 만든 뒤 재상담합니다.",
        "현장 방문 전에는 최신 호가, 관리상태, 동/층/향 차이를 체크리스트로 먼저 정리합니다.",
      ],
    },
  ]
}
