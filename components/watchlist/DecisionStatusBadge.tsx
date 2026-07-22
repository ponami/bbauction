"use client"

import { useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics"

// ─── 결정 상태 상수 ─────────────────────────────────
export const DECISION_STATUSES = [
  { key: "watching",  label: "관찰중",  color: "#6B7280", bg: "#F3F4F6" },
  { key: "buying",    label: "구매 진행중", color: "#1D4ED8", bg: "#DBEAFE" },
  { key: "paused",    label: "보류",    color: "#D97706", bg: "#FEF3C7" },
  { key: "skipped",   label: "철회",    color: "#DC2626", bg: "#FEE2E2" },
  { key: "bought",    label: "구매완료", color: "#059669", bg: "#D1FAE5" },
] as const

export type DecisionStatus = (typeof DECISION_STATUSES)[number]["key"]

function getStatusConfig(status: string) {
  return DECISION_STATUSES.find(s => s.key === status) ?? DECISION_STATUSES[0]
}

// ─── 결정 상태 뱃지 + 드롭다운 ──────────────────────
export default function DecisionStatusBadge({
  favoriteId,
  currentStatus,
  currentReason,
  onStatusChange,
}: {
  favoriteId: string
  currentStatus: string
  currentReason: string
  onStatusChange: (status: string, reason: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [reason, setReason] = useState(currentReason)
  const [saving, setSaving] = useState(false)

  const config = getStatusConfig(status)

  async function handleSave(newStatus: string) {
    setSaving(true)
    setStatus(newStatus)
    onStatusChange(newStatus, reason)
    trackAnalyticsEvent({
      eventType: "watchlist_categorized",
      funnel: "consumer",
      source: "decision_status_badge",
      meta: { decisionStatus: newStatus },
    })
    setIsOpen(false)
    setSaving(false)
  }

  return (
    <div style={{ position: "relative" }}>
      {/* 현재 상태 뱃지 (클릭하여 변경) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={saving}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 6,
          background: config.bg, border: `1px solid ${config.color}40`,
          color: config.color, fontSize: 11, fontWeight: 700,
          cursor: "pointer", transition: "all .2s",
        }}
      >
        {config.label}
        <span style={{ fontSize: 8, marginLeft: 2 }}>▼</span>
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <>
          {/* 딤 배경 */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setIsOpen(false)}
          />

          <div style={{
            position: "absolute", top: "100%", left: 0, zIndex: 100,
            marginTop: 4, minWidth: 200,
            background: "#fff", borderRadius: 10,
            border: "1px solid #E5E7EB",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "8px",
          }}>
            {/* 상태 선택 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              {DECISION_STATUSES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  style={{
                    padding: "6px 8px", borderRadius: 6, border: "none",
                    background: status === s.key ? s.bg : "transparent",
                    color: s.color, fontSize: 12, fontWeight: status === s.key ? 700 : 400,
                    cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: s.color, flexShrink: 0,
                  }} />
                  {s.label}
                </button>
              ))}
            </div>

            {/* 이유 입력 */}
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="결정 이유를 입력하세요 (선택)"
              style={{
                width: "100%", padding: "6px 8px", borderRadius: 6,
                border: "1px solid #E5E7EB", fontSize: 11,
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              maxLength={200}
            />

            {/* 저장 버튼 */}
            <button
              onClick={() => handleSave(status)}
              disabled={saving}
              style={{
                width: "100%", marginTop: 8,
                padding: "8px", borderRadius: 6, border: "none",
                background: "linear-gradient(135deg,#0A2463,#1B4FBB)",
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
