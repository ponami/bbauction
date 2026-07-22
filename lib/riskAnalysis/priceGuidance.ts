import type { estimateOfferRange } from "./floorParser"

export function fmtManwon(value: number) {
  if (!value) return "-"
  return value >= 10000 ? `${(value / 10000).toFixed(1)}억` : `${value.toLocaleString("ko-KR")}만`
}

export function buildPriceGuidance(
  stats: { avg: number; min: number; max: number; count: number; latest: number; latestDate: string } | null,
  safetyScore: number,
  regretPct: number,
  offerRange: ReturnType<typeof estimateOfferRange>,
) {
  const currentAvg = stats?.avg ?? 0
  const latest = stats?.latest ?? currentAvg
  const base = currentAvg > 0 ? currentAvg : latest
  const discountPct = Math.max(
    4,
    Math.min(18, Math.round(4 + regretPct * 0.12 + Math.max(0, 70 - safetyScore) * 0.08))
  )
  const tradeBasedTarget = base > 0 ? Math.round(base * (100 - Math.min(discountPct, 8)) / 100) : 0
  const offerBasedTarget = offerRange.marketOfferMidLowPct > 0 ? Math.round(base * (100 - offerRange.marketOfferMidLowPct) / 100) : 0
  const floor = base > 0 ? Math.round(base * 0.95) : 0
  const targetPrice = Math.max(tradeBasedTarget, offerBasedTarget, floor)
  return { currentAvg, latest, targetPrice, discountPct, offerRange }
}
