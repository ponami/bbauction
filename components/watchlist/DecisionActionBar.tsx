"use client"

import { useState } from "react"
import { DECISION_STATUSES } from "./DecisionStatusBadge"
import { trackAnalyticsEvent } from "@/lib/analytics"

// ─── 결정 액션 바 ────────────────────────────────────
// 분석 완료 후 "내 결정 기록하기" 버튼
export default function DecisionActionBar({
  aptName,
  address,
  lawdCd,
  favoriteId,
  currentStatus,
  currentReason,
  onSaved,
}: {
  aptName: string
  address: string
  lawdCd: string
  favoriteId?: string | null
  currentStatus?: string
  currentReason?: string
  onSaved?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState(currentStatus ?? "watching")
  const [reason, setReason] = useState(currentReason ?? "")
  const [saving, setSaving] = useState(false)

  const isAlreadyFavorite = !!favoriteId

  async function handleSave() {
    setSaving(true)
    try {
      if (isAlreadyFavorite) {
        // 기존 즐겨찾기 — 결정 상태만 업데이트
        await fetch(`/api/favorites?id=${favoriteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionStatus: status, decisionReason: reason }),
        })
      } else {
        // 새 즐겨찾기 — 먼저 추가 후 결정 상태 업데이트
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aptName,
            address,
            lawdCd,
            dealTypes: ["매매", "전세"],
            category: status === "bought" ? "general" : "trade_up",
            decisionStatus: status,
            decisionReason: reason,
          }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
      }

      trackAnalyticsEvent({
        eventType: "decision_recorded",
        funnel: "consumer",
        source: "decision_action_bar",
        aptName,
        meta: { decisionStatus: status },
      })

      setIsOpen(false)
      onSaved?.()
    } catch {
      // 무시
    } finally {
      setSaving(false)
    }
  }

  const statusConfig = DECISION_STATUSES.find(s => s.key === status) ?? DECISION_STATUSES[0]

  return (
    <div>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: "100%",
            padding: "14px 20px", borderRadius: 12,
            border: "2px dashed #CBD5E1",
            background: "#F8FAFC",
            color: "#475569", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all .2s",
          }}
        >
          📝 내 결정 기록하기
        </button>
      ) : (
        <div style={{
          padding: 16, borderRadius: 12,
          border: "1px solid #E2E8F0",
          background: "#fff",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          {/* 상태 선택 */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
            이 아파트에 대한 내 결정
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {DECISION_STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: "none",
                  background: status === s.key ? s.bg : "#F1F5F9",
                  color: s.color, fontSize: 12, fontWeight: status === s.key ? 700 : 500,
                  cursor: "pointer",
                  outline: status === s.key ? `2px solid ${s.color}` : "none",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* 이유 입력 */}
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="결정 이유를 간단히 적어주세요 (예: 전세가율이 부담돼서 보류)"
            style={{
              width: "100%", minHeight: 60,
              padding: "10px 12px", borderRadius: 8,
              border: "1px solid #E2E8F0", fontSize: 12,
              outline: "none", resize: "vertical",
              boxSizing: "border-box", fontFamily: "inherit",
              lineHeight: 1.6,
            }}
            maxLength={500}
          />

          {/* 액션 버튼 */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #E2E8F0",
                background: "#fff", color: "#64748B", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: "10px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#0A2463,#1B4FBB)",
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", opacity: saving ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              {saving ? "저장 중..." : "기록 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
