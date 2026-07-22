"use client"

import { useEffect, useState } from "react"

interface SupplyRow {
  year: number
  units: number
  apt_count: number
  risk_level: "high" | "mid" | "low"
  vs_avg_pct: number
}

interface SupplyRiskData {
  risk_level: "high" | "mid" | "low" | "unknown"
  summary: string
  sigungu_nm: string
  current_year?: number
  has_future_supply?: boolean
  chart: SupplyRow[]
}

const RISK_META = {
  high:    { label: "공급 과잉",  color: "#DC2626", bg: "#FEE2E2", dot: "🔴" },
  mid:     { label: "공급 안정",  color: "#D97706", bg: "#FEF3C7", dot: "🟡" },
  low:     { label: "공급 희소",  color: "#16A34A", bg: "#DCFCE7", dot: "🟢" },
  unknown: { label: "데이터 없음", color: "#9CA3AF", bg: "#F3F4F6", dot: "⚪" },
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

export function SupplyRisk({ aptId }: { aptId: number | null }) {
  const [data, setData]       = useState<SupplyRiskData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!aptId) return
    setLoading(true)
    fetch(`${GATE_URL}/apt/${aptId}/supply-risk`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [aptId])

  if (!aptId || loading) return null
  if (!data || data.risk_level === "unknown") return null

  const meta = RISK_META[data.risk_level]

  const currentYear = data.current_year ?? new Date().getFullYear()
  const futureRows = data.chart.filter(r => r.year >= currentYear)
  const recentWindowStart = currentYear - 2
  const chartRows = futureRows.length > 0
    ? data.chart.filter(r => r.year >= recentWindowStart)
    : data.chart.filter(r => r.year >= 2020)
  const maxUnits  = Math.max(...chartRows.map(r => r.units), 1)

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E5E7EB",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      marginBottom: 16,
    }}>
      {/* 헤더 */}
      <div style={{
        background: meta.bg,
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${meta.color}22`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{meta.dot}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>공급 리스크</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: meta.color,
            background: "#fff", borderRadius: 9999,
            padding: "2px 8px", border: `1px solid ${meta.color}44`,
          }}>{meta.label}</span>
        </div>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{data.sigungu_nm} 기준</span>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* 요약 문구 */}
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "0 0 14px" }}>
          {data.summary}
        </p>

        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 8 }}>
          {futureRows.length > 0 ? `최근 2년 + 향후 입주 예정 물량` : "최근 입주 물량"}
        </div>

        {/* 연도별 바 차트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {chartRows.map(row => {
            const rm = RISK_META[row.risk_level] ?? RISK_META.mid
            const barPct = Math.round((row.units / maxUnits) * 100)
            return (
              <div key={row.year} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#6B7280", width: 36, flexShrink: 0 }}>
                  {row.year}
                </span>
                <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 4, height: 14, position: "relative", overflow: "hidden" }}>
                  <div style={{
                    width: `${barPct}%`, height: "100%",
                    background: rm.color + "88",
                    borderRadius: 4,
                    transition: "width 0.6s ease",
                  }} />
                </div>
                <span style={{ fontSize: 11, color: rm.color, fontWeight: 600, width: 60, flexShrink: 0, textAlign: "right" }}>
                  {row.units.toLocaleString()}세대
                </span>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 10, marginBottom: 0 }}>
          * 미래 데이터가 있으면 최근 2년 실적과 향후 입주예정 물량을 함께 표시합니다. 최근 2년 구간은 보유 2년 경과 매물 출회 가능성을 함께 보는 참고 구간입니다.
        </p>
      </div>
    </div>
  )
}
