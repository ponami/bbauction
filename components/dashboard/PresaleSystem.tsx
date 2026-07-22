"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { InterestNeighborhood, PresaleItem, SupplyUnit } from "@/lib/types"

// ─── 유틸 ──────────────────────────────────────────────────────

function fmtPrice(min: number, max: number): string {
  const f = (n: number) => {
    if (!n) return "미정"
    if (n >= 10000) {
      const 억 = Math.floor(n / 10000)
      const 천 = Math.round((n % 10000) / 1000)
      return 천 ? `${억}억 ${천}천` : `${억}억`
    }
    return `${Math.round(n / 1000)}천만`
  }
  if (!min && !max) return "미정"
  if (!max || min === max) return f(min)
  return `${f(min)} ~ ${f(max)}`
}

function dday(dateStr: string): { label: string; urgent: boolean } {
  if (!dateStr) return { label: "", urgent: false }
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff === 0) return { label: "D-Day", urgent: true }
  if (diff > 0 && diff <= 7) return { label: `D-${diff}`, urgent: true }
  if (diff > 0) return { label: `D-${diff}`, urgent: false }
  return { label: `D+${Math.abs(diff)}`, urgent: false }
}

function fmtDate(d: string) {
  if (!d) return "-"
  return d.replace(/-/g, ".")
}

function sourceBadge(src: string) {
  if (src === "청약홈") return { bg: "#E3F2FD", color: "#1565C0", text: "청약홈" }
  if (src === "뉴스")   return { bg: "#F3E5F5", color: "#6A1B9A", text: "뉴스 분석" }
  return                       { bg: "#F5F5F5", color: "#616161", text: "샘플" }
}

// ─── 분양 카드 ─────────────────────────────────────────────────

function PresaleCard({ item, onRead }: { item: PresaleItem; onRead: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const sub = sourceBadge(item.source)
  const ddSub = dday(item.subscribeStartDate)
  const ddAnn = dday(item.announcementDate)
  const activeDd = ddSub.label ? ddSub : ddAnn

  const totalSupplyCount = item.supply.reduce((s, u) => s + u.count, 0)

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1.5px solid ${item.isRead ? "#E8EDF5" : "#1B4FBB30"}`,
        background: item.isRead ? "#fff" : "#F0F5FF",
        overflow: "hidden",
        transition: "all .2s",
      }}
    >
      {/* 헤더 클릭 → 펼치기 */}
      <div
        onClick={() => { setOpen(v => !v); !item.isRead && onRead(item.id) }}
        style={{ padding: "16px 16px 12px", cursor: "pointer" }}
      >
        {/* 상단 행: 배지 + 미읽음 점 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: sub.bg, color: sub.color,
            }}>{sub.text}</span>
            {activeDd.label && (
              <span style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800,
                background: activeDd.urgent ? "#FFEBEE" : "#F3F4F6",
                color: activeDd.urgent ? "#C62828" : "#6B7FA3",
              }}>{activeDd.label}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!item.isRead && (
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#1B4FBB", display: "inline-block",
              }} />
            )}
            <span style={{ fontSize: 16, color: "#8FA8D0", transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>
              ▾
            </span>
          </div>
        </div>

        {/* 아파트명 */}
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0A2463", marginBottom: 4, letterSpacing: "-.3px" }}>
          🏗 {item.aptName}
        </div>
        <div style={{ fontSize: 11, color: "#8FA8D0", marginBottom: 10 }}>{item.address}</div>

        {/* 핵심 3개 지표 */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
        }}>
          <KeyStat label="분양가" value={fmtPrice(item.minPrice, item.maxPrice)} bold />
          <KeyStat label="세대수" value={totalSupplyCount ? `${totalSupplyCount.toLocaleString("ko-KR")}세대` : `${item.totalUnits.toLocaleString("ko-KR")}세대`} />
          <KeyStat label="입주예정" value={item.moveInDate || "미정"} />
        </div>
      </div>

      {/* 펼쳐진 상세 */}
      {open && (
        <div style={{
          borderTop: "1px solid #E8EDF5",
          padding: "14px 16px",
          background: "#fff",
          animation: "fadeIn .2s ease",
        }}>
          {/* 청약 일정 */}
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>📅 청약 일정</SectionTitle>
            <ScheduleRow label="모집공고" date={item.announcementDate} />
            <ScheduleRow label="특별공급" date={item.specialSupplyDate} />
            <ScheduleRow label="1순위 청약" date={item.subscribeStartDate} highlight />
            <ScheduleRow label="청약 마감" date={item.subscribeEndDate} />
          </div>

          {/* 공급 타입 */}
          {item.supply.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SectionTitle>📐 공급 타입</SectionTitle>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 8, marginTop: 8,
              }}>
                {item.supply.map((u, i) => <SupplyUnitCard key={i} unit={u} />)}
              </div>
            </div>
          )}

          {/* 시공사 */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            {item.constructionCompany && (
              <InfoChip label="시공사" value={item.constructionCompany} />
            )}
            {item.salesCompany && item.salesCompany !== item.constructionCompany && (
              <InfoChip label="시행사" value={item.salesCompany} />
            )}
          </div>

          {/* 청약홈 링크 */}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "8px 14px", borderRadius: 7,
                background: "#0A2463", color: "#fff",
                fontSize: 12, fontWeight: 700,
                textDecoration: "none",
              }}
            >
              🔗 청약홈 바로가기
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function KeyStat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{
      background: "#F8FAFF", borderRadius: 8, padding: "8px 10px",
    }}>
      <div style={{ fontSize: 10, color: "#8FA8D0", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: bold ? 800 : 700, color: bold ? "#0A2463" : "#1A2B4A", letterSpacing: "-.3px" }}>
        {value}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#8FA8D0", marginBottom: 8, letterSpacing: ".04em" }}>{children}</div>
}

function ScheduleRow({ label, date, highlight }: { label: string; date?: string; highlight?: boolean }) {
  if (!date) return null
  const { label: dd, urgent } = dday(date)
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid #F0F5FF",
    }}>
      <span style={{ fontSize: 12, color: highlight ? "#0A2463" : "#4A5568", fontWeight: highlight ? 700 : 400 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        {dd && (
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: urgent ? "#C62828" : "#6B7FA3",
          }}>{dd}</span>
        )}
        <span style={{ fontSize: 12, color: highlight ? "#1B4FBB" : "#8FA8D0", fontWeight: highlight ? 700 : 400 }}>
          {fmtDate(date)}
        </span>
      </div>
    </div>
  )
}

function SupplyUnitCard({ unit }: { unit: SupplyUnit }) {
  return (
    <div style={{
      background: "#F8FAFF", border: "1px solid #E8EDF5",
      borderRadius: 8, padding: "10px 12px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#1B4FBB", marginBottom: 4 }}>{unit.type}</div>
      <div style={{ fontSize: 11, color: "#4A5568" }}>{unit.area}m²</div>
      {unit.count > 0 && <div style={{ fontSize: 11, color: "#8FA8D0" }}>{unit.count}세대</div>}
      {unit.price && (
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0A2463", marginTop: 4 }}>
          {unit.price >= 10000 ? `${Math.floor(unit.price / 10000)}억` : `${Math.round(unit.price / 1000)}천만`}
        </div>
      )}
    </div>
  )
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "#8FA8D0" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#4A5568" }}>{value}</span>
    </div>
  )
}

// ─── 관심 동네 카드 ────────────────────────────────────────────

function HoodCard({
  hood,
  onToggleFav,
  onDelete,
}: {
  hood: InterestNeighborhood
  onToggleFav: (id: string, val: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 12,
      border: `1.5px solid ${hood.isFavorited ? "#C9A84C40" : "#E8EDF5"}`,
      background: hood.isFavorited ? "#FFFBF0" : "#fff",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {/* 찜 버튼 */}
      <button
        onClick={() => onToggleFav(hood.id, !hood.isFavorited)}
        style={{
          width: 36, height: 36, borderRadius: 9, border: "none",
          background: hood.isFavorited ? "#C9A84C" : "#F3F4F6",
          fontSize: 18, cursor: "pointer", flexShrink: 0,
        }}
        title={hood.isFavorited ? "찜 해제" : "찜 하기"}
      >
        {hood.isFavorited ? "⭐" : "☆"}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B4A", marginBottom: 3 }}>
          {hood.name}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#8FA8D0" }}>
            방문 {hood.visitCount}회
          </span>
          {hood.sources.map(s => (
            <span key={s} style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 3,
              background: "#EEF3FC", color: "#1B4FBB",
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* 방문 횟수 바 */}
      <div style={{ width: 40, textAlign: "center" }}>
        <div style={{
          fontSize: 18, fontWeight: 900,
          color: hood.visitCount >= 5 ? "#C9A84C" : hood.visitCount >= 2 ? "#1B4FBB" : "#CBD5E0",
        }}>
          {hood.visitCount >= 10 ? "10+" : hood.visitCount}
        </div>
        <div style={{ fontSize: 9, color: "#8FA8D0", marginTop: 1 }}>
          {hood.visitCount >= 5 ? "🔥" : hood.visitCount >= 2 ? "✓ 알림" : "2회~"}
        </div>
      </div>

      <button
        onClick={() => onDelete(hood.id)}
        style={{
          width: 26, height: 26, borderRadius: 6,
          background: "#FEE2E2", border: "none",
          color: "#C62828", fontSize: 12, cursor: "pointer",
          flexShrink: 0,
        }}
      >✕</button>
    </div>
  )
}

// ─── 동네 추가 폼 ──────────────────────────────────────────────

const POPULAR_HOODS = [
  { name: "서울 강남구",   sido: "서울특별시", sigungu: "강남구", bjdCode: "11680" },
  { name: "서울 마포구",   sido: "서울특별시", sigungu: "마포구", bjdCode: "11440" },
  { name: "경기 성남시",   sido: "경기도",     sigungu: "성남시", bjdCode: "41130" },
  { name: "경기 성남시",   sido: "경기도",     sigungu: "성남시", bjdCode: "41130" },
]

function AddHoodForm({ onAdd }: { onAdd: () => void }) {
  const [name, setName] = useState("")
  const [sido, setSido] = useState("")
  const [sigungu, setSigungu] = useState("")
  const [bjdCode, setBjdCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const s: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit",
  }

  async function submit() {
    if (!name.trim() || !sido.trim() || !sigungu.trim() || !bjdCode.trim()) {
      setError("모든 항목을 입력해 주세요"); return
    }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/neighborhoods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sido, sigungu, bjdCode, isFavorited: true }),
      })
      if (!res.ok) throw new Error("추가 실패")
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setName(""); setSido(""); setSigungu(""); setBjdCode("")
      onAdd()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 빠른 추가 */}
      <div>
        <div style={{ fontSize: 11, color: "#8FA8D0", marginBottom: 8 }}>🔥 인기 동네 빠른 추가</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {POPULAR_HOODS.map(h => (
            <button
              key={h.bjdCode + h.name}
              onClick={() => { setName(h.name); setSido(h.sido); setSigungu(h.sigungu); setBjdCode(h.bjdCode) }}
              style={{
                padding: "6px 12px", borderRadius: 20, border: "1px solid #E8EDF5",
                background: name === h.name ? "#EEF3FC" : "#fff",
                fontSize: 12, cursor: "pointer", color: "#1A2B4A",
              }}
            >{h.name}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "#FEE2E2", color: "#C62828", fontSize: 12 }}>{error}</div>}

      <input value={name}    onChange={e => setName(e.target.value)}    placeholder="동네 이름 (예: 판교신도시)"  style={s} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input value={sido}    onChange={e => setSido(e.target.value)}    placeholder="시도 (예: 인천광역시)"  style={s} />
        <input value={sigungu} onChange={e => setSigungu(e.target.value)} placeholder="시군구 (예: 서구)"      style={s} />
      </div>
      <input value={bjdCode} onChange={e => setBjdCode(e.target.value)} placeholder="법정동 코드 5자리 (예: 28200)" style={s} />

      <button
        onClick={submit} disabled={loading}
        style={{
          padding: "12px", borderRadius: 8, border: "none",
          background: "linear-gradient(135deg,#0A2463,#1B4FBB)",
          color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .6 : 1,
        }}
      >{loading ? "추가 중..." : "관심 동네 추가"}</button>
    </div>
  )
}

// ─── 메인 PresaleSystem ────────────────────────────────────────

export default function PresaleSystem() {
  const [tab, setTab]               = useState<"presales" | "hoods" | "addHood">("presales")
  const [presales, setPresales]     = useState<PresaleItem[]>([])
  const [hoods, setHoods]           = useState<InterestNeighborhood[]>([])
  const [unread, setUnread]         = useState(0)
  const [checking, setChecking]     = useState(false)
  const [lastCheck, setLastCheck]   = useState<string | null>(null)
  const [notifGranted, setNotifGranted] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadPresales = useCallback(async () => {
    try {
      const res = await fetch("/api/presales")
      if (!res.ok) {
        console.warn("loadPresales non-ok status", res.status)
        return
      }
      let json
      try {
        json = await res.json()
      } catch (jsonErr) {
        console.warn("loadPresales json parse failed", jsonErr)
        return
      }
      if (json && json.success) { 
        setPresales(Array.isArray(json.data) ? json.data : []) 
        setUnread(json.unreadCount || 0) 
      }
    } catch (e) {
      console.warn("loadPresales failed", e)
    }
  }, [])

  const loadHoods = useCallback(async () => {
    try {
      const res = await fetch("/api/neighborhoods")
      if (!res.ok) {
        console.warn("loadHoods non-ok status", res.status)
        setHoods([])
        return
      }
      let json
      try {
        json = await res.json()
      } catch (jsonErr) {
        console.warn("loadHoods json parse failed (likely 500 HTML response)", jsonErr)
        setHoods([])
        return
      }
      if (json && json.success) {
        setHoods(Array.isArray(json.data) ? json.data : [])
      } else {
        setHoods([])
      }
    } catch (e) {
      console.warn("loadHoods failed", e)
      setHoods([])
    }
  }, [])

  useEffect(() => {
    loadPresales(); loadHoods()
    if ("Notification" in window) setNotifGranted(Notification.permission === "granted")
  }, [loadPresales, loadHoods])

  async function requestNotif() {
    if (!("Notification" in window)) return
    setNotifGranted(await Notification.requestPermission() === "granted")
  }

  async function triggerCheck() {
    setChecking(true)
    try {
      const res = await fetch("/api/presales/check", { method: "POST" })
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        setLastCheck(new Date().toLocaleTimeString("ko-KR"))
        const newCount = json.data.newItems as number
        if (newCount > 0 && notifGranted) {
          const items = json.data.items as PresaleItem[]
          for (const p of items) {
            new Notification(`🏗 신규 분양 알림`, {
              body: `${p.aptName}\n${p.address}\n분양가 ${fmtPrice(p.minPrice, p.maxPrice)} · ${p.totalUnits}세대`,
              icon: "/favicon.ico",
            })
          }
        }
        await loadPresales()
      }
    } finally { setChecking(false) }
  }

  // 6시간마다 자동 체크
  useEffect(() => {
    pollingRef.current = setInterval(triggerCheck, 6 * 60 * 60 * 1000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [notifGranted]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markRead(id: string) {
    const res = await fetch("/api/presales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    })
    if (res.ok) loadPresales()
  }

  async function toggleFav(id: string, val: boolean) {
    const res = await fetch(`/api/neighborhoods?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorited: val }),
    })
    if (res.ok) loadHoods()
  }

  async function deleteHood(id: string) {
    const res = await fetch(`/api/neighborhoods?id=${id}`, { method: "DELETE" })
    if (res.ok) loadHoods()
  }

  const TAB_BASE: React.CSSProperties = {
    flex: 1, padding: "10px 4px", border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, background: "transparent",
  }
  const favHoods = hoods.filter(h => h.isFavorited)
  const visitHoods = hoods.filter(h => !h.isFavorited && h.visitCount >= 2)

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E8EDF5",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(10,36,99,.08)",
    }}>
      {/* 헤더 */}
      <div style={{ background: "linear-gradient(135deg,#0A2463,#0D2B73)", padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>
              🏗 신규 분양 알림
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
              {lastCheck ? `마지막 확인 ${lastCheck}` : "찜·2회 이상 방문 동네 자동 감시"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!notifGranted && (
              <button onClick={requestNotif} style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.4)", color: "#C9A84C", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                🔔 알림 켜기
              </button>
            )}
            {notifGranted && <span style={{ fontSize: 11, color: "rgba(201,168,76,.8)" }}>🔔 ON</span>}
            <button onClick={triggerCheck} disabled={checking} style={{ padding: "6px 14px", borderRadius: 6, background: "linear-gradient(135deg,#C9A84C,#E8C96A)", border: "none", color: "#0A2463", fontSize: 12, fontWeight: 800, cursor: checking ? "not-allowed" : "pointer", opacity: checking ? .7 : 1 }}>
              {checking ? "확인 중..." : "지금 확인"}
            </button>
          </div>
        </div>

        {/* 관심 동네 요약 pill들 */}
        {(favHoods.length > 0 || visitHoods.length > 0) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {favHoods.map(h => (
              <span key={h.id} style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(201,168,76,.2)", border: "1px solid rgba(201,168,76,.4)", color: "#C9A84C", fontSize: 11, fontWeight: 700 }}>
                ⭐ {h.name}
              </span>
            ))}
            {visitHoods.map(h => (
              <span key={h.id} style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)", fontSize: 11 }}>
                👀 {h.name} ({h.visitCount}회)
              </span>
            ))}
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          {[
            { key: "presales", label: `분양 정보 ${unread > 0 ? `(${unread})` : ""}` },
            { key: "hoods",    label: `관심 동네 (${hoods.length})` },
            { key: "addHood",  label: "+ 동네 추가" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              style={tab === t.key
                ? { ...TAB_BASE, color: "#C9A84C", borderBottom: "2.5px solid #C9A84C", background: "rgba(255,255,255,.04)" }
                : { ...TAB_BASE, color: "rgba(255,255,255,.5)", borderBottom: "2.5px solid transparent" }
              }
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ padding: 16, maxHeight: 600, overflowY: "auto" }}>

        {/* 분양 정보 탭 */}
        {tab === "presales" && (
          <div>
            {presales.length === 0 ? (
              <EmptyState
                icon="🏗"
                title="새 분양 정보가 없어요"
                desc={"관심 동네를 추가하거나\n'지금 확인' 버튼을 눌러 검색해 보세요"}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {presales.map(p => <PresaleCard key={p.id} item={p} onRead={markRead} />)}
              </div>
            )}
          </div>
        )}

        {/* 관심 동네 탭 */}
        {tab === "hoods" && (
          <div>
            {/* 안내 배너 */}
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: "#EEF3FC", border: "1px solid #C5D4EC",
              fontSize: 12, color: "#4A5568", lineHeight: 1.7,
            }}>
              ⭐ <strong>찜한 동네</strong>는 항상 감시하고,<br />
              👀 <strong>2회 이상 방문한 동네</strong>도 자동으로 분양 알림을 드립니다.
            </div>

            {hoods.length === 0 ? (
              <EmptyState icon="📍" title="등록된 관심 동네가 없어요" desc="+ 동네 추가 탭에서 등록해 보세요" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {hoods.map(h => <HoodCard key={h.id} hood={h} onToggleFav={toggleFav} onDelete={deleteHood} />)}
              </div>
            )}
          </div>
        )}

        {/* 동네 추가 탭 */}
        {tab === "addHood" && (
          <AddHoodForm onAdd={() => { loadHoods(); setTab("hoods") }} />
        )}
      </div>

      {/* 하단 상태바 */}
      <div style={{
        padding: "10px 16px", background: "#F8FAFF", borderTop: "1px solid #E8EDF5",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, color: "#8FA8D0" }}>
          📡 청약홈 API · 네이버뉴스 · 6시간 자동 폴링
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: unread > 0 ? "#C62828" : "#2E7D32" }}>
          {unread > 0 ? `신규 ${unread}건` : "✓ 최신"}
        </span>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B4A", marginBottom: 7 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#8FA8D0", lineHeight: 1.8, whiteSpace: "pre-line" }}>{desc}</div>
    </div>
  )
}
