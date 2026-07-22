export type RecommendationPurpose = "실거주" | "투자"
export type RecommendationTimeline = "3개월" | "6개월" | "1년" | "미정"
export type RecommendationBudgetFit = "within" | "stretch" | "over" | "unknown"

export interface RecommendationContext {
  purpose?: RecommendationPurpose | ""
  timeline?: RecommendationTimeline | ""
  budget?: number | null
  horizon?: number | null
}

interface NormalizedRecommendationContext {
  purpose: RecommendationPurpose
  timeline: RecommendationTimeline
  budget: number
  horizon: number
}

interface RecommendationReasonOptions {
  context: RecommendationContext
  budgetFit?: RecommendationBudgetFit
  personalizationReason?: string
  selectedPrediction?: number | null
}

interface BudgetFitCopy {
  itemAction: string
  mapCompareCta: string
  sharePrimaryCta: string
  shareSecondaryCta: string
  shareNote: string
}

function hasExplicitRecommendationContext(context?: RecommendationContext | null) {
  return Boolean(context?.purpose || context?.timeline || context?.budget || context?.horizon)
}

function defaultHorizon(timeline: RecommendationTimeline): number {
  if (timeline === "3개월") return 6
  if (timeline === "6개월") return 12
  return 24
}

export function normalizeRecommendationContext(context?: RecommendationContext | null): NormalizedRecommendationContext {
  const timeline = context?.timeline && ["3개월", "6개월", "1년", "미정"].includes(context.timeline)
    ? context.timeline as RecommendationTimeline
    : "미정"
  return {
    purpose: context?.purpose === "투자" ? "투자" : "실거주",
    timeline,
    budget: context?.budget && context.budget > 0 ? context.budget : 0,
    horizon: context?.horizon && context.horizon > 0 ? context.horizon : defaultHorizon(timeline),
  }
}

export function appendRecommendationParams(params: URLSearchParams, context?: RecommendationContext | null) {
  const normalized = normalizeRecommendationContext(context)
  params.set("purpose", normalized.purpose)
  params.set("timeline", normalized.timeline)
  if (normalized.budget > 0) {
    params.set("budget", String(normalized.budget))
  }
}

export function recommendationLabel(context?: RecommendationContext | null) {
  if (!hasExplicitRecommendationContext(context)) {
    return "기본 상담 기준"
  }
  const normalized = normalizeRecommendationContext(context)
  return `${normalized.purpose} · ${normalized.timeline} · ${normalized.horizon}개월 기준`
}

export function getRecommendationCopy(context?: RecommendationContext | null) {
  if (!hasExplicitRecommendationContext(context)) {
    return {
      headerTitle: "📋 추천 비교",
      headerDescription: "점수만 보지 말고 가격 흐름, 환금성, 예산 부담이 함께 설명되는 후보부터 보세요.",
      dashboardBanner: "현재 리포트는 기본 상담 기준으로 정리되어 있습니다. 가격 흐름과 환금성 설명을 같이 확인하면 판단이 빨라집니다.",
      shareNote: "기본 상담 기준의 참고 자료입니다. 가격 흐름, 환금성, 실거주·투자 적합성을 함께 확인하세요.",
      mapPrimaryCta: "📊 점수 근거와 비교 단지까지 보기 →",
      mapSecondaryCta: "추천 1위 바로 비교하기 →",
      dashboardPrimaryCta: "이 리포트 공유하기",
      sharePrimaryCta: "점수 근거와 비교 단지까지 보기 →",
      shareSecondaryCta: "다른 아파트 찾아보기",
      shareButtonLine: "가격 흐름과 환금성까지 함께 보는 상세 리포트입니다.",
      lockedOverlayTitle: "상세 리포트 열기",
      lockedOverlayDescription: "가격 흐름 · 환금성 · 비교 단지 설명까지 함께 볼 수 있습니다.",
    }
  }
  const normalized = normalizeRecommendationContext(context)
  const timelineLead = normalized.timeline === "3개월"
    ? "빠르게 계약 후보를 좁히는 흐름"
    : normalized.timeline === "6개월"
      ? "비교와 검토를 같이 가져가는 흐름"
      : "시간을 두고 근거를 누적해 보는 흐름"

  if (normalized.purpose === "투자") {
    return {
      headerTitle: "📋 투자 관점 비교",
      headerDescription: `${timelineLead}입니다. 단기 가격 흐름과 예산 부담이 함께 설명되는 후보부터 보세요.`,
      dashboardBanner: `${normalized.timeline} 투자 기준으로 다시 본 리포트입니다. 가격 흐름과 환금성 설명을 먼저 확인하면 판단이 빠릅니다.`,
      shareNote: `${normalized.timeline} 투자 기준의 참고 자료입니다. 점수보다 가격 흐름과 환금성 설명을 먼저 확인하세요.`,
      mapPrimaryCta: "📊 이 투자 기준으로 전체 분석 보기 →",
      mapSecondaryCta: "투자 기준 추천 1위 비교하기 →",
      dashboardPrimaryCta: "이 투자 기준 리포트 공유하기",
      sharePrimaryCta: "투자 기준 근거와 비교 단지 보기 →",
      shareSecondaryCta: "다른 투자 후보 더 보기",
      shareButtonLine: `${normalized.timeline} 투자 기준으로 다시 본 상세 리포트입니다.`,
      lockedOverlayTitle: "맞춤 투자 리포트 열기",
      lockedOverlayDescription: "가격 흐름 · 환금성 · 비교 단지까지 한 번에 정리됩니다.",
    }
  }

  return {
    headerTitle: "📋 실거주 관점 비교",
    headerDescription: `${timelineLead}입니다. 예산 적합도와 전세 리스크, 생활권 설명이 같이 맞는 후보부터 보세요.`,
    dashboardBanner: `${normalized.timeline} 실거주 기준으로 다시 본 리포트입니다. 예산, 환금성, 생활권 근거를 한 흐름으로 확인하세요.`,
    shareNote: `${normalized.timeline} 실거주 기준의 참고 자료입니다. 가격보다 예산 적합도와 생활권 설명을 먼저 확인하세요.`,
    mapPrimaryCta: "📊 이 실거주 기준으로 전체 분석 보기 →",
    mapSecondaryCta: "실거주 기준 추천 1위 비교하기 →",
    dashboardPrimaryCta: "이 실거주 기준 리포트 공유하기",
    sharePrimaryCta: "실거주 기준 근거와 비교 단지 보기 →",
    shareSecondaryCta: "다른 실거주 후보 더 보기",
    shareButtonLine: `${normalized.timeline} 실거주 기준으로 다시 본 상세 리포트입니다.`,
    lockedOverlayTitle: "맞춤 실거주 리포트 열기",
    lockedOverlayDescription: "예산 적합도 · 생활권 · 비교 단지 설명까지 함께 볼 수 있습니다.",
  }
}

export function inferBudgetFit(priceMan?: number | null, budget?: number | null): RecommendationBudgetFit {
  if (!priceMan || !budget) return "unknown"
  if (priceMan <= budget) return "within"
  if (priceMan <= Math.floor(budget * 1.05)) return "stretch"
  return "over"
}

export function getBudgetFitCopy(budgetFit?: RecommendationBudgetFit): BudgetFitCopy {
  if (budgetFit === "within") {
    return {
      itemAction: "예산 안에서 바로 검토",
      mapCompareCta: "예산 안에서 바로 비교하기 →",
      sharePrimaryCta: "예산 안에서 상세 근거 보기 →",
      shareSecondaryCta: "예산 맞는 다른 후보 보기",
      shareNote: "현재 예산 안에서 바로 검토 가능한 흐름입니다.",
    }
  }
  if (budgetFit === "stretch") {
    return {
      itemAction: "조금 더 보면 닿는 후보",
      mapCompareCta: "조금 더 보면 닿는 후보 비교하기 →",
      sharePrimaryCta: "조금 더 보면 닿는 근거 보기 →",
      shareSecondaryCta: "예산 안 후보 더 보기",
      shareNote: "예산을 조금만 더 보면 닿는 구간이라 비교 근거를 먼저 보는 흐름입니다.",
    }
  }
  if (budgetFit === "over") {
    return {
      itemAction: "비교 기준으로만 보기",
      mapCompareCta: "비교 기준으로 참고하기 →",
      sharePrimaryCta: "비교 기준 리포트 보기 →",
      shareSecondaryCta: "예산 안 후보 더 보기",
      shareNote: "현재 예산은 넘기 때문에 바로 결정용보다는 비교 기준으로 보는 편이 안전합니다.",
    }
  }
  return {
    itemAction: "가격 부담부터 함께 보기",
    mapCompareCta: "추천 1위 바로 비교하기 →",
    sharePrimaryCta: "점수 근거와 비교 단지까지 보기 →",
    shareSecondaryCta: "다른 아파트 찾아보기",
    shareNote: "예산 정보와 함께 보면 더 빠르게 후보를 줄일 수 있습니다.",
  }
}

export function getRecommendationReasonLine(options: RecommendationReasonOptions) {
  const normalized = normalizeRecommendationContext(options.context)
  const lines: string[] = []

  if (options.budgetFit === "within") {
    lines.push("예산 안에서 바로 검토 가능한 후보")
  } else if (options.budgetFit === "stretch") {
    lines.push("예산을 조금 더 보면 닿는 후보")
  } else if (options.budgetFit === "over") {
    lines.push("예산은 넘지만 비교 기준으로 볼 만한 후보")
  }

  if (normalized.purpose === "투자" && options.selectedPrediction != null) {
    lines.push(`${normalized.horizon}개월 흐름 기준 참고 시나리오 포함`)
  }

  if (options.personalizationReason) {
    lines.push(options.personalizationReason)
  }

  return lines.join(" · ")
}
