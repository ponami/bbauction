"use client"

import { leadStatusLabel, leadStatusTone, type LeadSummary } from "@/lib/leads"

export default function LeadList({
  leads,
  selectedLeadId,
  onSelect,
}: {
  leads: LeadSummary[]
  selectedLeadId: string | null
  onSelect: (leadId: string) => void
}) {
  if (leads.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🧑‍💼</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>아직 저장된 고객 리드가 없습니다</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
          공유 링크를 보내면 고객이 자동으로 쌓이고,
          <br />
          이후 조회·비교 이력을 이 탭에서 이어서 볼 수 있습니다.
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>👥 고객 리드</div>
      </div>
      <div>
        {leads.map((lead, index) => {
          const statusTone = leadStatusTone(lead.status)
          const active = selectedLeadId === lead.id
          return (
            <button
              key={lead.id}
              onClick={() => onSelect(lead.id)}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                borderBottom: index < leads.length - 1 ? "1px solid #F3F4F6" : "none",
                background: active ? "#F8FAFC" : "#fff",
                padding: "14px 18px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{lead.name}</div>
                <span style={{
                  background: statusTone.bg,
                  color: statusTone.text,
                  border: `1px solid ${statusTone.border}`,
                  borderRadius: 9999,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}>
                  {leadStatusLabel(lead.status)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.6, marginBottom: 6 }}>
                {[lead.phone, lead.lastReportPurpose, lead.lastSharedAptName].filter(Boolean).join(" · ") || "공유 링크로 유입된 고객"}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {lead.tags.slice(0, 3).map((tag) => (
                  <span key={tag} style={{ background: "#EEF2FF", color: "#4338CA", borderRadius: 9999, padding: "3px 8px", fontSize: 10, fontWeight: 700 }}>
                    #{tag}
                  </span>
                ))}
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                  공유 {lead.recentSharedReports.length} · 조회 {lead.recentViewedApts.length} · 비교 {lead.recentComparedApts.length}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
