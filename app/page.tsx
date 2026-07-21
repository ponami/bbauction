"use client"
import React, { useState, useEffect, useMemo, useCallback } from "react"

const API = "/gate"
type TabType = "all" | "short-trade" | "rental"
type SortType = "discount" | "price" | "dday" | "fail" | "score"
type AuctionItem = Record<string, any>
type AuctionDetail = Record<string, any>

const TABS: { key: TabType; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "short-trade", label: "단타매매" },
  { key: "rental", label: "임대목적" },
]
const SORTS: { key: SortType; label: string }[] = [
  { key: "discount", label: "할인율 높은순" },
  { key: "score", label: "투자점수 높은순" },
  { key: "price", label: "최저가 낮은순" },
  { key: "dday", label: "마감임박순" },
  { key: "fail", label: "유찰많은순" },
]

const regions = ["전체","서울","인천","경기","부산","대구","광주","대전","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주"]
const regionMap: Record<string, string> = { 서울:"11", 인천:"28", 경기:"41", 부산:"26", 대구:"27", 광주:"29", 대전:"30", 울산:"31", 세종:"36", 강원:"42", 충북:"43", 충남:"44", 전북:"45", 전남:"46", 경북:"47", 경남:"48", 제주:"50" }
const kinds = ["아파트","오피스텔","다세대","연립","단독","빌라"]

function fmt(v: number | null | undefined): string {
  if (!v) return "-"
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`
  return `${v.toLocaleString()}만`
}
function discOf(i: AuctionItem): number {
  return i.discount_vs_appraisal_pct ?? i.discount_pct ?? i.discount_vs_market_pct ?? 0
}
function getDday(date: string | null): { text: string; urgent: boolean; days: number } {
  if (!date) return { text: "-", urgent: false, days: 999 }
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { text: "기일경과", urgent: false, days: diff }
  if (diff === 0) return { text: "D-Day", urgent: true, days: 0 }
  return { text: `D-${diff}`, urgent: diff <= 7, days: diff }
}
function kindColor(k: string): { bg: string; text: string } {
  if (k.includes("아파트")) return { bg: "#EFF6FF", text: "#1E40AF" }
  if (k.includes("오피스텔")) return { bg: "#FDF2F8", text: "#9D174D" }
  if (k.includes("다세대") || k.includes("연립")) return { bg: "#ECFDF5", text: "#065F46" }
  if (k.includes("단독") || k.includes("다가구")) return { bg: "#FFF7ED", text: "#9A3412" }
  return { bg: "#F3F4F6", text: "#374151" }
}
function investScore(i: AuctionItem): number {
  const d = discOf(i)
  const f = i.fail_count ?? 0
  const a = i.area_m2 ?? 0
  const dd = getDday(i.sale_date)
  let s = Math.min(d * 1.5, 75)
  s += f === 1 ? 10 : f === 2 ? 5 : f >= 3 ? 0 : 15
  s += a > 0 && a < 60 ? 15 : a < 85 ? 10 : a < 135 ? 5 : 0
  if (dd.days <= 7) s += 15
  else if (dd.days <= 14) s += 10
  else if (dd.days <= 30) s += 5
  return Math.min(100, Math.max(0, Math.round(s)))
}
function scoreColor(s: number): string {
  if (s >= 70) return "#059669"
  if (s >= 40) return "#D97706"
  return "#DC2626"
}

export default function BibiAuction() {
  const [tab, setTab] = useState<TabType>("all")
  const [sort, setSort] = useState<SortType>("discount")
  const [items, setItems] = useState<AuctionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterRegion, setFilterRegion] = useState("전체")
  const [minDisc, setMinDisc] = useState(0)
  const [filterKind, setFilterKind] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<AuctionItem | null>(null)
  const [detail, setDetail] = useState<AuctionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [budgetEok, setBudgetEok] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const url = tab === "all" ? `${API}/auction/list?lat_min=33&lat_max=39&lon_min=124&lon_max=132&limit=500` : `${API}/auction/filter/${tab}?limit=500`
      const res = await fetch(url)
      if (!res.ok) throw new Error("데이터 로딩 실패")
      const data = await res.json()
      setItems(Array.isArray(data) ? data : data.items ?? [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`${API}/auction/${id}`)
      if (res.ok) setDetail(await res.json())
    } catch {} finally { setDetailLoading(false) }
  }, [])

  const openDetail = useCallback((item: AuctionItem) => {
    setSelected(item)
    setDetail(null)
    loadDetail(item.id)
  }, [loadDetail])

  const filtered = useMemo(() => {
    let list = [...items]
    if (filterRegion !== "전체") {
      const cd = regionMap[filterRegion]
      list = list.filter(i => (i.lawd_cd ?? "").startsWith(cd))
    }
    if (minDisc > 0) list = list.filter(i => discOf(i) >= minDisc)
    if (filterKind.length > 0) list = list.filter(i => filterKind.some(k => (i.kind ?? "").includes(k)))
    const budgetManwon = parseFloat(budgetEok) * 10000
    if (budgetManwon > 0) list = list.filter(i => (i.min_bid_price ?? 9e9) <= budgetManwon * 1.2)
    switch (sort) {
      case "discount": list.sort((a, b) => discOf(b) - discOf(a)); break
      case "price": list.sort((a, b) => (a.min_bid_price ?? 9e9) - (b.min_bid_price ?? 9e9)); break
      case "dday": list.sort((a, b) => (a.sale_date ?? "z").localeCompare(b.sale_date ?? "z")); break
      case "fail": list.sort((a, b) => (b.fail_count ?? 0) - (a.fail_count ?? 0)); break
      case "score": list.sort((a, b) => investScore(b) - investScore(a)); break
    }
    return list
  }, [items, filterRegion, minDisc, filterKind, sort, budgetEok])

  const stats = useMemo(() => {
    if (!filtered.length) return { total: 0, avgDisc: 0, avgScore: 0 }
    return {
      total: filtered.length,
      avgDisc: +(filtered.reduce((s, i) => s + discOf(i), 0) / filtered.length).toFixed(1),
      avgScore: Math.round(filtered.reduce((s, i) => s + investScore(i), 0) / filtered.length),
    }
  }, [filtered])

  const top5 = useMemo(() => [...filtered].sort((a, b) => investScore(b) - investScore(a)).slice(0, 5), [filtered])

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "16px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Title + Budget */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 28 }}>⚖️</span>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0 }}>비비옥션</h1>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>크게 싸게, 안전하게</p>
            </div>
            {/* Budget Input */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "6px 12px" }}>
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>자본금</span>
                <input type="number" value={budgetEok} onChange={e => setBudgetEok(e.target.value)} placeholder="예: 3" step={0.1} min={0}
                  style={{ width: 60, border: "none", background: "transparent", fontSize: 16, fontWeight: 700, color: "#0F172A", outline: "none", textAlign: "right" }} />
                <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>억</span>
              </div>
              <a href="/map" style={{ padding: "8px 14px", borderRadius: 10, background: "#EFF6FF", color: "#1E40AF", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🗺️ 지도에서 보기</a>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <span style={{ background: "#F1F5F9", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#334155" }}>
              추천 <b>{stats.total}</b>건
            </span>
            <span style={{ background: "#ECFDF5", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#059669" }}>
              평균 할인 <b>{stats.avgDisc}%</b>
            </span>
            <span style={{ background: "#EFF6FF", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>
              평균 점수 <b>{stats.avgScore}</b>
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "8px 20px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none",
                background: tab === t.key ? "#0F172A" : "#F1F5F9", color: tab === t.key ? "#fff" : "#64748B",
              }}>{t.label}</button>
            ))}
            <button onClick={() => setShowFilters(!showFilters)} style={{
              marginLeft: "auto", padding: "8px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer",
              background: showFilters ? "#FEF2F2" : "#F1F5F9", border: "none", color: showFilters ? "#DC2626" : "#64748B", fontWeight: 600,
            }}>🔍 필터</button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>지역</label>
                  <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>최소 할인율: {minDisc}%</label>
                  <input type="range" min={0} max={80} step={5} value={minDisc} onChange={e => setMinDisc(+e.target.value)} style={{ width: 120 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>물건종류</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {kinds.map(k => (
                      <button key={k} onClick={() => setFilterKind(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} style={{
                        padding: "4px 10px", borderRadius: 12, fontSize: 11, cursor: "pointer", border: "none",
                        background: filterKind.includes(k) ? "#0F172A" : "#E2E8F0", color: filterKind.includes(k) ? "#fff" : "#64748B",
                      }}>{k}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setFilterRegion("전체"); setMinDisc(0); setFilterKind([]) }} style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                  background: "#FEE2E2", border: "none", color: "#DC2626", fontWeight: 600,
                }}>초기화</button>
              </div>
            </div>
          )}

          {/* Sort */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <select value={sort} onChange={e => setSort(e.target.value as SortType)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}>
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>{filtered.length}건</span>
          </div>
        </div>
      </header>

      {/* Top 5 */}
      {!loading && top5.length > 0 && (
        <div style={{ maxWidth: 1200, margin: "16px auto 0", padding: "0 20px" }}>
          <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "12px 16px", border: "1px solid #FDE68A" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>🏆 TOP5 추천</span>
            <div style={{ display: "flex", gap: 12, marginTop: 8, overflowX: "auto" }}>
              {top5.map((it) => (
                <div key={it.id} onClick={() => openDetail(it)} style={{
                  flex: "0 0 auto", minWidth: 160, background: "#fff", borderRadius: 8, padding: "8px 12px", cursor: "pointer",
                  border: "1px solid #FDE68A", fontSize: 12,
                }}>
                  <div style={{ fontWeight: 800, color: scoreColor(investScore(it)), fontSize: 20 }}>{investScore(it)}</div>
                  <div style={{ fontWeight: 600, color: "#0F172A", marginTop: 2 }}>{it.bld_nm || it.kind}</div>
                  <div style={{ color: "#64748B" }}>{fmt(it.min_bid_price)} · -{discOf(it)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", height: 200, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <p style={{ color: "#DC2626", marginTop: 8 }}>{error}</p>
            <button onClick={load} style={{ marginTop: 12, padding: "8px 20px", background: "#0F172A", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>재시도</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40 }}>📭</div>
            <p style={{ color: "#64748B", marginTop: 8 }}>조건에 맞는 물건이 없습니다</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filtered.map(item => {
              const d = discOf(item)
              const dd = getDday(item.sale_date)
              const kc = kindColor(item.kind ?? "")
              const sc = investScore(item)
              const py = item.area_m2 ? Math.round(item.area_m2 * 0.3025 * 10) / 10 : null
              return (
                <div key={item.id} onClick={() => openDetail(item)} style={{
                  background: "#fff", borderRadius: 14, padding: 16, cursor: "pointer",
                  border: "1px solid #E2E8F0", transition: "all 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                  onMouseOver={e => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)")}
                  onMouseOut={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ background: kc.bg, color: kc.text, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{item.kind}</span>
                    <span style={{ fontSize: 13, color: dd.urgent ? "#DC2626" : "#64748B", fontWeight: dd.urgent ? 700 : 400 }}>{dd.text}</span>
                    {item.fail_count > 0 && <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>유찰{item.fail_count}</span>}
                    <div style={{ marginLeft: "auto", background: scoreColor(sc), color: "#fff", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{sc}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 2, lineHeight: 1.4 }}>{item.bld_nm || item.address?.split(" ").slice(0, 3).join(" ")}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>{item.address}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>감정가</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#334155", fontVariantNumeric: "tabular-nums" }}>{fmt(item.appraisal_price)}</div>
                    </div>
                    <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "#DC2626" }}>최저가</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{fmt(item.min_bid_price)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    {d > 0 && <span style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>-{d}%</span>}
                    {py && <span style={{ fontSize: 12, color: "#94A3B8" }}>{item.area_m2}m²({py}평)</span>}
                    {item.oreulji_score != null && <span style={{ fontSize: 11, color: "#1E40AF", fontWeight: 600 }}>오를지 {item.oreulji_score}점</span>}
                    <span style={{ fontSize: 11, color: "#CBD5E1", marginLeft: "auto" }}>{item.court}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Detail Modal — richgo style */}
      {selected && (
        <div onClick={() => { setSelected(null); setDetail(null) }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px 16px 0 0", maxWidth: 600, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 0 }}>
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ background: kindColor(selected.kind ?? "").bg, color: kindColor(selected.kind ?? "").text, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{selected.kind}</span>
                    {detail?.beginner_grade && <span style={{ fontSize: 14 }}>{detail.beginner_grade.emoji} {detail.beginner_grade.label}</span>}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0" }}>{selected.bld_nm || selected.kind}</h2>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>{selected.address}</p>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0" }}>{selected.display_no} · {selected.court}</p>
                </div>
                <button onClick={() => { setSelected(null); setDetail(null) }} style={{ background: "#F1F5F9", border: "none", width: 36, height: 36, borderRadius: "50%", fontSize: 18, cursor: "pointer", color: "#64748B" }}>×</button>
              </div>
            </div>

            <div style={{ padding: "16px 24px 24px" }}>
              {/* Price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>감정가</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#334155" }}>{fmt(selected.appraisal_price)}</div>
                </div>
                <div style={{ background: "#FEF2F2", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#DC2626" }}>최저가</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#DC2626" }}>{fmt(selected.min_bid_price)}</div>
                </div>
                <div style={{ background: "#ECFDF5", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#059669" }}>할인율</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#059669" }}>-{discOf(selected)}%</div>
                </div>
              </div>

              {/* Info */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <span style={{ background: "#F1F5F9", padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>{selected.area_m2}m² ({selected.area_m2 ? Math.round(selected.area_m2 * 0.3025 * 10) / 10 : "-"}평)</span>
                <span style={{ background: "#F1F5F9", padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>{getDday(selected.sale_date).text}</span>
                {selected.fail_count > 0 && <span style={{ background: "#FEF3C7", color: "#92400E", padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>유찰 {selected.fail_count}회</span>}
                {selected.matched_apt_nm && <span style={{ background: "#EFF6FF", color: "#1E40AF", padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>{selected.matched_apt_nm}</span>}
              </div>

              {/* Market comparison */}
              {selected.discount_vs_market_pct != null && (
                <div style={{ background: "#ECFDF5", borderRadius: 10, padding: 14, marginBottom: 16, border: "1px solid #A7F3D0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>시세 대비 {selected.discount_vs_market_pct}% 저렴</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>매칭 단지: {selected.matched_apt_nm}</div>
                </div>
              )}

              {/* Beginner Grade */}
              {detail?.beginner_grade && (
                <div style={{ background: detail.beginner_grade.level === "위험" ? "#FEF2F2" : "#F0FDF4", borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${detail.beginner_grade.level === "위험" ? "#FECACA" : "#BBF7D0"}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{detail.beginner_grade.emoji} {detail.beginner_grade.label}</div>
                  {detail.beginner_grade.reasons?.map((r: string, i: number) => <div key={i} style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>• {r}</div>)}
                  {detail.beginner_grade.caution && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8, padding: "8px", background: "rgba(0,0,0,0.03)", borderRadius: 6 }}>{detail.beginner_grade.caution}</div>}
                </div>
              )}

              {/* Required Checks */}
              {detail?.required_checks?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>⚠️ 필수 확인사항</h3>
                  {detail.required_checks.map((c: any, i: number) => (
                    <div key={i} style={{ padding: "10px 12px", background: "#FFFBEB", borderRadius: 8, marginBottom: 6, border: "1px solid #FDE68A" }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{c.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Journey Guide */}
              {detail?.journey_guide?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📋 진행 단계</h3>
                  {detail.journey_guide.map((s: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.stage}</div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>{s.items?.join(" · ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {detail?.timeline?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📅 타임라인</h3>
                  {detail.timeline.map((t: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#F8FAFC", borderRadius: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>{t.when}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{t.tasks?.join(" · ")}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Map link */}
              {selected.lat && selected.lon && (
                <a href={`https://map.naver.com/v5/search/${selected.address}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "12px", background: "#0F172A", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", marginTop: 16 }}>
                  🗺️ 네이버 지도에서 위치 보기
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}
