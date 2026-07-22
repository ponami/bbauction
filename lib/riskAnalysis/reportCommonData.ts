import { fmtManwon } from "./priceGuidance"
import type { TradeRecord } from "@/lib/types"

export interface ReportAlternativeInput {
  apt_nm: string
  umd_nm?: string | null
  display_score?: number | null
  latest_price?: number | null
  score_diff?: number | null
  price_diff_pct?: number | null
  budget_fit?: string | null
  personalization_reason?: string | null
}

interface ExitSummaryInput {
  stats: { count: number; latestDate: string } | null
  regretPct: number
  horizons: { horizon: number; regionScore: number | null; total: number }[]
}

export function buildReferenceTradeSummary(
  referenceTrades: TradeRecord[],
  scope: "umd" | "lawd" | "none" = "none",
  note?: string | null,
) {
  if (!referenceTrades.length) return null

  const lines = referenceTrades.slice(0, 3).map((trade) => {
    const areaValue = parseFloat(trade.area || "0")
    const areaLabel = areaValue ? `${areaValue}㎡(${Math.round(areaValue / 3.3058)}평)` : trade.area
    return `${trade.dealDate} ${trade.aptName} ${fmtManwon(trade.price)}${areaLabel ? ` · ${areaLabel}` : ""}`
  })

  return {
    heading: "주변 동일평형 참고 거래",
    body: [
      scope === "umd"
        ? "이 단지 자체 실거래가 부족할 때는 같은 법정동의 비슷한 면적 거래를 같이 봐야 현재 가격 감이 잡힙니다."
        : "이 단지 자체 실거래가 부족할 때는 같은 시군구 안의 비슷한 면적 거래를 같이 봐야 현재 가격 감이 잡힙니다.",
      note ? `${note} 기준으로 최근 참고 거래는 ${lines.join(" / ")} 입니다.` : `최근 참고 거래는 ${lines.join(" / ")} 입니다.`,
      "이 값은 단지 실거래가 아니라 가격 감을 잡기 위한 참고축으로만 써야 합니다.",
    ].join(" "),
  }
}

export function buildAlternativesSummary(alternatives: ReportAlternativeInput[] | null | undefined) {
  if (!alternatives || alternatives.length === 0) return null

  const top = alternatives.slice(0, 3)
  const lines = top.map((alt) => {
    const priceDiff = alt.price_diff_pct != null
      ? `${alt.price_diff_pct > 0 ? "+" : ""}${alt.price_diff_pct}%`
      : "가격차 미확인"
    return `${alt.apt_nm}${alt.umd_nm ? `(${alt.umd_nm})` : ""} · ${alt.display_score ?? "-"}점 · ${fmtManwon(alt.latest_price ?? 0)} · ${priceDiff}`
  })

  return {
    heading: "같은 예산 대안 단지",
    body: [
      `비슷한 예산에서 같이 볼 만한 대안은 ${lines.join(" / ")} 입니다.`,
      "좋은 집인가보다 더 중요한 질문은, 같은 돈으로 더 나은 선택지가 있는가입니다.",
    ].join(" "),
  }
}

export function buildExitStrategySummary({ stats, regretPct, horizons }: ExitSummaryInput) {
  const h24 = horizons.find((h) => h.horizon === 24)
  const h48 = horizons.find((h) => h.horizon === 48)
  const longScore = h48?.regionScore ?? h48?.total ?? null
  const midScore = h24?.regionScore ?? h24?.total ?? null
  const tradeCount = stats?.count ?? 0

  let exitTone = "매도 시점은 보유 2년 경과 여부와 시장 체력을 같이 봐야 합니다."
  if (tradeCount < 4) {
    exitTone = "거래량이 얇아서 보유 2년이 지나도 바로 팔릴 거라고 보면 위험합니다."
  } else if (regretPct >= 60 || (midScore != null && midScore < 0)) {
    exitTone = "보유 2년 경과 후 매도는 가능하더라도, 시장 체력이 약하면 기대한 가격으로 정리하기 어려울 수 있습니다."
  } else if (longScore != null && longScore > 0) {
    exitTone = "보유 2년 이후 출구 전략을 세우기엔 상대적으로 나은 편이지만, 실제 매도는 거래량과 호가 간격을 같이 봐야 합니다."
  }

  return {
    heading: "유동성과 출구 전략",
    body: [
      `최근 24개월 거래는 ${tradeCount}건${stats?.latestDate ? `, 최신 거래월은 ${stats.latestDate}` : ""}입니다.`,
      exitTone,
    ].join(" "),
  }
}
