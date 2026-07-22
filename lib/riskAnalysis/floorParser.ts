export function parseFloorValue(floor: string) {
  const raw = String(floor || "").trim()
  if (!raw) return null
  if (raw.includes("옥탑") || raw.includes("최상") || raw.includes("탑층")) return 999
  const match = raw.match(/\d+/)
  return match ? Number(match[0]) : null
}

export function parseFloorKind(floor: string) {
  const raw = String(floor || "").toLowerCase()
  if (/펜트|pent|ph|penthouse/.test(raw)) return "penthouse"
  if (raw.includes("옥탑") || raw.includes("최상") || raw.includes("탑층")) return "top"
  return "other"
}

export function estimateOfferRange(
  trades: { price: number; area: number; floor: string; dealDate: string }[] | null
) {
  const prices = (trades ?? []).map(t => t.price).filter(p => p > 0)
  if (prices.length === 0) {
    return {
      marketOfferMidLowPct:  0,
      marketOfferMidHighPct: 0,
      lowFloorOfferLowPct:   0,
      lowFloorOfferHighPct:  0,
      topFloorOfferLowPct:   0,
      topFloorOfferHighPct:  0,
      note: "호가 차이 추정 불가",
    }
  }

  let lowFloorCnt  = 0
  let topFloorCnt  = 0
  let penthouseCnt = 0

  for (const t of trades ?? []) {
    const floor = parseFloorValue(t.floor)
    if (floor == null) continue
    if (floor <= 3) lowFloorCnt += 1
    if (floor >= 999) {
      topFloorCnt += 1
      if (parseFloorKind(t.floor) === "penthouse") penthouseCnt += 1
    }
  }

  const spreadBase       = Math.max(4, Math.min(12, 5 + lowFloorCnt * 0.35 + topFloorCnt * 0.55))
  const penthousePremium = penthouseCnt > 0 ? 1.5 : 0
  const midLowPct        = spreadBase + penthousePremium
  const midHighPct       = Math.min(16, midLowPct + Math.max(2.5, Math.min(5, 2.5 + prices.length * 0.03)))
  const lowFloorOffsetPct = Math.max(1, Math.min(3.5, 1.2 + lowFloorCnt * 0.12))
  const topFloorOffsetPct = Math.max(1.5, Math.min(4.5, 1.8 + topFloorCnt * 0.18 + penthousePremium))

  return {
    marketOfferMidLowPct:  midLowPct,
    marketOfferMidHighPct: midHighPct,
    lowFloorOfferLowPct:   Math.max(0, midLowPct - lowFloorOffsetPct),
    lowFloorOfferHighPct:  Math.max(0, midHighPct - lowFloorOffsetPct),
    topFloorOfferLowPct:   Math.max(0, midLowPct - topFloorOffsetPct),
    topFloorOfferHighPct:  Math.max(0, midHighPct - topFloorOffsetPct),
    note: lowFloorCnt + topFloorCnt > 0
      ? penthouseCnt > 0
        ? "펜트하우스·최상층이 섞여 있으면 층별 호가 프리미엄 차이를 %로 더 크게 봐야 합니다."
        : "저층·꼭대기층 체결이 섞여 있어 층별 호가 프리미엄 차이를 %로 따로 봐야 합니다."
      : "중층 호가를 기준으로도 층별 프리미엄 차이를 %로 해석하는 편이 맞습니다.",
  }
}
