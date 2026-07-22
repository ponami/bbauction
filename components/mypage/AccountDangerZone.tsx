"use client"

import { useState } from "react"

interface AccountDangerZoneProps {
  userEmail: string
  disabled?: boolean
  onDeleted: () => Promise<void> | void
}

export default function AccountDangerZone({ userEmail, disabled = false, onDeleted }: AccountDangerZoneProps) {
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDeleteAccount() {
    if (disabled || loading) return
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "계정을 삭제하지 못했습니다")
      }

      await onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "계정을 삭제하지 못했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #FECACA", padding: "16px 18px", marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#B91C1C", marginBottom: 6 }}>계정 삭제</div>
      <div style={{ fontSize: 12, color: "#7F1D1D", lineHeight: 1.7, marginBottom: 12 }}>
        <div>{userEmail} 계정과 연결된 프로필, 저장 리포트, 결제 권한, 즐겨찾기, 알림 기록을 삭제합니다.</div>
        <div>삭제 후에는 복구할 수 없습니다. 계속하려면 아래 입력칸에 <strong>삭제</strong>를 입력하세요.</div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder='확인 문구 "삭제" 입력'
          disabled={disabled || loading}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #FCA5A5",
            fontSize: 13,
            outline: "none",
            background: disabled ? "#F9FAFB" : "#FFF",
          }}
        />
        <button
          onClick={handleDeleteAccount}
          disabled={disabled || loading || confirmText !== "삭제"}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: disabled || loading || confirmText !== "삭제" ? "#E5E7EB" : "#DC2626",
            color: disabled || loading || confirmText !== "삭제" ? "#9CA3AF" : "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: disabled || loading || confirmText !== "삭제" ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "삭제 중..." : "계정 삭제"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#DC2626", marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  )
}
