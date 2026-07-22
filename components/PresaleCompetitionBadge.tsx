"use client"

// F1-S3: 시군구 청약 경쟁률 요약 배지 (PLAN_richgo_features_impl_20260717.md §F1)
// 데이터 없는 시군구는 배지 자체를 숨긴다 (0건을 "경쟁률 0"으로 표시 금지).
import { useEffect, useState } from "react"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

interface PresaleRecent {
  house_nm?: string | null
  competition_rate?: number | null
  notice_date?: string | null
}

interface PresaleSummary {
  count: number
  avg_competition_rate?: number | null
  recent_3?: PresaleRecent[]
}

export default function PresaleCompetitionBadge({ sigunguCd, regionName }: {
  sigunguCd?: string | null
  regionName?: string | null
}) {
  const [data, setData] = useState<PresaleSummary | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!sigunguCd) return
    let alive = true
    fetch(`${GATE_URL}/map/presale-competition/${sigunguCd}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d && d.count > 0) setData(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [sigunguCd])

  if (!data) return null

  return (
    <div style={{ marginTop: 8, border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 10px", background: "#F9FAFB" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}
      >
        <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>
          {regionName ? `${regionName} ` : ""}최근 1년 청약 {data.count}건
          {data.avg_competition_rate != null ? ` · 평균 경쟁률 ${data.avg_competition_rate}:1` : ""}
        </span>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && data.recent_3 && data.recent_3.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {data.recent_3.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#374151", padding: "3px 0" }}>
              <span>{r.house_nm || "-"}{r.notice_date ? ` (${r.notice_date.slice(0, 7)})` : ""}</span>
              <span style={{ fontWeight: 700 }}>{r.competition_rate != null ? `${r.competition_rate}:1` : "-"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
