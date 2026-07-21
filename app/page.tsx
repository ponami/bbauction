"use client"
import React, { useState, useEffect, useMemo, useCallback } from "react"

const API = "/gate"
type TabType = "all" | "short-trade" | "rental"
type SortType = "discount" | "price" | "dday" | "fail" | "score"
type AuctionItem = Record<string, any>

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

function formatWon(v: number | null | undefined): string {
  if (!v) return "-"
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`
  return `${v.toLocaleString()}만`
}
function calcDisc(item: AuctionItem): number {
  return item.discount_pct ?? item.discount_vs_market_pct ?? item.discount_vs_appraisal_pct ?? 0
}
function getDday(date: string | null): { text: string; urgent: boolean } {
  if (!date) return { text: "-", urgent: false }
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { text: "기일경과", urgent: false }
  if (diff === 0) return { text: "D-Day", urgent: true }
  return { text: `D-${diff}`, urgent: diff <= 7 }
}
function getKindColor(kind: string): { bg: string; text: string } {
  if (kind.includes("아파트")) return { bg: "#EFF6FF", text: "#1E40AF" }
  if (kind.includes("오피스텔")) return { bg: "#FDF2F8", text: "#9D174D" }
  if (kind.includes("다세대") || kind.includes("연립")) return { bg: "#ECFDF5", text: "#065F46" }
  if (kind.includes("단독") || kind.includes("다가구")) return { bg: "#FFF7ED", text: "#9A3412" }
  return { bg: "#F3F4F6", text: "#374151" }
}
function investScore(item: AuctionItem): number {
  const disc = calcDisc(item)
  const fail = item.fail_count ?? 0
  const area = item.area_m2 ?? 0
  const dd = getDday(item.sale_date)
  let s = Math.min(disc * 1.5, 75)
  s += fail === 1 ? 10 : fail === 2 ? 5 : 0
  s += area < 60 ? 15 : area < 85 ? 10 : area < 135 ? 5 : 0
  if (dd.urgent) s += 15
  return Math.min(100, Math.round(s))
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

  const regions = ["전체","서울","인천","경기","부산","대구","광주","대전","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주"]
  const regionMap: Record<string, string> = { 서울:"11", 인천:"28", 경기:"41", 부산:"26", 대구:"27", 광주:"29", 대전:"30", 울산:"31", 세종:"36", 강원:"42", 충북:"43", 충남:"44", 전북:"45", 전남:"46", 경북:"47", 경남:"48", 제주:"50" }
  const kinds = ["아파트","오피스텔","다세대","연립","단독","빌라"]

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

  const filtered = useMemo(() => {
    let list = [...items]
    if (filterRegion !== "전체") {
      const cd = regionMap[filterRegion]
      list = list.filter(i => (i.lawd_cd ?? "").startsWith(cd))
    }
    if (minDisc > 0) list = list.filter(i => calcDisc(i) >= minDisc)
    if (filterKind.length > 0) list = list.filter(i => filterKind.some(k => (i.kind ?? "").includes(k)))
    switch (sort) {
      case "discount": list.sort((a, b) => calcDisc(b) - calcDisc(a)); break
      case "price": list.sort((a, b) => (a.min_bid_price ?? 9e9) - (b.min_bid_price ?? 9e9)); break
      case "dday": list.sort((a, b) => (a.sale_date ?? "z").localeCompare(b.sale_date ?? "z")); break
      case "fail": list.sort((a, b) => (b.fail_count ?? 0) - (a.fail_count ?? 0)); break
      case "score": list.sort((a, b) => investScore(b) - investScore(a)); break
    }
    return list
  }, [items, filterRegion, minDisc, filterKind, sort])

  const stats = useMemo(() => {
    if (!filtered.length) return { total: 0, avgDisc: 0, avgPrice: 0, avgScore: 0 }
    return {
      total: filtered.length,
      avgDisc: +(filtered.reduce((s, i) => s + calcDisc(i), 0) / filtered.length).toFixed(1),
      avgPrice: Math.round(filtered.reduce((s, i) => s + (i.min_bid_price ?? 0), 0) / filtered.length),
      avgScore: Math.round(filtered.reduce((s, i) => s + investScore(i), 0) / filtered.length),
    }
  }, [filtered])

  const top5 = useMemo(() => [...filtered].sort((a, b) => investScore(b) - investScore(a)).slice(0, 5), [filtered])

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "16px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>⚖️</span>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0 }}>비비옥션</h1>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>크게 싸게, 안전하게</p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <span style={{ background: "#F1F5F9", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                추천 <b>{stats.total}</b>건
              </span>
              <span style={{ background: "#EFF6FF", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>
                평균 {stats.avgScore}점
              </span>
            </div>
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>지역</label>
                  <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>최소 할인율</label>
                  <input type="range" min={0} max={80} step={5} value={minDisc} onChange={e => setMinDisc(+e.target.value)} style={{ width: 120 }} />
                  <span style={{ fontSize: 12, color: "#64748B", marginLeft: 8 }}>{minDisc}%+</span>
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
                  alignSelf: "flex-end", padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                  background: "#FEE2E2", border: "none", color: "#DC2626", fontWeight: 600,
                }}>초기화</button>
              </div>
            </div>
          )}

          {/* Sort */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#94A3B8" }}>정렬</span>
              <select value={sort} onChange={e => setSort(e.target.value as SortType)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}>
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>{filtered.length}건 표시</span>
          </div>
        </div>
      </header>

      {/* Top 5 */}
      {!loading && top5.length > 0 && (
        <div style={{ maxWidth: 1200, margin: "16px auto 0", padding: "0 20px" }}>
          <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "12px 16px", border: "1px solid #FDE68A" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>🏆 TOP5 추천</span>
            <div style={{ display: "flex", gap: 12, marginTop: 8, overflowX: "auto" }}>
              {top5.map((it, i) => (
                <div key={it.id} onClick={() => setSelected(it)} style={{
                  flex: "0 0 auto", minWidth: 160, background: "#fff", borderRadius: 8, padding: "8px 12px", cursor: "pointer",
                  border: "1px solid #FDE68A", fontSize: 12,
                }}>
                  <div style={{ fontWeight: 700, color: scoreColor(investScore(it)), fontSize: 18 }}>{investScore(it)}</div>
                  <div style={{ fontWeight: 600, color: "#0F172A", marginTop: 2 }}>{it.bld_nm || it.kind}</div>
                  <div style={{ color: "#64748B" }}>{formatWon(it.min_bid_price)} · {calcDisc(it)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", height: 180, animation: "pulse 1.5s infinite" }}>
                <div style={{ background: "#E2E8F0", height: 20, width: 80, borderRadius: 10, marginBottom: 12 }} />
                <div style={{ background: "#E2E8F0", height: 16, width: "70%", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ background: "#E2E8F0", height: 12, width: "50%", borderRadius: 4, marginBottom: 12 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#E2E8F0", height: 48, borderRadius: 8 }} />
                  <div style={{ background: "#E2E8F0", height: 48, borderRadius: 8 }} />
                </div>
              </div>
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
              const disc = calcDisc(item)
              const dday = getDday(item.sale_date)
              const kc = getKindColor(item.kind ?? "")
              const score = investScore(item)
              const pyeong = item.area_m2 ? Math.round(item.area_m2 * 0.3025 * 10) / 10 : null
              return (
                <div key={item.id} onClick={() => setSelected(item)} style={{
                  background: "#fff", borderRadius: 12, padding: 16, cursor: "pointer",
                  border: "1px solid #E2E8F0", transition: "all 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                  onMouseOver={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                  onMouseOut={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)")}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ background: kc.bg, color: kc.text, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{item.kind}</span>
                    <span style={{ fontSize: 12, color: dday.urgent ? "#DC2626" : "#64748B", fontWeight: dday.urgent ? 700 : 400 }}>{dday.text}</span>
                    {item.fail_count > 0 && <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>유찰 {item.fail_count}회</span>}
                    <div style={{ marginLeft: "auto", background: scoreColor(score), color: "#fff", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{score}</div>
                  </div>
                  {/* Address */}
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 4, lineHeight: 1.4 }}>
                    {item.bld_nm || item.address?.split(" ").slice(0, 3).join(" ")}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>{item.address?.split(" ").slice(0, 4).join(" ")}</div>
                  {/* Price grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>감정가</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#334155", fontVariantNumeric: "tabular-nums" }}>{formatWon(item.appraisal_price)}</div>
                    </div>
                    <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 11, color: "#DC2626" }}>최저가</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{formatWon(item.min_bid_price)}</div>
                    </div>
                  </div>
                  {/* Bottom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    {disc > 0 && <span style={{ fontSize: 20, fontWeight: 800, color: "#059669" }}>-{disc}%</span>}
                    {pyeong && <span style={{ fontSize: 12, color: "#94A3B8" }}>{item.area_m2}m² ({pyeong}평)</span>}
                    <span style={{ fontSize: 11, color: "#CBD5E1", marginLeft: "auto" }}>{item.court}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px 16px 0 0", maxWidth: 600, width: "100%", maxHeight: "80vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{selected.bld_nm || selected.kind}</h2>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#94A3B8" }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>{selected.address}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>감정가</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#334155" }}>{formatWon(selected.appraisal_price)}</div>
              </div>
              <div style={{ background: "#FEF2F2", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#DC2626" }}>최저입찰가</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#DC2626" }}>{formatWon(selected.min_bid_price)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ background: "#ECFDF5", color: "#059669", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>할인 {calcDisc(selected)}%</span>
              {selected.fail_count > 0 && <span style={{ background: "#FEF3C7", color: "#92400E", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>유찰 {selected.fail_count}회</span>}
              <span style={{ background: "#EFF6FF", color: "#1E40AF", padding: "6px 14px", borderRadius: 20, fontSize: 13 }}>{getDday(selected.sale_date).text}</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B" }}>
              <div>법원: {selected.court}</div>
              <div>면적: {selected.area_m2}m² ({selected.area_m2 ? Math.round(selected.area_m2 * 0.3025 * 10) / 10 : "-"}평)</div>
              <div>매각기일: {selected.sale_date}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}
