"use client"

import { useEffect, useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics"

interface AlertItem {
  id: string
  aptName: string
  address: string
  type: "trade" | "score"
  dealType?: string
  area?: number
  floor?: string
  price?: number
  monthlyRent?: number
  dealYear?: string
  dealMonth?: string
  dealDay?: string
  scoreBefore?: number
  scoreAfter?: number
  actionType?: string
  actionMessage?: string
  isRead: boolean
  createdAt: string
}

function formatPrice(price: number): string {
  if (price >= 10000) {
    const 억 = Math.floor(price / 10000)
    const 천 = price % 10000
    if (천 === 0) return `${억}억`
    if (천 < 1000) return `${억}억 ${천}만`
    return `${억}억 ${Math.floor(천 / 1000)}천만`
  }
  return `${price}만`
}

function AlertCard({ alert, onRead }: { alert: AlertItem; onRead: (id: string) => void }) {
  const date = alert.dealYear
    ? `${alert.dealYear}.${alert.dealMonth}.${alert.dealDay}`
    : new Date(alert.createdAt).toLocaleDateString("ko-KR")

  const hasAction = !!alert.actionType
  const isDownturn = (alert.scoreAfter ?? 0) < (alert.scoreBefore ?? 0)

  function handleActionClick() {
    trackAnalyticsEvent({
      eventType: "alert_action_click",
      funnel: "consumer",
      source: "alert_drawer",
      aptName: alert.aptName,
      meta: { actionType: alert.actionType ?? "", alertType: alert.type },
    })
  }

  return (
    <div
      onClick={() => {
        if (!alert.isRead) onRead(alert.id)
        if (hasAction) handleActionClick()
      }}
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid #F3F4F6",
        background: alert.isRead
          ? "#fff"
          : hasAction
            ? "#FFFBEB"  // 행동 권고는 노란 배경
            : "#F0FDF4",
        cursor: alert.isRead && !hasAction ? "default" : "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>
          {hasAction ? "🔔" : alert.type === "trade" ? "🏠" : "📊"}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{alert.aptName}</span>
            <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>{date}</span>
          </div>

          {/* 행동 권고 뱃지 */}
          {hasAction && (
            <div style={{
              display: "inline-block", marginBottom: 4,
              padding: "2px 8px", borderRadius: 4,
              background: "#FEF3C7", color: "#92400E",
              fontSize: 10, fontWeight: 700,
            }}>
              ⚡ 행동 권고
            </div>
          )}

          {alert.type === "trade" && (
            <div style={{ fontSize: 12, color: "#374151" }}>
              <span style={{
                display: "inline-block", marginRight: 6,
                background: alert.dealType === "매매" ? "#DBEAFE" : "#FEF9C3",
                color: alert.dealType === "매매" ? "#1D4ED8" : "#92400E",
                padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
              }}>{alert.dealType}</span>
              {alert.area && <span>{Math.round(alert.area / 3.3058)}평 </span>}
              {alert.floor && <span>{alert.floor}층 </span>}
              {alert.price && <span style={{ fontWeight: 700, color: "#111827" }}>{formatPrice(alert.price)}</span>}
              {alert.monthlyRent ? <span> / 월 {alert.monthlyRent}만</span> : null}
            </div>
          )}

          {alert.type === "score" && (
            <div style={{ fontSize: 12, color: "#374151" }}>
              오를지 점수{" "}
              <span style={{ fontWeight: 700 }}>{alert.scoreBefore}점</span>
              {" → "}
              <span style={{
                fontWeight: 700,
                color: (alert.scoreAfter ?? 0) > (alert.scoreBefore ?? 0) ? "#16A34A" : "#DC2626",
              }}>
                {alert.scoreAfter}점
              </span>
              {" "}
              <span style={{
                color: isDownturn ? "#DC2626" : "#16A34A",
                fontWeight: 700,
              }}>
                {isDownturn ? "▼" : "▲"}
                {Math.abs((alert.scoreAfter ?? 0) - (alert.scoreBefore ?? 0))}점
              </span>
            </div>
          )}

          {/* 행동 메시지 */}
          {alert.actionMessage && (
            <div style={{
              marginTop: 6, padding: "6px 10px", borderRadius: 6,
              background: "#FFFBEB", border: "1px solid #FDE68A",
              fontSize: 11, color: "#92400E", lineHeight: 1.5,
            }}>
              {alert.actionMessage}
            </div>
          )}
        </div>
        {!alert.isRead && !hasAction && (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", flexShrink: 0, marginTop: 4 }} />
        )}
      </div>
    </div>
  )
}

export default function AlertDrawer({ onClose }: { onClose: () => void }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(true)

  useEffect(() => {
    fetch("/api/alerts")
      .then(async (res) => {
        if (res.status === 401) { setIsLoggedIn(false); return }
        const json = await res.json()
        setAlerts(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    })
  }

  async function handleReadAll() {
    const unreadIds = alerts.filter(a => !a.isRead).map(a => a.id)
    if (!unreadIds.length) return
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    })
  }

  async function handleClear() {
    await fetch("/api/alerts", { method: "DELETE" })
    setAlerts(prev => prev.filter(a => !a.isRead))
  }

  const unreadCount = alerts.filter(a => !a.isRead).length

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 500 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 딤 배경 */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />

      {/* 드로어 */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "#fff", borderRadius: "20px 20px 0 0",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        fontFamily: "'Pretendard', sans-serif",
      }}>
        {/* 핸들 */}
        <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2 }} />
        </div>

        {/* 헤더 */}
        <div style={{ padding: "12px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>알림</span>
            {unreadCount > 0 && (
              <span style={{ background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 9999 }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={handleReadAll} style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer" }}>
                전체 읽음
              </button>
            )}
            <button onClick={handleClear} style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer" }}>
              읽은 것 삭제
            </button>
            <button onClick={onClose} style={{ fontSize: 12, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>
              닫기
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>불러오는 중...</div>
          ) : !isLoggedIn ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>로그인하면 알림을 받을 수 있습니다</div>
          ) : alerts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 14, color: "#9CA3AF" }}>새 알림이 없습니다</div>
              <div style={{ fontSize: 12, color: "#D1D5DB", marginTop: 4 }}>즐겨찾기 단지의 실거래·점수 변동 시 알림이 와요</div>
            </div>
          ) : (
            alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onRead={handleRead} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
