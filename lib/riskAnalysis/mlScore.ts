const ML_ENGINE_URL = process.env.ML_ENGINE_URL || "http://localhost:8000"
const GATE_URL      = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"

// 게이트 서버에서 apt_id 기반 oreulji_score 조회
export async function fetchOreuljiScore(aptId: number): Promise<{ oreuljiScore: number; finalScore: number } | null> {
  try {
    const res = await fetch(`${GATE_URL}/apt/${aptId}?horizon=24`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const oreuljiScore = typeof data?.oreulji_score === "number" ? data.oreulji_score : null
    const finalScore   = typeof data?.final_score   === "number" ? data.final_score   : oreuljiScore
    if (oreuljiScore === null) return null
    return { oreuljiScore, finalScore }
  } catch {
    return null
  }
}

const SIDO_NAMES: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "36": "세종", "41": "경기", "43": "충북",
  "44": "충남", "46": "전남", "47": "경북", "48": "경남", "50": "제주",
}

export async function fetchMlScore(lawdCd: string) {
  try {
    const res = await fetch(`${ML_ENGINE_URL}/market/score?lawd_cd=${lawdCd}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const raw = await res.json()
    const results: { horizon: number; total: number; sido_scores: Record<string, number>; dir_acc: number }[] = raw.results ?? []
    const sidoCd = lawdCd.slice(0, 2)

    const DISPLAY_HORIZONS = [12, 24, 36]
    const horizons = results
      .filter(r => DISPLAY_HORIZONS.includes(r.horizon))
      .map(r => ({
        horizon:     r.horizon,
        total:       r.total,
        regionScore: r.sido_scores?.[sidoCd] ?? null,
        dirAcc:      r.dir_acc,
      }))

    const weights: Record<number, number> = { 12: 0.20, 24: 0.35, 36: 0.45 }
    let weightedSum = 0, totalWeight = 0
    for (const h of horizons) {
      const w     = weights[h.horizon] ?? 0
      const score = h.regionScore ?? h.total
      weightedSum  += score * w
      totalWeight  += w
    }
    const mlDirectionScore = totalWeight > 0 ? weightedSum / totalWeight : 0
    const safetyScore = Math.round(Math.max(15, Math.min(95, (mlDirectionScore + 10) / 20 * 80 + 15)))

    return {
      safetyScore,
      mlDirectionScore,
      horizons,
      regionName: SIDO_NAMES[sidoCd] ?? "",
      timestamp:  raw.timestamp ?? "",
    }
  } catch {
    return null
  }
}
