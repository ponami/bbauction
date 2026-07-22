// budgetFilter.ts — 경매 예산 필터 로직

export const LS_AUCTION_BUDGET_EOK = "orulzi_auction_budget_eok"
export const LS_AUCTION_HIDE_HIGH = "orulzi_auction_hide_high"
export const LS_AUCTION_DELTA_PCT = "orulzi_auction_delta_pct"
export const DEFAULT_BUDGET_DELTA = 20

export function cashNeedApprox(minBidManwon: number, deltaPct: number = DEFAULT_BUDGET_DELTA): number {
  return Math.round(minBidManwon * (1 + deltaPct / 100))
}

export function formatManwonShort(manwon: number): string {
  if (manwon >= 10000) return `${(manwon / 10000).toFixed(1)}억`
  return `${manwon.toLocaleString()}만`
}

export function eokToManwon(eok: number): number {
  return eok * 10000
}

export type BudgetBandResult = {
  tag: "under" | "in" | "over"
  label: string
  inBand: boolean
  overPct: number | null
}

export function budgetBand(minBidManwon: number, budgetManwon: number | null, delta: number): BudgetBandResult {
  if (!budgetManwon || budgetManwon <= 0) {
    return { tag: "in", label: "예산 미설정", inBand: true, overPct: null }
  }
  const upper = budgetManwon * (1 + delta / 100)
  const lower = budgetManwon * (1 - delta / 100)
  if (minBidManwon < lower) return { tag: "under", label: "예산 미달", inBand: false, overPct: null }
  if (minBidManwon > upper) {
    const overPct = ((minBidManwon - budgetManwon) / budgetManwon) * 100
    return { tag: "over", label: "예산 초과", inBand: false, overPct }
  }
  return { tag: "in", label: "예산 범위", inBand: true, overPct: null }
}

export function filterByBudgetBand<T extends { min_bid_price: number }>(
  items: T[],
  budgetManwon: number | null,
  deltaPct: number = DEFAULT_BUDGET_DELTA,
): T[] {
  if (!budgetManwon) return items
  const maxManwon = budgetManwon * (1 + deltaPct / 100)
  return items.filter((it) => it.min_bid_price <= maxManwon)
}

export function isHighRiskSignal(signalLevel?: string | null, signal?: string | null): boolean {
  return signalLevel === "고급" || signal === "🔴"
}

export function signalRank(signalLevel?: string | null, signal?: string | null): number {
  if (signalLevel === "고급" || signal === "🔴") return 100
  if (signalLevel === "중급" || signal === "🟡") return 50
  if (signalLevel === "초급" || signal === "🟢") return 20
  return 0
}

export function recommendReason(
  item: { discount_vs_appraisal_pct?: number | null; fail_count: number; kind: string },
  _budgetManwon?: number | null,
  _delta?: number,
): string {
  const disc = item.discount_vs_appraisal_pct ?? 0
  if (disc >= 40) return "높은 할인율"
  if (item.fail_count >= 2 && item.fail_count <= 3) return "유찰 후 저가 입찰 기회"
  if (disc >= 20 && item.fail_count <= 1) return "안정적 할인"
  return "일반 물건"
}

export function isWishlisted(id: number): boolean {
  if (typeof window === "undefined") return false
  const raw = localStorage.getItem("orulzi_auction_wishlist")
  if (!raw) return false
  try { return (JSON.parse(raw) as number[]).includes(id) } catch { return false }
}

export function loadWishlistIds(): number[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem("orulzi_auction_wishlist")
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

export function toggleWishlist(id: number): boolean {
  if (typeof window === "undefined") return false
  const raw = localStorage.getItem("orulzi_auction_wishlist")
  let list: number[] = []
  try { list = raw ? JSON.parse(raw) : [] } catch { list = [] }
  const idx = list.indexOf(id)
  if (idx >= 0) { list.splice(idx, 1); localStorage.setItem("orulzi_auction_wishlist", JSON.stringify(list)); return false }
  else { list.push(id); localStorage.setItem("orulzi_auction_wishlist", JSON.stringify(list)); return true }
}
