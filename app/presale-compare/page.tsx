"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

// ── 타입 ─────────────────────────────────────────────────────
interface SalePrice {
  found:       boolean
  notReleased: boolean
  min:         number | null
  max:         number | null
  unit:        string
  rawPrices:   string[]
  source:      string
}

interface PresaleInfo {
  aptName:          string
  lawdCd:           string
  salePrice:        SalePrice
  nearbyStats:      { avg: number; min: number; max: number; count: number } | null
  expectedGain:     number | null
  safetyScore:      number | null
  mlDirection:      "up" | "neutral" | "down" | null
  mlDirectionScore: number | null
  horizons:         { horizon: number; total: number; regionScore: number | null }[]
  regionName:       string
  nearestStation:   { name: string; distanceM: number } | null
  schoolCount:      number
}

interface Slot {
  aptName:  string
  lawdCd:   string
  address:  string
  data:     PresaleInfo | null
  loading:  boolean
  error:    string | null
}

// ── 유틸 ─────────────────────────────────────────────────────
function fmtManwon(v: number | null | undefined): string {
  if (!v) return "-"
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`
  return `${Math.round(v / 1000)}천만`
}

function gainColor(gain: number | null): string {
  if (gain === null) return "#6B7280"
  if (gain > 5000)  return "#16A34A"
  if (gain > 0)     return "#10B981"
  if (gain > -5000) return "#D97706"
  return "#DC2626"
}

function mlColor(dir: string | null): string {
  if (dir === "up")      return "#16A34A"
  if (dir === "neutral") return "#D97706"
  if (dir === "down")    return "#DC2626"
  return "#9CA3AF"
}

function mlLabel(dir: string | null, score: number | null): string {
  if (dir === null) return "-"
  const s = score != null ? ` (${score.toFixed(1)}점)` : ""
  if (dir === "up")      return `↑ 상승 기대${s}`
  if (dir === "neutral") return `→ 보합${s}`
  return `↓ 하락 기조${s}`
}

// ── 주소 검색 ─────────────────────────────────────────────────
interface Suggestion {
  addressName: string
  roadAddress: string
  lawdCd:      string
}

function SearchInput({ idx, slot, onChange }: {
  idx:      number
  slot:     Slot
  onChange: (idx: number, partial: Partial<Slot>) => void
}) {
  const [sugg, setSugg]     = useState<Suggestion[]>([])
  const [open, setOpen]     = useState(false)
  const [timer, setTimer]   = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleInput = (val: string) => {
    onChange(idx, { aptName: val, lawdCd: "", data: null, error: null })
    if (timer) clearTimeout(timer)
    if (val.length < 2) { setSugg([]); setOpen(false); return }
    setTimer(setTimeout(async () => {
      const res  = await fetch(`/api/kakao-address?q=${encodeURIComponent(val)}`).catch(() => null)
      const data = res ? await res.json().catch(() => ({})) : {}
      setSugg(data.documents ?? [])
      setOpen(true)
    }, 350))
  }

  const handleSelect = (s: Suggestion) => {
    onChange(idx, { aptName: s.addressName, address: s.roadAddress || s.addressName, lawdCd: s.lawdCd, data: null, error: null })
    setSugg([]); setOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={slot.aptName}
        onChange={e => handleInput(e.target.value)}
        placeholder="단지명 또는 주소 입력"
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none",
          background: "#FAFAFA", boxSizing: "border-box",
        }}
      />
      {open && sugg.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden",
        }}>
          {sugg.slice(0, 5).map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #F3F4F6" }}
            >
              <div style={{ fontWeight: 600, color: "#111827" }}>{s.addressName}</div>
              {s.roadAddress && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{s.roadAddress}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 단지 결과 카드 ─────────────────────────────────────────────
function SlotCard({ slot, idx, onChange }: {
  slot:     Slot
  idx:      number
  onChange: (idx: number, partial: Partial<Slot>) => void
}) {
  const handleSearch = async () => {
    if (!slot.aptName) return
    onChange(idx, { loading: true, error: null, data: null })
    try {
      const params = new URLSearchParams({ aptName: slot.aptName })
      if (slot.lawdCd)  params.set("lawdCd",  slot.lawdCd)
      if (slot.address) params.set("address", slot.address)
      const res  = await fetch(`/api/presale-info?${params}`)
      const data = await res.json()
      if (data.error) { onChange(idx, { loading: false, error: data.error }); return }
      onChange(idx, { loading: false, data })
    } catch (e) {
      onChange(idx, { loading: false, error: "조회 중 오류가 발생했습니다." })
    }
  }

  const d = slot.data

  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1.5px solid #E5E7EB",
      padding: 16, display: "flex", flexDirection: "column", gap: 10, minWidth: 0,
    }}>
      {/* 검색창 + 버튼 */}
      <SearchInput idx={idx} slot={slot} onChange={onChange} />
      <button
        onClick={handleSearch}
        disabled={!slot.aptName || slot.loading}
        style={{
          padding: "9px 0", borderRadius: 10, border: "none",
          background: slot.aptName ? "#16A34A" : "#E5E7EB",
          color: slot.aptName ? "#fff" : "#9CA3AF",
          fontSize: 13, fontWeight: 700, cursor: slot.aptName ? "pointer" : "default",
        }}
      >
        {slot.loading ? "조회 중..." : "분석"}
      </button>

      {slot.error && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FCA5A5",
          borderRadius: 10, padding: "10px 12px",
          fontSize: 12, color: "#DC2626", lineHeight: 1.6,
        }}>
          {slot.error}
        </div>
      )}

      {d && (
        <>
          {/* 분양가 */}
          <Section title="분양가">
            {d.salePrice.notReleased ? (
              <Badge bg="#FEF9C3" color="#A16207">분양가 미발표</Badge>
            ) : !d.salePrice.found || (d.salePrice.min === null) ? (
              <Badge bg="#F3F4F6" color="#6B7280">분양가 정보 없음</Badge>
            ) : (
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>
                  {fmtManwon(d.salePrice.min)}
                  {d.salePrice.max ? ` ~ ${fmtManwon(d.salePrice.max)}` : ""}
                </div>
                {d.salePrice.unit && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{d.salePrice.unit}</div>}
              </div>
            )}
          </Section>

          {/* 인근 시세 */}
          <Section title="인근 시세">
            {d.nearbyStats ? (
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>
                  평균 {fmtManwon(d.nearbyStats.avg)}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                  {fmtManwon(d.nearbyStats.min)} ~ {fmtManwon(d.nearbyStats.max)} · {d.nearbyStats.count}건
                </div>
              </div>
            ) : (
              <Badge bg="#F3F4F6" color="#6B7280">시세 정보 없음</Badge>
            )}
          </Section>

          {/* 시세차익 */}
          <Section title="예상 시세차익">
            {d.expectedGain !== null ? (
              <div style={{ fontSize: 18, fontWeight: 900, color: gainColor(d.expectedGain) }}>
                {d.expectedGain >= 0 ? "+" : ""}{fmtManwon(d.expectedGain)}
              </div>
            ) : (
              <Badge bg="#F3F4F6" color="#6B7280">계산 불가</Badge>
            )}
          </Section>

          {/* ML 방향성 */}
          <Section title={`오를지 엔진 방향성${d.regionName ? ` (${d.regionName})` : ""}`}>
            <div style={{ fontSize: 14, fontWeight: 700, color: mlColor(d.mlDirection) }}>
              {mlLabel(d.mlDirection, d.mlDirectionScore)}
            </div>
            {d.horizons.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {d.horizons.map(h => (
                  <div key={h.horizon} style={{
                    background: "#F9FAFB", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "4px 8px", fontSize: 11,
                  }}>
                    <span style={{ color: "#9CA3AF" }}>{h.horizon}M</span>
                    <span style={{ fontWeight: 700, marginLeft: 4, color: (h.regionScore ?? h.total) < 0 ? "#DC2626" : "#16A34A" }}>
                      {(h.regionScore ?? h.total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 입지 요약 */}
          <Section title="입지">
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>
              {d.nearestStation
                ? `🚇 ${d.nearestStation.name} ${d.nearestStation.distanceM}m`
                : "🚇 역 정보 없음"}
              <br />
              🏫 인근 초등학교 {d.schoolCount}곳
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      {children}
    </div>
  )
}

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: bg, color, borderRadius: 8, padding: "3px 8px", fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  )
}

// ── 청약 알림 설정 섹션 ───────────────────────────────────────
function PresaleNotifSection({
  regions,
  onRegionsChange,
}: {
  regions: string[]
  onRegionsChange: (next: string[]) => void
}) {
  const [input, setInput]             = useState("")
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [savedMsg, setSavedMsg]       = useState(false)

  useEffect(() => {
    try {
      const e = localStorage.getItem("notif_enabled_presale")
      if (e !== null) setNotifEnabled(e !== "false")
    } catch { /* ignore */ }
  }, [])

  async function saveRegions(next: string[]) {
    onRegionsChange(next)
    localStorage.setItem("presale_notif_regions", JSON.stringify(next))
    // 백엔드 동기화 (로그인 시에만)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch("/api/push/presale-regions", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ regions: next }),
        }).catch(() => { /* 조용히 실패 */ })
      }
    } catch { /* 조용히 실패 */ }
  }

  function addRegion() {
    const v = input.trim()
    if (!v || regions.includes(v)) return
    saveRegions([...regions, v])
    setInput("")
  }

  function removeRegion(r: string) {
    saveRegions(regions.filter(x => x !== r))
  }

  function toggleNotif() {
    const next = !notifEnabled
    setNotifEnabled(next)
    localStorage.setItem("notif_enabled_presale", String(next))
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 1500)
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "18px 20px", margin: "12px 16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>🔔 청약 알림 설정</div>
        <button onClick={toggleNotif} style={{
          padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
          background: notifEnabled ? "#16A34A" : "#E5E7EB",
          color: notifEnabled ? "#fff" : "#6B7280",
          fontSize: 12, fontWeight: 700, transition: "all 0.15s",
        }}>
          {savedMsg ? "저장됨 ✓" : notifEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
        관심 지역 청약 정보를 매일 아침 푸시로 알려드립니다
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRegion() } }}
          placeholder="예: 강남구, 분당구, 마포구"
          style={{
            flex: 1, padding: "9px 12px", borderRadius: 8,
            border: "1px solid #E5E7EB", fontSize: 13, outline: "none",
            background: "#F9FAFB",
          }}
        />
        <button onClick={addRegion} style={{
          padding: "9px 16px", borderRadius: 8, border: "none", cursor: "pointer",
          background: "#16A34A", color: "#fff", fontSize: 13, fontWeight: 700,
        }}>추가</button>
      </div>
      {regions.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {regions.map(r => (
            <div key={r} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "#F0FDF4", border: "1px solid #BBF7D0",
              borderRadius: 20, padding: "4px 12px",
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#15803D" }}>📍 {r}</span>
              <button onClick={() => removeRegion(r)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 14, color: "#9CA3AF", padding: "0 0 0 4px", lineHeight: 1,
              }}>×</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
          관심 지역을 추가하면 새 청약 소식 알림을 드립니다
        </div>
      )}
    </div>
  )
}

// ── 청약 정보 표시 섹션 ───────────────────────────────────────
interface PresaleItem {
  id: string
  aptName: string
  address: string
  sigungu: string
  totalUnits: number
  supply: { type: string; area: number; count: number; price?: number }[]
  announcementDate: string
  subscribeStartDate: string
  subscribeEndDate: string
  moveInDate: string
  constructionCompany: string
  minPrice: number
  maxPrice: number
  specialSupplyDate?: string
  firstPriorityDate?: string
  source: string
  sourceUrl?: string
  isRead: boolean
  createdAt: string
}

function fmtPrice(min: number, max: number): string {
  const f = (n: number) => {
    if (!n) return ""
    if (n >= 10000) {
      const 억 = Math.floor(n / 10000)
      const 천 = Math.round((n % 10000) / 1000)
      return 천 ? `${억}억${천}천` : `${억}억`
    }
    return `${Math.round(n / 1000)}천만`
  }
  if (!min && !max) return "미정"
  if (!max || min === max) return f(min)
  return `${f(min)}~${f(max)}`
}

function dday(dateStr: string): string {
  if (!dateStr) return ""
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff === 0) return "D-Day"
  if (diff > 0)  return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function PresaleInfoSection({ regions }: { regions: string[] }) {
  const [items, setItems]       = useState<PresaleItem[]>([])
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState("")

  const handleCheck = useCallback(async () => {
    setChecking(true)
    try {
      const res  = await fetch("/api/presales/check", { method: "POST" })
      const data = await res.json()
      if (data.data?.items?.length) {
        setItems(prev => {
          const ids = new Set(prev.map((p: PresaleItem) => p.id))
          return [...data.data.items.filter((i: PresaleItem) => !ids.has(i.id)), ...prev]
        })
      }
      setLastCheck(data.data?.newItems != null
        ? `${data.data.newItems}건 새로 발견`
        : "최신 상태")
    } catch { setLastCheck("오류 발생") }
    setChecking(false)
    setTimeout(() => setLastCheck(""), 3000)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch("/api/presales")
      .then(r => r.json())
      .then(d => {
        const loaded: PresaleItem[] = d.data ?? []
        setItems(loaded)
        // 저장된 데이터가 없으면 자동으로 가져오기
        if (loaded.length === 0) handleCheck()
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [handleCheck])

  const now = new Date()

  // 진행 중인 것만 (청약 마감일이 없거나 아직 지나지 않은 것)
  const active = items.filter(item =>
    !item.subscribeEndDate || new Date(item.subscribeEndDate) >= now
  )

  // 관심 지역 필터링 (regions 없으면 전체 표시)
  const filtered = regions.length > 0
    ? active.filter(item => regions.some(r => item.address.includes(r) || item.sigungu.includes(r)))
    : active

  const sourceColor = (s: string) =>
    s === "청약홈" ? { bg: "#EFF6FF", color: "#1D4ED8" }
    : s === "뉴스"  ? { bg: "#FFF7ED", color: "#C2410C" }
    : { bg: "#F3F4F6", color: "#6B7280" }

  return (
    <div style={{ margin: "12px 16px 0" }}>
      {/* 섹션 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
          📋 청약 정보
          {filtered.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: "#6B7280" }}>
              {filtered.length}건
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lastCheck && <span style={{ fontSize: 11, color: "#16A34A" }}>{lastCheck}</span>}
          <button onClick={handleCheck} disabled={checking} style={{
            padding: "5px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
            background: checking ? "#F3F4F6" : "#fff",
            color: checking ? "#9CA3AF" : "#374151",
            fontSize: 12, fontWeight: 600, cursor: checking ? "not-allowed" : "pointer",
          }}>
            {checking ? "확인 중..." : "🔄 새로 확인"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF", fontSize: 13 }}>
          불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
          padding: "20px 16px", textAlign: "center",
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🏗️</div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>
            {regions.length > 0
              ? "관심 지역 청약 정보가 없습니다"
              : "청약 정보가 없습니다 — '새로 확인'을 눌러보세요"}
          </div>
          {regions.length === 0 && (
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              위 알림 설정에서 관심 지역을 추가하면 해당 지역만 표시됩니다
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(item => {
            const ddStr = dday(item.firstPriorityDate || item.subscribeStartDate)
            const src   = sourceColor(item.source)

            return (
              <div key={item.id} style={{
                background: "#fff", borderRadius: 14, border: "1.5px solid #E5E7EB",
                padding: "16px",
              }}>
                {/* 헤더 행 */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 2 }}>
                      {item.aptName}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{item.address}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    {ddStr && (
                      <span style={{
                        background: ddStr === "D-Day" ? "#DCFCE7" : "#EFF6FF",
                        color: ddStr === "D-Day" ? "#15803D" : "#1D4ED8",
                        fontSize: 12, fontWeight: 800,
                        padding: "3px 8px", borderRadius: 8,
                      }}>{ddStr}</span>
                    )}
                    <span style={{ background: src.bg, color: src.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>
                      {item.source}
                    </span>
                  </div>
                </div>

                {/* 주요 정보 그리드 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 10 }}>
                  {[
                    { label: "분양가", value: fmtPrice(item.minPrice, item.maxPrice) },
                    { label: "세대수", value: item.totalUnits ? `${item.totalUnits.toLocaleString("ko-KR")}세대` : "-" },
                    { label: "특별공급", value: item.specialSupplyDate || "-" },
                    { label: "1순위", value: item.firstPriorityDate || item.subscribeStartDate || "-" },
                    { label: "입주", value: item.moveInDate || "-" },
                    { label: "시공사", value: item.constructionCompany || "-" },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 1 }}>{row.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* 타입별 공급 */}
                {item.supply.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {item.supply.map((s, i) => (
                      <div key={i} style={{
                        background: "#F9FAFB", border: "1px solid #E5E7EB",
                        borderRadius: 7, padding: "4px 8px", fontSize: 11,
                      }}>
                        <span style={{ color: "#374151", fontWeight: 700 }}>{s.type}</span>
                        <span style={{ color: "#9CA3AF", marginLeft: 4 }}>{s.area}㎡</span>
                        {s.count > 0 && <span style={{ color: "#6B7280", marginLeft: 4 }}>{s.count}세대</span>}
                        {s.price && <span style={{ color: "#16A34A", marginLeft: 4 }}>{fmtPrice(s.price, 0)}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <a href="https://www.applyhome.co.kr" target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", marginTop: 10, fontSize: 11, color: "#6B7280", textDecoration: "underline" }}>
                  청약홈에서 보기 →
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────
const EMPTY_SLOT = (): Slot => ({ aptName: "", lawdCd: "", address: "", data: null, loading: false, error: null })

export default function PresaleComparePage() {
  const [slots, setSlots] = useState<Slot[]>([EMPTY_SLOT(), EMPTY_SLOT(), EMPTY_SLOT()])
  const [regions, setRegions] = useState<string[]>([])

  useEffect(() => {
    try {
      const r = localStorage.getItem("presale_notif_regions")
      if (r) setRegions(JSON.parse(r))
    } catch { /* ignore */ }
  }, [])

  const handleChange = useCallback((idx: number, partial: Partial<Slot>) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...partial } : s))
  }, [])

  const filledCount = slots.filter(s => s.data !== null).length

  return (
    <div style={{
      minHeight: "100vh", background: "#F4F6F9",
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      paddingBottom: 80,
    }}>
      {/* 헤더 */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #E5E7EB",
        padding: "16px 20px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>🏗️ 청약</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
          관심 지역 알림 설정 · 최대 3개 단지 비교 분석
        </div>
      </div>

      {/* ── 청약 알림 설정 (상단) ── */}
      <PresaleNotifSection regions={regions} onRegionsChange={setRegions} />

      {/* ── 청약 정보 ── */}
      <PresaleInfoSection regions={regions} />

      {/* 구분선 */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF" }}>청약 비교 분석</div>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
        </div>
      </div>

      {/* 안내 */}
      <div style={{ padding: "10px 16px 0" }}>
        <div style={{
          background: "#EFF6FF", border: "1px solid #BFDBFE",
          borderRadius: 12, padding: "10px 14px",
          fontSize: 12, color: "#1D4ED8", lineHeight: 1.7,
        }}>
          💡 단지명이나 주소를 입력하면 분양가를 뉴스에서 자동으로 찾습니다.
          분양가가 아직 미발표인 단지는 &quot;미발표&quot;로 표시됩니다.
        </div>
      </div>

      {/* 비교 카드 — 가로 스크롤 */}
      <div style={{ padding: "12px 16px", overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(260px, 1fr))",
          gap: 12,
          minWidth: 800,
        }}>
          {slots.map((slot, i) => (
            <SlotCard key={i} idx={i} slot={slot} onChange={handleChange} />
          ))}
        </div>
      </div>

      {/* 비교 요약 테이블 — 2개 이상 조회 시 표시 */}
      {filledCount >= 2 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{
            background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", background: "#F9FAFB",
              borderBottom: "1px solid #E5E7EB",
              fontSize: 13, fontWeight: 800, color: "#111827",
            }}>
              📊 비교 요약
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "10px 14px", color: "#9CA3AF", fontWeight: 600, whiteSpace: "nowrap" }}>항목</td>
                    {slots.filter(s => s.data).map((s, i) => (
                      <td key={i} style={{ padding: "10px 14px", fontWeight: 700, color: "#111827", textAlign: "center", whiteSpace: "nowrap" }}>
                        {s.data!.aptName.length > 12 ? s.data!.aptName.slice(0, 12) + "…" : s.data!.aptName}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "분양가",
                      getValue: (d: PresaleInfo) => d.salePrice.notReleased ? "미발표"
                        : d.salePrice.min ? fmtManwon(d.salePrice.min) + (d.salePrice.max ? `~${fmtManwon(d.salePrice.max)}` : "") : "-",
                    },
                    { label: "인근 시세 평균", getValue: (d: PresaleInfo) => d.nearbyStats ? fmtManwon(d.nearbyStats.avg) : "-" },
                    {
                      label: "예상 시세차익",
                      getValue: (d: PresaleInfo) => d.expectedGain != null
                        ? (d.expectedGain >= 0 ? "+" : "") + fmtManwon(d.expectedGain) : "-",
                      getColor: (d: PresaleInfo) => gainColor(d.expectedGain),
                    },
                    { label: "오를지 엔진 방향성", getValue: (d: PresaleInfo) => mlLabel(d.mlDirection, null), getColor: (d: PresaleInfo) => mlColor(d.mlDirection) },
                    { label: "지역", getValue: (d: PresaleInfo) => d.regionName || "-" },
                    { label: "지하철", getValue: (d: PresaleInfo) => d.nearestStation ? `${d.nearestStation.name} ${d.nearestStation.distanceM}m` : "-" },
                    { label: "인근 초등학교", getValue: (d: PresaleInfo) => `${d.schoolCount}곳` },
                  ].map(row => (
                    <tr key={row.label} style={{ borderBottom: "1px solid #F9FAFB" }}>
                      <td style={{ padding: "9px 14px", color: "#6B7280", fontWeight: 600, whiteSpace: "nowrap", background: "#FAFAFA" }}>
                        {row.label}
                      </td>
                      {slots.filter(s => s.data).map((s, i) => (
                        <td key={i} style={{
                          padding: "9px 14px", textAlign: "center", fontWeight: 700,
                          color: row.getColor ? row.getColor(s.data!) : "#111827",
                        }}>
                          {row.getValue(s.data!)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
