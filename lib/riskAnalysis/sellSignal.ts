// 매도 타이밍 시그널 — ML + AI 카테고리 점수 종합 판단
// 순수 함수: 외부 의존 없음

export type SignalType = "sell" | "hold" | "buy_opportunity"

export interface SellSignal {
  signal:     SignalType
  emoji:      string
  label:      string
  confidence: number   // 0~100 — 지표들이 얼마나 일관되게 같은 방향을 가리키는지
  reason:     string   // 한 줄 근거
  breakdown: {
    oreuljiScore:     number | null
    mlDirectionScore: number | null
    regretPct:        number
    catAvg:           number | null
    horizons12m:      number | null
    horizons24m:      number | null
  }
}

interface SignalInput {
  oreuljiScore:     number
  mlDirectionScore: number | null
  regretPct:        number
  catAvg:           number | null
  horizons:         { horizon: number; total: number; regionScore: number | null }[]
}

function getHorizonScore(horizons: SignalInput["horizons"], months: number): number | null {
  const h = horizons.find(h => h.horizon === months)
  return h ? (h.regionScore ?? h.total) : null
}

export function computeSellSignal(input: SignalInput): SellSignal {
  const { oreuljiScore, mlDirectionScore, regretPct, catAvg, horizons } = input

  const h12 = getHorizonScore(horizons, 12)
  const h24 = getHorizonScore(horizons, 24)

  // ── 각 지표를 방향별 점수로 환산 (-1 하락 / 0 중립 / +1 상승) ──
  const indicators: { direction: number; weight: number; label: string }[] = [
    // 오를지 점수 (50 기준)
    {
      direction: oreuljiScore >= 65 ? 1 : oreuljiScore <= 45 ? -1 : 0,
      weight:    0.30,
      label:     `오를지 ${oreuljiScore}점`,
    },
    // ML 방향성 점수 (0 기준)
    {
      direction: mlDirectionScore != null ? (mlDirectionScore > 0.5 ? 1 : mlDirectionScore < -0.5 ? -1 : 0) : 0,
      weight:    0.25,
      label:     `오를지방향성 ${mlDirectionScore?.toFixed(2) ?? "-"}`,
    },
    // 후회확률 (40 기준)
    {
      direction: regretPct <= 40 ? 1 : regretPct >= 65 ? -1 : 0,
      weight:    0.20,
      label:     `후회확률 ${regretPct}%`,
    },
    // AI 카테고리 평균 (55 기준)
    {
      direction: catAvg != null ? (catAvg >= 65 ? 1 : catAvg <= 45 ? -1 : 0) : 0,
      weight:    0.15,
      label:     `AI카테고리 ${catAvg ?? "-"}점`,
    },
    // 12개월 방향 (0 기준)
    {
      direction: h12 != null ? (h12 > 0.3 ? 1 : h12 < -0.3 ? -1 : 0) : 0,
      weight:    0.10,
      label:     `12M ${h12?.toFixed(2) ?? "-"}`,
    },
  ]

  const weightedSum = indicators.reduce((sum, i) => sum + i.direction * i.weight, 0)

  // ── 시그널 결정 ──────────────────────────────────────────────
  let signal: SignalType
  const ml12down = h12 != null && h12 < -0.3
  const ml24down = h24 != null && h24 < -0.3

  if (oreuljiScore <= 45 && (regretPct >= 65 || (ml12down && ml24down))) {
    signal = "sell"
  } else if (oreuljiScore >= 70 && regretPct <= 35 && (mlDirectionScore == null || mlDirectionScore > 0)) {
    signal = "buy_opportunity"
  } else {
    signal = "hold"
  }

  // ── 신뢰도: 지표들이 시그널 방향과 일치하는 정도 ──────────────
  const signalDir = signal === "sell" ? -1 : signal === "buy_opportunity" ? 1 : 0
  let alignedWeight = 0
  for (const ind of indicators) {
    if (signalDir !== 0 && ind.direction === signalDir) alignedWeight += ind.weight
  }
  const confidence = signal === "hold"
    ? Math.round(50 + Math.abs(weightedSum) * 30)
    : Math.round(50 + alignedWeight * 50)

  // ── 라벨 ─────────────────────────────────────────────────────
  const META: Record<SignalType, { emoji: string; label: string }> = {
    sell:            { emoji: "🔴", label: "매도 추천" },
    hold:            { emoji: "🟡", label: "보유 유지" },
    buy_opportunity: { emoji: "🟢", label: "매수 기회" },
  }

  // ── 한 줄 근거 ────────────────────────────────────────────────
  const reasonParts: string[] = []
  if (signal === "sell") {
    reasonParts.push(`오를지 ${oreuljiScore}점(위험)`)
    if (ml12down && ml24down) reasonParts.push("오를지 엔진 12·24개월 하락 전망")
    if (regretPct >= 65)      reasonParts.push(`후회확률 ${regretPct}%`)
  } else if (signal === "buy_opportunity") {
    reasonParts.push(`오를지 ${oreuljiScore}점(안전)`)
    if (regretPct <= 35)      reasonParts.push(`후회확률 ${regretPct}%`)
    if (catAvg && catAvg >= 65) reasonParts.push(`AI호재 ${catAvg}점`)
  } else {
    const ups   = indicators.filter(i => i.direction === 1).map(i => i.label)
    const downs = indicators.filter(i => i.direction === -1).map(i => i.label)
    if (ups.length)   reasonParts.push(`긍정: ${ups.join(", ")}`)
    if (downs.length) reasonParts.push(`부정: ${downs.join(", ")}`)
  }

  return {
    signal,
    ...META[signal],
    confidence: Math.min(95, Math.max(30, confidence)),
    reason: reasonParts.join(" · ") || "지표 혼재",
    breakdown: {
      oreuljiScore,
      mlDirectionScore: mlDirectionScore ?? null,
      regretPct,
      catAvg:      catAvg ?? null,
      horizons12m: h12,
      horizons24m: h24,
    },
  }
}
