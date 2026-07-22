"use client"

export interface TradeupScoreData {
  total_score: number
  level: "excellent" | "good" | "fair" | "caution" | "poor"
  components: {
    key: string
    score: number
    label: string
    value: string
    summary: string
  }[]
  summary: string
  recommendation: string
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "http://localhost:8001"

const LEVEL_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  excellent: { color: "#16A34A", bg: "#D1FAE5", label: "매우 좋음" },
  good:      { color: "#059669", bg: "#D1FAE5", label: "좋음" },
  fair:      { color: "#D97706", bg: "#FEF3C7", label: "보통" },
  caution:   { color: "#EA580C", bg: "#FFF7ED", label: "주의" },
  poor:      { color: "#DC2626", bg: "#FEE2E2", label: "나쁨" },
}

function scoreGradient(score: number): string {
  if (score >= 80) return "linear-gradient(135deg,#16A34A,#15803D)"
  if (score >= 65) return "linear-gradient(135deg,#059669,#16A34A)"
  if (score >= 50) return "linear-gradient(135deg,#F59E0B,#D97706)"
  if (score >= 35) return "linear-gradient(135deg,#F97316,#EA580C)"
  return "linear-gradient(135deg,#DC2626,#B91C1C)"
}

export default function TradeupScoreCard({ data }: { data: TradeupScoreData }) {
  const lvl = LEVEL_CONFIG[data.level] ?? LEVEL_CONFIG.fair

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
    }}>
      {/* 헤더: 점수 게이지 */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6, fontWeight: 600 }}>
          갈아타기 타이밍 점수
        </div>
        <div style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center",
          width: 80, height: 80, borderRadius: "50%",
          background: scoreGradient(data.total_score),
          color: "#fff", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)", marginBottom: 8,
        }}>
          <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{data.total_score}</span>
          <span style={{ fontSize: 9, opacity: 0.75 }}>/100</span>
        </div>
        <span style={{
          display: "inline-block", padding: "3px 12px", borderRadius: 9999,
          background: lvl.bg, color: lvl.color, fontSize: 12, fontWeight: 700,
        }}>
          {lvl.label}
        </span>
      </div>

      {/* 요약 */}
      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "#F8FAFC", border: "1px solid #E2E8F0",
        marginBottom: 16, fontSize: 13, color: "#374151",
        fontWeight: 600, textAlign: "center",
      }}>
        {data.summary}
      </div>

      {/* 구성 요소 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {data.components.map((c) => (
          <div key={c.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{c.label}</span>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>{c.value}</span>
            </div>
            <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                width: `${c.score}%`, height: "100%",
                background: c.score >= 70 ? "#16A34A" : c.score >= 40 ? "#F59E0B" : "#DC2626",
                borderRadius: 3, transition: "width .5s",
              }} />
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{c.summary}</div>
          </div>
        ))}
      </div>

      {/* 권장 액션 */}
      <div style={{
        padding: "10px 14px", borderRadius: 8,
        background: "#FFFBEB", border: "1px solid #FDE68A",
        fontSize: 12, color: "#92400E", fontWeight: 600, lineHeight: 1.5,
      }}>
        💡 {data.recommendation}
      </div>
    </div>
  )
}

/** TradeupScore 데이터를 Gate API에서 불러오는 훅 */
export async function fetchTradeupScore(
  targetAptId: number,
  ownedAptId: number,
): Promise<TradeupScoreData | null> {
  try {
    const res = await fetch(`${GATE_URL}/apt/tradeup-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_apt_id: targetAptId, owned_apt_id: ownedAptId }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}
