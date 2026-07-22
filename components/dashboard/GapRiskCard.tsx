"use client"

export interface GapRiskData {
  total_score: number
  level: "low" | "medium" | "high" | "critical"
  components: {
    key: string
    score: number
    label: string
    value: string
    summary: string
  }[]
  summary: string
  warning: string | null
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "http://localhost:8001"

const LEVEL_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  low:      { color: "#16A34A", bg: "#D1FAE5", label: "낮음" },
  medium:   { color: "#D97706", bg: "#FEF3C7", label: "보통" },
  high:     { color: "#EA580C", bg: "#FFF7ED", label: "높음" },
  critical: { color: "#DC2626", bg: "#FEE2E2", label: "위험" },
}

function riskGradient(score: number): string {
  if (score <= 25) return "linear-gradient(135deg,#16A34A,#15803D)"
  if (score <= 45) return "linear-gradient(135deg,#F59E0B,#D97706)"
  if (score <= 65) return "linear-gradient(135deg,#F97316,#EA580C)"
  return "linear-gradient(135deg,#DC2626,#B91C1C)"
}

export default function GapRiskCard({ data }: { data: GapRiskData }) {
  const lvl = LEVEL_CONFIG[data.level] ?? LEVEL_CONFIG.medium
  const isRisky = data.level === "high" || data.level === "critical"

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
    }}>
      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6, fontWeight: 600 }}>
          갭 리스크 컷 지수
        </div>
        <div style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center",
          width: 80, height: 80, borderRadius: "50%",
          background: riskGradient(data.total_score),
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
        background: isRisky ? "#FEF2F2" : "#F8FAFC",
        border: `1px solid ${isRisky ? "#FECACA" : "#E2E8F0"}`,
        marginBottom: 16, fontSize: 13, color: isRisky ? "#991B1B" : "#374151",
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
                background: c.score >= 65 ? "#DC2626" : c.score >= 35 ? "#F59E0B" : "#16A34A",
                borderRadius: 3, transition: "width .5s",
              }} />
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{c.summary}</div>
          </div>
        ))}
      </div>

      {/* 경고 문구 */}
      {data.warning && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "#FEF2F2", border: "1px solid #FECACA",
          fontSize: 12, color: "#991B1B", fontWeight: 600, lineHeight: 1.5,
        }}>
          ⚠️ {data.warning}
        </div>
      )}
    </div>
  )
}

export async function fetchGapRisk(aptId: number): Promise<GapRiskData | null> {
  try {
    const res = await fetch(`${GATE_URL}/apt/gap-risk?apt_id=${aptId}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}
