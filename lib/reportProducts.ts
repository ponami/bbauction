import type { RecommendationBudgetFit, RecommendationContext } from "@/lib/recommendationCopy"

export type ConsumerReportProductId = "single-report" | "compare-pack" | "first-home-pack"
export type ReportPersona = "general" | "first-home" | "agent" | "investor"

export interface ConsumerReportProduct {
  id: ConsumerReportProductId
  title: string
  price: string
  summary: string
  included: string[]
}

export interface DecisionSignal {
  label: string
  headline: string
  detail: string
  tone: "good" | "warn" | "info"
}

export interface DecisionPackContent {
  title: string
  subtitle: string
  signals: DecisionSignal[]
}

export interface ChecklistPackContent {
  title: string
  items: string[]
}

export const CONSUMER_REPORT_PRODUCTS: ConsumerReportProduct[] = [
  {
    id: "single-report",
    title: "단일 단지 심층 리포트",
    price: "9,900원",
    summary: "후보 1개를 계약 직전 다시 점검하는 결론형 리포트",
    included: [
      "신축 vs 구축 관점 정리",
      "실거주·투자 관점 재해석",
      "계약 전 체크리스트",
    ],
  },
  {
    id: "compare-pack",
    title: "비교 리포트",
    price: "19,900원",
    summary: "2~3개 후보를 붙여 보고 어느 쪽을 더 신중히 볼지 정리하는 비교팩",
    included: [
      "후보별 장단점 정리",
      "가격 차이와 기회비용 비교",
      "배우자·가족 공유용 요약",
    ],
  },
  {
    id: "first-home-pack",
    title: "신혼부부·생애첫매수 판단팩",
    price: "29,000원",
    summary: "신축 vs 구축, 예산, 실거주 체크포인트를 한 번에 정리하는 결정팩",
    included: [
      "신혼부부 실거주 체크포인트",
      "예산 안 후보/살짝 초과 후보 구분",
      "계약 전 확인 순서",
    ],
  },
]

function resolvePersona(options: {
  persona?: ReportPersona
  productId?: ConsumerReportProductId
  context?: RecommendationContext | null
  hasAgentProfile?: boolean
}): ReportPersona {
  if (options.persona && options.persona !== "general") return options.persona
  if (options.hasAgentProfile) return "agent"
  if (options.context?.purpose === "투자") return "investor"
  if (options.productId === "first-home-pack" || options.context?.purpose === "실거주") return "first-home"
  return "general"
}

function purposeHeadline(context?: RecommendationContext | null) {
  if (context?.purpose === "투자") {
    return {
      headline: "투자 관점으로 다시 보는 리포트",
      detail: "가격 흐름과 환금성, 기회비용 기준으로 먼저 정리합니다.",
      tone: "info" as const,
    }
  }
  if (context?.purpose === "실거주") {
    return {
      headline: "실거주 관점으로 다시 보는 리포트",
      detail: "생활권, 예산 적합도, 전세 리스크까지 한 번에 정리합니다.",
      tone: "good" as const,
    }
  }
  return {
    headline: "실거주·투자 관점을 함께 보는 리포트",
    detail: "무료 탐색에서 놓치기 쉬운 기준을 결론형으로 다시 묶습니다.",
    tone: "info" as const,
  }
}

function budgetHeadline(budgetFit?: RecommendationBudgetFit): Omit<DecisionSignal, "label"> {
  if (budgetFit === "within") {
    return {
      headline: "예산 안에서 바로 검토 가능한 후보",
      detail: "지금 바로 비교와 결론 검토를 이어가기 좋은 구간입니다.",
      tone: "good",
    }
  }
  if (budgetFit === "stretch") {
    return {
      headline: "조금 더 보면 닿는 후보",
      detail: "좋아 보여도 조건 조정이 필요한지 체크리스트로 먼저 확인해야 합니다.",
      tone: "warn",
    }
  }
  if (budgetFit === "over") {
    return {
      headline: "비교 기준으로만 보는 후보",
      detail: "예산을 넘는 구간이어서 바로 결정용보다 비교 기준으로 쓰는 편이 안전합니다.",
      tone: "warn",
    }
  }
  return {
    headline: "예산 기준을 같이 보며 정리하는 리포트",
    detail: "예산 정보가 없더라도 가격 부담과 비교 포인트를 함께 정리합니다.",
    tone: "info",
  }
}

function buildYearHeadline(buildYear?: number | null): Omit<DecisionSignal, "label"> {
  if (!buildYear) {
    return {
      headline: "신축 vs 구축 기준을 리포트에서 따로 정리",
      detail: "입주 연차, 완성도, 현재 시세 안착 여부를 함께 보도록 구성합니다.",
      tone: "info",
    }
  }
  if (buildYear >= 2019) {
    return {
      headline: "신축·준신축 축에 가까운 후보",
      detail: "새 아파트 프리미엄이 실제 거주 만족과 가격 방어력으로 이어지는지 확인이 중요합니다.",
      tone: "good",
    }
  }
  if (buildYear >= 2010) {
    return {
      headline: "완성된 준신축 축에서 보는 후보",
      detail: "새 아파트 매력과 생활권 안정성을 같이 보기에 좋은 구간입니다.",
      tone: "good",
    }
  }
  return {
    headline: "완성된 구축 축에서 보는 후보",
    detail: "입지·생활권은 강하지만 수리비, 환금성, 향후 유지비까지 같이 봐야 합니다.",
    tone: "warn",
  }
}

export function getDecisionSignals(options: {
  context?: RecommendationContext | null
  budgetFit?: RecommendationBudgetFit
  buildYear?: number | null
  persona?: ReportPersona
  productId?: ConsumerReportProductId
  hasAgentProfile?: boolean
}): DecisionSignal[] {
  const persona = resolvePersona(options)
  const purpose = purposeHeadline(options.context)
  const budget = budgetHeadline(options.budgetFit)
  const age = buildYearHeadline(options.buildYear)

  if (persona === "first-home") {
    return [
      { label: "신축 vs 구축", ...age },
      {
        label: "예산 안전선",
        headline: budget.headline,
        detail: options.budgetFit === "over"
          ? "집 자체가 좋아 보여도 첫 매수라면 예산을 넘는 순간 생활비와 수리비 부담이 같이 커집니다."
          : "첫 매수는 점수보다 대출·수리·가전까지 감당 가능한지 먼저 확인해야 합니다.",
        tone: budget.tone,
      },
      {
        label: "생활·가족 계획",
        headline: "생활권 완성도가 계약 만족도를 좌우합니다",
        detail: "출퇴근, 통학, 장보기, 향후 자녀 계획까지 같은 동선에서 무리 없는지 확인해야 실제 만족도가 오래 갑니다.",
        tone: "good",
      },
    ]
  }

  if (persona === "agent") {
    return [
      {
        label: "상담 한 줄 결론",
        headline: options.budgetFit === "over" ? "가격 설명이 먼저 필요한 후보" : "조건만 맞으면 검토를 이어갈 수 있는 후보",
        detail: "고객에게는 점수보다 '왜 지금 검토해도 되는지/왜 더 비교해야 하는지'를 한 문장으로 전달하는 편이 설득력이 높습니다.",
        tone: options.budgetFit === "over" ? "warn" : "good",
      },
      {
        label: "설명 우선순위",
        headline: options.context?.purpose === "투자" ? "환금성과 출구 전략부터 설명" : "생활권과 예산 적합도부터 설명",
        detail: "상담 초반에는 장점 나열보다 고객이 바로 체감하는 불안 요소를 먼저 정리해야 이탈이 줄어듭니다.",
        tone: "info",
      },
      {
        label: "다음 액션",
        headline: options.budgetFit === "within" ? "현장 확인과 가격 협상 포인트 정리" : "대안 단지와 비교표를 먼저 제시",
        detail: "상담용 공유에서는 다음 질문과 비교 대상을 함께 열어줘야 고객이 다시 들어옵니다.",
        tone: "info",
      },
    ]
  }

  if (persona === "investor") {
    return [
      {
        label: "매수 타이밍",
        headline: purpose.headline,
        detail: "투자는 '좋아 보이는 단지'보다 '지금 들어가도 나올 수 있는 단지'를 고르는 게임에 가깝습니다.",
        tone: purpose.tone,
      },
      {
        label: "예산·기회비용",
        headline: budget.headline,
        detail: options.budgetFit === "within"
          ? "같은 예산에서 더 나은 대안이 없는지 끝까지 비교해야 수익률이 남습니다."
          : "예산을 넘는 순간 기대 수익보다 자금 경직성과 기회비용 손실이 먼저 커질 수 있습니다.",
        tone: budget.tone,
      },
      {
        label: "출구 전략",
        headline: "2년 보유 이후에도 바로 팔릴지 봐야 합니다",
        detail: "거래량, 최근 체결 속도, 주변 동일 예산 대안까지 같이 봐야 실제 출구 전략이 보입니다.",
        tone: "warn",
      },
    ]
  }

  return [
    { label: "신축 vs 구축", ...age },
    { label: "실거주·투자", ...purpose },
    { label: "예산 안 후보", ...budget },
  ]
}

export function getDecisionPack(options: {
  context?: RecommendationContext | null
  budgetFit?: RecommendationBudgetFit
  buildYear?: number | null
  persona?: ReportPersona
  productId?: ConsumerReportProductId
  hasAgentProfile?: boolean
}): DecisionPackContent {
  const persona = resolvePersona(options)

  if (persona === "first-home") {
    return {
      title: "신혼부부 실거주 판단 요약",
      subtitle: "첫 매수에서 가장 많이 흔들리는 예산·생활권·신축 여부를 먼저 정리합니다.",
      signals: getDecisionSignals({ ...options, persona }),
    }
  }

  if (persona === "agent") {
    return {
      title: "상담 전달용 핵심 정리",
      subtitle: "고객에게 바로 설명할 결론, 비교 포인트, 다음 액션을 짧게 묶었습니다.",
      signals: getDecisionSignals({ ...options, persona }),
    }
  }

  if (persona === "investor") {
    return {
      title: "투자 판단 핵심 정리",
      subtitle: "가격 상승 기대보다 환금성·출구 전략·기회비용을 먼저 정리합니다.",
      signals: getDecisionSignals({ ...options, persona }),
    }
  }

  return {
    title: options.productId === "compare-pack" ? "비교 리포트 결론 정리" : "판단 리포트 결론 정리",
    subtitle: "신축/구축, 실거주/투자, 예산 기준을 한 장으로 다시 묶었습니다.",
    signals: getDecisionSignals({ ...options, persona }),
  }
}

export function getContractChecklist(productId: ConsumerReportProductId, context?: RecommendationContext | null) {
  const common = [
    "최근 실거래와 현재 호가 차이가 과하게 벌어지지 않았는지 보기",
    "전세가율·환금성·거래량이 현재 가격을 받쳐주는지 확인하기",
    "배우자·가족과 공유할 핵심 비교 포인트 3개 정리하기",
  ]

  if (productId === "compare-pack") {
    return [
      "후보 2~3개를 같은 기준으로 붙여 보기",
      "가격 차이가 향후 기회비용으로 얼마나 벌어지는지 체크하기",
      ...common,
    ]
  }

  if (productId === "first-home-pack") {
    return [
      "신축 프리미엄과 완성된 생활권 중 어디에 더 가중치를 둘지 정하기",
      "대출과 인테리어 비용까지 포함한 총 부담선 재확인하기",
      context?.purpose === "투자"
        ? "투자라면 실거주 매력보다 출구전략과 환금성을 더 우선으로 보기"
        : "실거주라면 교통·생활권·향후 가족 계획까지 한 번 더 체크하기",
      ...common,
    ]
  }

  return [
    "후보 1개를 계약 전에 한 번 더 점검하기",
    "신축/구축 관점에서 놓친 리스크가 없는지 보기",
    ...common,
  ]
}


export function getChecklistPack(options: {
  productId: ConsumerReportProductId
  context?: RecommendationContext | null
  persona?: ReportPersona
  hasAgentProfile?: boolean
}): ChecklistPackContent {
  const persona = resolvePersona(options)

  if (persona === "first-home") {
    return {
      title: "신혼부부 계약 전 체크리스트",
      items: [
        "대출, 취득세, 인테리어, 가전까지 포함한 총 부담선을 다시 계산하기",
        "출퇴근·통학·장보기 동선을 평일 저녁과 주말에 각각 확인하기",
        "아이 계획이 있다면 초등학교 거리와 학원·병원 접근성을 같이 보기",
        ...getContractChecklist("first-home-pack", options.context).slice(0, 3),
      ],
    }
  }

  if (persona === "agent") {
    return {
      title: "상담 전 확인 질문",
      items: [
        "고객이 이 단지를 보는 이유를 한 줄로 다시 확인하기",
        "예산 초과 허용 범위와 대안 단지 비교 기준을 먼저 맞추기",
        "실거주 고객이면 생활권, 투자 고객이면 출구 전략 질문을 먼저 던지기",
        "공유 링크에 고객명·목적·연락 CTA가 자연스럽게 보이는지 확인하기",
      ],
    }
  }

  if (persona === "investor") {
    return {
      title: "투자 판단 체크리스트",
      items: [
        "최근 거래량이 얇은 단지인지 먼저 확인하기",
        "2년 보유 후 매도 가정을 두고 출구 전략을 계산하기",
        "같은 예산 대안 단지와 기대 수익·기회비용을 비교하기",
        ...getContractChecklist("single-report", options.context).slice(0, 2),
      ],
    }
  }

  return {
    title: options.productId === "compare-pack" ? "비교 리포트 체크리스트" : "계약 전 체크리스트",
    items: getContractChecklist(options.productId, options.context),
  }
}
