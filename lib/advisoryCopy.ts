export type AdvisoryInput = {
  oreulji_score?: number | null
  final_score?: number | null
  show_rise?: boolean
  short_rank?: { pct: number; regime: string; signal_valid: boolean } | null
  apt_rank_national?: { national_pct: number; regime: string } | null
  expected_gain?: number | null
  regret_prob?: number | null
  downside_regret_prob?: number | null
  opportunity_regret_prob?: number | null
  risk_level?: string | null
  jeonse_risk_level?: string | null
  school_score?: number | null
  build_year?: number | null
  recent_trades?: Array<unknown> | null
  no_trade_data?: boolean
  is_presale?: boolean
}

export type AdvisoryVerdict = {
  emoji: string
  label: string
  sub: string
  color: string
  bg: string
  border: string
}

export type AdvisoryReason = {
  axis: "가격 흐름" | "환금성" | "실거주·투자 적합성"
  text: string
  positive: boolean
}

export function getAdvisoryScore(input: AdvisoryInput): number {
  return input.final_score ?? input.oreulji_score ?? 0
}

export function getAdvisoryVerdict(input: AdvisoryInput): AdvisoryVerdict {
  const score = getAdvisoryScore(input)

  if (score >= 75) {
    return {
      emoji: "✅",
      label: "가격 흐름과 환금성이 모두 안정적인 편입니다",
      sub: "실거주 상담에서는 우선 검토할 수 있는 구간입니다",
      color: "#15803D",
      bg: "#F0FDF4",
      border: "#BBF7D0",
    }
  }
  if (score >= 64) {
    return {
      emoji: "🟢",
      label: "전반 흐름은 무난하지만 비교 확인이 필요합니다",
      sub: "같은 예산대 대안 단지와 함께 보는 편이 좋습니다",
      color: "#059669",
      bg: "#ECFDF5",
      border: "#6EE7B7",
    }
  }
  if (score >= 56) {
    return {
      emoji: "⏳",
      label: "가격보다 진입 조건을 먼저 따져봐야 합니다",
      sub: "실거래, 전세, 거래량을 같이 보고 결정하는 구간입니다",
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
    }
  }
  if (score >= 50) {
    return {
      emoji: "⚠️",
      label: "환금성과 가격 방어력을 더 확인해야 합니다",
      sub: "서두르기보다 조건 협상과 비교 검토가 우선입니다",
      color: "#EA580C",
      bg: "#FFF7ED",
      border: "#FED7AA",
    }
  }
  return {
    emoji: "🔎",
    label: "현재 가격에서는 보수적으로 보는 편이 자연스럽습니다",
    sub: "실거주라면 조건 협상, 투자라면 관망이 더 안전합니다",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
  }
}

export function getThreeAxisReasons(input: AdvisoryInput): AdvisoryReason[] {
  const score = getAdvisoryScore(input)
  const tradeCount = input.recent_trades?.length ?? 0
  const downsideRegret = input.downside_regret_prob ?? input.regret_prob ?? null
  const opportunityRegret = input.opportunity_regret_prob ?? null

  let priceFlow: AdvisoryReason
  if (input.is_presale) {
    priceFlow = {
      axis: "가격 흐름",
      text: "분양 단지는 입주 전 변수가 많아 실거래가 쌓인 뒤 흐름 판단이 더 정확해집니다.",
      positive: false,
    }
  } else if (input.short_rank?.signal_valid && input.short_rank?.regime === 'up' && input.short_rank?.pct <= 30) {
    priceFlow = {
      axis: "가격 흐름",
      text: `단기 지역 전망 순위가 상위 ${input.short_rank.pct}%로 양호한 편입니다.`,
      positive: true,
    }
  } else if (!input.short_rank?.signal_valid && input.short_rank?.pct != null && input.short_rank?.pct <= 30) {
    priceFlow = {
      axis: "가격 흐름",
      text: `지역 전망 순위가 상위 ${input.short_rank.pct}%이나 단기 신호가 약합니다.`,
      positive: true,
    }
  } else if (downsideRegret != null && downsideRegret >= 0.55) {
    priceFlow = {
      axis: "가격 흐름",
      text: `하락 후회 가능성이 ${Math.round(downsideRegret * 100)}%로 잡혀 있어, 가격 방어력은 보수적으로 보는 편이 맞습니다.`,
      positive: false,
    }
  } else if (input.expected_gain != null && input.expected_gain > 0) {
    priceFlow = {
      axis: "가격 흐름",
      text: `예상 변동폭이 플러스 구간이라 급락보다 완만한 상승 흐름 쪽에 가깝습니다.`,
      positive: true,
    }
  } else {
    priceFlow = {
      axis: "가격 흐름",
      text: score >= 64
        ? "강한 급등 기대보다는 무난하게 버티는 흐름으로 해석하는 편이 맞습니다."
        : "지금은 가격 메리트가 있는지부터 먼저 따져봐야 하는 구간입니다.",
      positive: score >= 64,
    }
  }

  let liquidity: AdvisoryReason
  if (!input.no_trade_data && tradeCount >= 3) {
    liquidity = {
      axis: "환금성",
      text: "최근 실거래가 이어져 있어 매도 호흡이 아주 막혀 있는 단지는 아닙니다.",
      positive: true,
    }
  } else if (!input.no_trade_data && tradeCount === 0) {
    liquidity = {
      axis: "환금성",
      text: "최근 실거래가 거의 없어 나중에 팔 때 시간과 가격 조정이 필요할 수 있습니다.",
      positive: false,
    }
  } else if (input.risk_level === "낮음") {
    liquidity = {
      axis: "환금성",
      text: "거래 환경이 비교적 안정적이라 급하게 가격을 낮춰 팔 가능성은 크지 않습니다.",
      positive: true,
    }
  } else if (input.risk_level === "높음") {
    liquidity = {
      axis: "환금성",
      text: "거래 환경이 불안정한 편이라 급매 출회나 가격 조정 가능성을 같이 봐야 합니다.",
      positive: false,
    }
  } else {
    liquidity = {
      axis: "환금성",
      text: "환금성은 보통 수준으로 보고, 실제 거래량과 최근 체결가를 함께 확인하는 편이 안전합니다.",
      positive: false,
    }
  }

  let suitability: AdvisoryReason
  if (opportunityRegret != null && opportunityRegret >= 0.65) {
    suitability = {
      axis: "실거주·투자 적합성",
      text: `같은 예산대 대안 대비 기회비용 후회 가능성이 ${Math.round(opportunityRegret * 100)}%로 높아, 단독 결정보다 비교 검토가 먼저입니다.`,
      positive: false,
    }
  } else if (input.jeonse_risk_level === "낮음" && (input.school_score ?? 0) >= 70) {
    suitability = {
      axis: "실거주·투자 적합성",
      text: "전세 리스크와 학군 점수가 함께 받쳐줘 실거주 상담에서 설명하기 편한 단지입니다.",
      positive: true,
    }
  } else if (input.jeonse_risk_level === "높음") {
    suitability = {
      axis: "실거주·투자 적합성",
      text: "전세 리스크가 높아 실거주든 투자든 자금 계획을 더 보수적으로 잡는 편이 좋습니다.",
      positive: false,
    }
  } else if (input.build_year != null && input.build_year < 2000) {
    suitability = {
      axis: "실거주·투자 적합성",
      text: "연식이 오래된 편이라 실거주라면 수리비, 투자라면 향후 경쟁 단지와의 비교를 같이 봐야 합니다.",
      positive: false,
    }
  } else {
    suitability = {
      axis: "실거주·투자 적합성",
      text: score >= 64
        ? "실거주 검토에는 무난하지만, 투자 판단은 같은 생활권 대체 단지와 비교가 필요합니다."
        : "실거주 여부와 투자 목적을 분리해서 봐야 하고, 하나의 점수만으로 결정하긴 이릅니다.",
      positive: score >= 64,
    }
  }

  return [priceFlow, liquidity, suitability]
}
