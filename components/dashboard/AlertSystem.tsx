"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { FavoriteApt, DealAlert } from "@/lib/types"
import WatchlistTabs from "@/components/watchlist/WatchlistTabs"

// ─── 가격 포매터 (클라이언트용) ─────────────────────────
function fmt(price: number): string {
  if (price >= 10000) {
    const 억 = Math.floor(price / 10000)
    const 천 = price % 10000
    if (천 === 0) return `${억}억`
    if (천 < 1000) return `${억}억 ${천}만`
    return `${억}억 ${Math.floor(천 / 1000)}천만`
  }
  if (price >= 1000) return `${Math.floor(price / 1000)}천만`
  return `${price}만`
}

const DEAL_COLORS: Record<string, string> = {
  매매: "#1B4FBB",
  전세: "#2E7D32",
  월세: "#E65100",
}

const CARD_COLORS = ["#1B4FBB", "#2E7D32", "#C9A84C", "#7B1FA2", "#C62828", "#00838F"]

// ─── 타입 ────────────────────────────────────────────────
interface AlertsApiRes {
  success: boolean
  data: DealAlert[]
  unreadCount: number
}
interface FavsApiRes {
  success: boolean
  data: FavoriteApt[]
}

// ─── 뱃지 컴포넌트 ─────────────────────────────────────
function Badge({ type }: { type: string }) {
  const bg = DEAL_COLORS[type] ?? "#666"
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px", borderRadius: 4,
      background: bg + "18", border: `1px solid ${bg}40`,
      color: bg, fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {type}
    </span>
  )
}

// ─── 알림 카드 ─────────────────────────────────────────
function AlertCard({ alert, onRead }: { alert: DealAlert; onRead: (id: string) => void }) {
  const color = DEAL_COLORS[alert.dealType] ?? "#666"
  const priceLabel = alert.dealType === "월세"
    ? `보증금 ${fmt(alert.price)} / 월세 ${fmt(alert.monthlyRent ?? 0)}`
    : fmt(alert.price)

  return (
    <div
      onClick={() => !alert.isRead && onRead(alert.id)}
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${alert.isRead ? "#E8EDF5" : color + "40"}`,
        background: alert.isRead ? "#fff" : color + "06",
        cursor: alert.isRead ? "default" : "pointer",
        transition: "all .2s",
        position: "relative",
      }}
    >
      {!alert.isRead && (
        <span style={{
          position: "absolute", top: 12, right: 14,
          width: 7, height: 7, borderRadius: "50%",
          background: color, boxShadow: `0 0 0 2px ${color}30`,
        }} />
      )}
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <Badge type={alert.dealType} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2B4A" }}>{alert.aptName}</span>
      </div>
      {/* 핵심 정보 */}
      <div style={{
        fontSize: 20, fontWeight: 900,
        color, letterSpacing: "-0.5px", marginBottom: 4,
      }}>
        {priceLabel}
      </div>
      {/* 세부 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#4A5568" }}>
          {alert.area}m² · {alert.floor}층
        </span>
        <span style={{ fontSize: 12, color: "#8FA8D0" }}>
          {alert.dealYear}.{alert.dealMonth}.{alert.dealDay}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#8FA8D0", marginTop: 4 }}>
        {alert.address}
      </div>
    </div>
  )
}

// ─── 즐겨찾기 추가 폼 ──────────────────────────────────
function AddFavForm({ onAdd }: { onAdd: () => void }) {
  const [aptName, setAptName] = useState("")
  const [address, setAddress] = useState("")
  const [lawdCd, setLawdCd] = useState("")
  const [매매, set매매] = useState(true)
  const [전세, set전세] = useState(true)
  const [월세, set월세] = useState(false)
  const [areaStr, setAreaStr] = useState("")
  const [color, setColor] = useState(CARD_COLORS[0])
  const [scoreThreshold, setScoreThreshold] = useState(5)
  const [category, setCategory] = useState("general")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const s: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #E8EDF5", fontSize: 13,
    outline: "none", fontFamily: "inherit",
  }

  async function submit() {
    if (!aptName.trim() || !lawdCd.trim()) {
      setError("아파트명과 법정동 코드는 필수입니다")
      return
    }
    const dealTypes: ("매매" | "전세" | "월세")[] = []
    if (매매) dealTypes.push("매매")
    if (전세) dealTypes.push("전세")
    if (월세) dealTypes.push("월세")
    if (!dealTypes.length) { setError("거래 유형을 하나 이상 선택하세요"); return }

    const areaFilter = areaStr
      .split(",")
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n))

    setLoading(true); setError("")
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aptName: aptName.trim(), address: address.trim(), lawdCd: lawdCd.trim(), dealTypes, areaFilter, color, scoreThreshold, category }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setAptName(""); setAddress(""); setLawdCd(""); setAreaStr("")
      onAdd()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {error && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "#FEE2E2", color: "#C62828", fontSize: 12 }}>
          {error}
        </div>
      )}
      <input value={aptName} onChange={e => setAptName(e.target.value)} placeholder="아파트명 (예: 래미안아파트)" style={s} />
      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="주소 (선택)" style={s} />
      <input value={lawdCd} onChange={e => setLawdCd(e.target.value)} placeholder="법정동 코드 5자리 (예: 28200)" style={s} />
      <input value={areaStr} onChange={e => setAreaStr(e.target.value)} placeholder="전용면적 필터 (예: 59, 84 — 비우면 전체)" style={s} />

      {/* 거래 유형 */}
      <div style={{ display: "flex", gap: 8 }}>
        {([ ["매매", 매매, set매매], ["전세", 전세, set전세], ["월세", 월세, set월세] ] as [string, boolean, (v:boolean)=>void][]).map(([label, val, set]) => (
          <label key={label} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 13, userSelect: "none" }}>
            <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />
            {label}
          </label>
        ))}
      </div>

      {/* 워치리스트 카테고리 */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#8FA8D0", flexShrink: 0 }}>관심 유형</span>
        {[
          { key: "general", label: "기타" },
          { key: "trade_up", label: "갈아타기 후보" },
          { key: "gap_investment", label: "갭투자 후보" },
        ].map(c => (
          <button
            key={c.key} onClick={() => setCategory(c.key)}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
              background: category === c.key ? "#0A2463" : "#E8EDF5",
              color: category === c.key ? "#fff" : "#4A5568",
              fontWeight: category === c.key ? 700 : 400,
            }}
          >{c.label}</button>
        ))}
      </div>

      {/* 점수 변동 알림 임계값 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#8FA8D0", flexShrink: 0 }}>점수 변동 알림</span>
        {[3, 5, 10].map(v => (
          <button
            key={v} onClick={() => setScoreThreshold(v)}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
              background: scoreThreshold === v ? "#0A2463" : "#E8EDF5",
              color: scoreThreshold === v ? "#fff" : "#4A5568",
              fontWeight: scoreThreshold === v ? 700 : 400,
            }}
          >±{v}점</button>
        ))}
      </div>

      {/* 색상 선택 */}
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#8FA8D0" }}>카드 색상</span>
        {CARD_COLORS.map(c => (
          <button
            key={c} onClick={() => setColor(c)}
            style={{
              width: 22, height: 22, borderRadius: 6, background: c, border: color === c ? "2px solid #1A2B4A" : "2px solid transparent",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      <button
        onClick={submit} disabled={loading}
        style={{
          padding: "12px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer",
          background: "linear-gradient(135deg,#0A2463,#1B4FBB)", color: "#fff",
          fontSize: 14, fontWeight: 700,
          opacity: loading ? .6 : 1,
        }}
      >
        {loading ? "추가 중..." : "즐겨찾기 추가"}
      </button>
    </div>
  )
}

// ─── 메인 AlertSystem ───────────────────────────────────
export default function AlertSystem() {
  const [tab, setTab] = useState<"alerts" | "favorites" | "add">("alerts")
  const [alerts, setAlerts] = useState<DealAlert[]>([])
  const [favorites, setFavorites] = useState<FavoriteApt[]>([])
  const [unread, setUnread] = useState(0)
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<"all" | "action">("all")
  const [notifGranted, setNotifGranted] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── 데이터 로드 ──
  const loadAlerts = useCallback(async () => {
    const res = await fetch("/api/alerts")
    const json: AlertsApiRes = await res.json()
    if (json.success) {
      setAlerts(json.data)
      setUnread(json.unreadCount)
    }
  }, [])

  const loadFavorites = useCallback(async () => {
    try {
      const res = await fetch("/api/favorites")
      if (!res.ok) return
      const json: FavsApiRes = await res.json()
      if (json.success) setFavorites(json.data)
    } catch {
      // DB 미연결 시 무시
    }
  }, [])

  useEffect(() => {
    loadAlerts()
    loadFavorites()
  }, [loadAlerts, loadFavorites])

  // ── 알림 권한 요청 ──
  useEffect(() => {
    if ("Notification" in window) {
      setNotifGranted(Notification.permission === "granted")
    }
  }, [])

  async function requestNotif() {
    if (!("Notification" in window)) return
    const perm = await Notification.requestPermission()
    setNotifGranted(perm === "granted")
  }

  // ── 실거래 체크 ──
  async function triggerCheck() {
    setChecking(true)
    try {
      const res = await fetch("/api/alerts/check", { method: "POST" })
      const json = await res.json()
      if (json.success) {
        setLastCheck(new Date().toLocaleTimeString("ko-KR"))
        const total = json.data.newAlerts as number
        // 새 알림이 있으면 브라우저 푸시
        if (total > 0 && notifGranted) {
          const results = json.data.results as Array<{ aptName: string; newDeals: DealAlert[] }>
          for (const r of results) {
            for (const d of r.newDeals) {
              const priceLabel = d.dealType === "월세"
                ? `보증금 ${fmt(d.price)} / 월세 ${fmt(d.monthlyRent ?? 0)}`
                : fmt(d.price)
              new Notification(`🏠 ${d.aptName} 실거래 알림`, {
                body: `${d.dealType} · ${d.area}m² · ${priceLabel} · ${d.floor}층`,
                icon: "/favicon.ico",
              })
            }
          }
        }
        await loadAlerts()
      }
    } finally {
      setChecking(false)
    }
  }

  // ── 5분마다 자동 폴링 ──
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      triggerCheck()
    }, 5 * 60 * 1000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [notifGranted]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 읽음 처리 ──
  async function markRead(id: string) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    })
    loadAlerts()
  }

  async function markAllRead() {
    const ids = alerts.filter(a => !a.isRead).map(a => a.id)
    if (!ids.length) return
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    loadAlerts()
  }

  async function clearRead() {
    await fetch("/api/alerts", { method: "DELETE" })
    loadAlerts()
  }

  // ── 즐겨찾기 삭제 ──
  async function deleteFav(id: string) {
    await fetch(`/api/favorites?id=${id}`, { method: "DELETE" })
    loadFavorites()
  }

  // ─── 스타일 상수 ────────────────────────────────────────
  const TAB: React.CSSProperties = {
    flex: 1, padding: "10px 4px", border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, borderRadius: 0,
    transition: "all .2s", background: "transparent",
  }
  const TAB_A: React.CSSProperties = {
    ...TAB,
    color: "#0A2463", borderBottom: "2.5px solid #0A2463",
  }
  const TAB_I: React.CSSProperties = {
    ...TAB,
    color: "#8FA8D0", borderBottom: "2.5px solid transparent",
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E8EDF5",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(10,36,99,.08)",
    }}>

      {/* ── 헤더 ── */}
      <div style={{
        background: "linear-gradient(135deg,#0A2463,#0D2B73)",
        padding: "18px 20px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>
              🔔 실거래 알림
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
              {lastCheck ? `마지막 확인 ${lastCheck}` : "5분마다 자동 확인"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* 알림 권한 */}
            {!notifGranted && (
              <button
                onClick={requestNotif}
                style={{
                  padding: "6px 12px", borderRadius: 6,
                  background: "rgba(201,168,76,.15)",
                  border: "1px solid rgba(201,168,76,.4)",
                  color: "#C9A84C", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}
              >
                🔔 알림 켜기
              </button>
            )}
            {notifGranted && (
              <span style={{ fontSize: 11, color: "rgba(201,168,76,.8)" }}>🔔 알림 ON</span>
            )}

            {/* 수동 체크 버튼 */}
            <button
              onClick={triggerCheck} disabled={checking}
              style={{
                padding: "6px 14px", borderRadius: 6,
                background: "linear-gradient(135deg,#C9A84C,#E8C96A)",
                border: "none", color: "#0A2463",
                fontSize: 12, fontWeight: 800, cursor: checking ? "not-allowed" : "pointer",
                opacity: checking ? .7 : 1,
              }}
            >
              {checking ? "확인 중..." : "지금 확인"}
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          {[
            { key: "alerts",    label: `알림 ${unread > 0 ? `(${unread})` : ""}` },
            { key: "favorites", label: `즐겨찾기 (${favorites.length})` },
            { key: "add",       label: "+ 추가" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              style={tab === t.key
                ? { ...TAB, color: "#C9A84C", borderBottom: "2.5px solid #C9A84C", background: "rgba(255,255,255,.04)" }
                : { ...TAB, color: "rgba(255,255,255,.5)", borderBottom: "2.5px solid transparent" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div style={{ padding: 16, maxHeight: 520, overflowY: "auto" }}>

        {/* ─ 알림 탭 ─ */}
        {tab === "alerts" && (
          <div>
            {/* 행동 필터 */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button
                onClick={() => setActionFilter("all")}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: actionFilter === "all" ? "#0A2463" : "#E8EDF5",
                  color: actionFilter === "all" ? "#fff" : "#4A5568",
                }}
              >
                전체 ({alerts.length})
              </button>
              <button
                onClick={() => setActionFilter("action")}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: actionFilter === "action" ? "#D97706" : "#FEF3C7",
                  color: actionFilter === "action" ? "#fff" : "#92400E",
                }}
              >
                ⚡ 행동 필요 ({alerts.filter(a => a.actionType).length})
              </button>
            </div>

            {alerts.length > 0 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={markAllRead} style={{ fontSize: 11, color: "#8FA8D0", background: "none", border: "none", cursor: "pointer" }}>
                  모두 읽음
                </button>
                <button onClick={clearRead} style={{ fontSize: 11, color: "#C62828", background: "none", border: "none", cursor: "pointer" }}>
                  읽음 삭제
                </button>
              </div>
            )}

            {alerts.length === 0 ? (
              <EmptyState
                icon="🔔"
                title="아직 알림이 없어요"
                desc={`즐겨찾기 아파트를 등록하면\n실거래가 등록 시 알려드립니다`}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* 행동 권고 알림 상단 고정 */}
                {actionFilter === "all" && (
                  <>
                    {alerts.filter(a => a.actionType).length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#D97706", marginBottom: 2 }}>
                          ⚡ 행동 권고
                        </div>
                        {alerts.filter(a => a.actionType).map(a => <AlertCard key={a.id} alert={a} onRead={markRead} />)}
                        <div style={{ borderTop: "1px solid #E8EDF5", margin: "6px 0" }} />
                      </>
                    )}
                  </>
                )}
                {alerts
                  .filter(a => actionFilter === "all" || a.actionType)
                  .map(a => <AlertCard key={a.id} alert={a} onRead={markRead} />)}
              </div>
            )}
          </div>
        )}

        {/* ─ 즐겨찾기 탭 (워치리스트) ─ */}
        {tab === "favorites" && (
          <div>
            {favorites.length === 0 ? (
              <EmptyState
                icon="🏠"
                title="등록된 즐겨찾기가 없어요"
                desc="+ 추가 탭에서 감시할 아파트를 등록하세요"
              />
            ) : (
              <WatchlistTabs
                favorites={favorites}
                onDelete={deleteFav}
                onRefresh={loadFavorites}
              />
            )}
          </div>
        )}

        {/* ─ 추가 탭 ─ */}
        {tab === "add" && (
          <div>
            <p style={{ fontSize: 12, color: "#8FA8D0", marginBottom: 14, lineHeight: 1.7 }}>
              법정동 코드는 <strong style={{ color: "#1A2B4A" }}>data.go.kr</strong>에서 확인하거나<br />
              예) 서울 강남구: 11680 / 경기 성남: 41130 / 부산 해운대: 26350
            </p>
            <AddFavForm onAdd={() => { loadFavorites(); setTab("favorites") }} />
          </div>
        )}
      </div>

      {/* ── 하단 상태바 ── */}
      <div style={{
        padding: "10px 16px",
        background: "#F8FAFF",
        borderTop: "1px solid #E8EDF5",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, color: "#8FA8D0" }}>
          📡 국토부 실거래가 API 연동 · 5분 자동 폴링
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: unread > 0 ? "#C62828" : "#2E7D32",
        }}>
          {unread > 0 ? `미읽음 ${unread}건` : "✓ 모두 읽음"}
        </span>
      </div>
    </div>
  )
}

// ─── 빈 상태 ──────────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B4A", marginBottom: 7 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#8FA8D0", lineHeight: 1.8, whiteSpace: "pre-line" }}>{desc}</div>
    </div>
  )
}
