import type { TradeRecord } from "@/lib/types"

export function normalizeComparableAptName(name: string) {
  return String(name)
    .replace(/\s+/g, "")
    .replace(/아파트|APT|apt/gi, "")
    .replace(/[·.\-_/()]/g, "")
    .replace(/단지$/g, "")
    .toLowerCase()
}

export function normalizeComparableUmdName(name: string) {
  return String(name).replace(/\s+/g, "").toLowerCase()
}

export function buildReferenceTrades(
  trades: TradeRecord[],
  aptName: string | undefined,
  areaM2: number | null,
  umdNm: string | null,
) {
  if (!areaM2 || trades.length === 0) {
    return { trades: [] as TradeRecord[], scope: "none" as const, note: null as string | null }
  }

  const targetName = normalizeComparableAptName(aptName || "")
  const targetUmd = normalizeComparableUmdName(umdNm || "")
  const areaTolerance = areaM2 >= 100 ? 10 : 5

  const comparable = trades.filter((trade) => {
    const tradeArea = parseFloat(trade.area || "0")
    if (!tradeArea || Math.abs(tradeArea - areaM2) > areaTolerance) return false
    if (targetName && normalizeComparableAptName(trade.aptName) === targetName) return false
    return true
  })

  const umdMatches = targetUmd
    ? comparable.filter((trade) => normalizeComparableUmdName(trade.dong) === targetUmd)
    : []
  const selected = umdMatches.length > 0 ? umdMatches : comparable
  const scope = umdMatches.length > 0 ? "umd" as const : comparable.length > 0 ? "lawd" as const : "none" as const
  const sorted = [...selected].sort((a, b) => {
    const da = new Date(`${a.dealDate}-01`).getTime()
    const db = new Date(`${b.dealDate}-01`).getTime()
    return db - da
  })

  return {
    trades: sorted.slice(0, 5),
    scope,
    note: scope === "umd"
      ? `같은 법정동 · 전용 ${Math.round(areaM2)}㎡ ±${areaTolerance}㎡`
      : scope === "lawd"
      ? `같은 시군구 · 전용 ${Math.round(areaM2)}㎡ ±${areaTolerance}㎡`
      : null,
  }
}
