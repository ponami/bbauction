"use client"

import { useEffect, useState } from "react"
import { leadStatusLabel, leadStatusTone, normalizeLeadTags, type LeadSummary, type LeadStatus } from "@/lib/leads"

export default function LeadDetail({
  lead,
  onSave,
}: {
  lead: LeadSummary | null
  onSave: (payload: { id: string; name: string; phone: string; status: LeadStatus; tags: string[]; notes: string; lastReportPurpose: string }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState<LeadStatus>("new")
  const [tags, setTags] = useState("")
  const [notes, setNotes] = useState("")
  const [reportPurpose, setReportPurpose] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(lead?.name ?? "")
    setPhone(lead?.phone ?? "")
    setStatus(lead?.status ?? "new")
    setTags((lead?.tags ?? []).join(", "))
    setNotes(lead?.notes ?? "")
    setReportPurpose(lead?.lastReportPurpose ?? "")
  }, [lead])

  if (!lead) {
    return (
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>리드를 선택하세요</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
          좌측 목록에서 고객을 선택하면 메모, 태그, 최근 조회 단지와
          <br />
          공유 이력을 한 화면에서 관리할 수 있습니다.
        </div>
      </div>
    )
  }

  const statusTone = leadStatusTone(status)

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{lead.name}</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
            최근 공유: {lead.lastSharedAt ? new Date(lead.lastSharedAt).toLocaleString("ko-KR") : "없음"}
          </div>
        </div>
        <span style={{ background: statusTone.bg, color: statusTone.text, border: `1px solid ${statusTone.border}`, borderRadius: 9999, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>
          {leadStatusLabel(status)}
        </span>
      </div>

      <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="고객명" style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none" }} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처" style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none" }} />
          </div>
          <input value={reportPurpose} onChange={(e) => setReportPurpose(e.target.value)} placeholder="리포트 목적" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="태그를 쉼표로 입력 (예: 신혼부부, 첫매수, 신축선호)" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(["new", "reviewing", "contract_soon"] as LeadStatus[]).map((option) => {
            const tone = leadStatusTone(option)
            const active = status === option
            return (
              <button
                key={option}
                onClick={() => setStatus(option)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: active ? `1px solid ${tone.border}` : "1px solid #E5E7EB",
                  background: active ? tone.bg : "#fff",
                  color: active ? tone.text : "#4B5563",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {leadStatusLabel(option)}
              </button>
            )
          })}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="후속 상담 메모를 남겨두세요"
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 13,
            outline: "none", boxSizing: "border-box", resize: "vertical",
          }}
        />

        <button
          onClick={async () => {
            setSaving(true)
            try {
              await onSave({
                id: lead.id,
                name: name.trim() || lead.name,
                phone: phone.trim(),
                status,
                tags: normalizeLeadTags(tags),
                notes,
                lastReportPurpose: reportPurpose.trim(),
              })
            } finally {
              setSaving(false)
            }
          }}
          style={{ border: "none", borderRadius: 10, background: "#16A34A", color: "#fff", padding: "12px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
        >
          {saving ? "저장중..." : "리드 정보 저장"}
        </button>

        <EventSection title="최근 공유 리포트" empty="아직 보낸 공유 리포트가 없습니다." items={lead.recentSharedReports} />
        <EventSection title="최근 조회 단지" empty="아직 고객 조회 기록이 없습니다." items={lead.recentViewedApts} />
        <EventSection title="최근 비교 단지" empty="아직 비교 이력이 없습니다." items={lead.recentComparedApts} />
      </div>
    </div>
  )
}

function EventSection({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: LeadSummary["recentSharedReports"]
}) {
  return (
    <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 10 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{empty}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item) => (
            <div key={item.id} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                {item.aptName || "기록 없음"}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
                {[item.address, item.payload.reportPurpose].filter(Boolean).join(" · ") || "상세 목적 미입력"}
              </div>
              {item.payload.comparedApts?.length ? (
                <div style={{ fontSize: 11, color: "#4B5563", marginTop: 6 }}>
                  비교 후보: {item.payload.comparedApts.map((apt) => apt.aptName).join(", ")}
                </div>
              ) : null}
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6 }}>
                {new Date(item.createdAt).toLocaleString("ko-KR")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
