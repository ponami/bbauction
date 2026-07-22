"use client"

import { useEffect, useState, useCallback } from "react"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

interface RankingItem {
  rank: number
  apt_id: number
  apt_nm: string
  umd_nm: string
  sigungu_nm: string
  max_price: number
  latest_price: number
  trade_count: number
  total_trades: number
  lat: number | null
  lon: number | null
  umd_total_apts: number
}

interface RankingResponse {
  type: "price" | "volume"
  limit: number
  total_umd: number
  results: RankingItem[]
}

interface Props {
  onSelectApt: (apt_id: number, apt_nm: string, lat: number, lon: number, sigungu_cd: string) => void
}

export default function RankingPanel({ onSelectApt }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"price" | "volume">("price")
  const [data, setData] = useState<RankingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRankings = useCallback(async (type: "price" | "volume") => {
    setLoading(true)
    setError(null)
    try {
      const url = `${GATE_URL}/rankings/panel?type=${type}&limit=20`
      console.log("[RankingPanel] fetching", url)
      const r = await fetch(url)
      console.log("[RankingPanel] response", r.status, r.statusText)
      if (r.ok) {
        const json = await r.json()
        console.log("[RankingPanel] data", json?.results?.length ?? 0, "items")
        setData(json)
      } else {
        setError(`서버 오류 (${r.status})`)
      }
    } catch (e) {
      console.error("[RankingPanel] fetch error", e)
      setError("네트워크 오류")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) fetchRankings(tab)
  }, [open, tab, fetchRankings])

  const handleItemClick = (item: RankingItem) => {
    if (item.lat && item.lon) {
      onSelectApt(item.apt_id, item.apt_nm, item.lat, item.lon, "")
    }
  }

  const formatPrice = (v: number) => {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}억`
    return `${v.toLocaleString()}만`
  }

  return (
    <div style={{ position: "relative", width: "fit-content", zIndex: 200 }}>
      {/* 토글 버튼 */}
      <button
        onClick={() => { setOpen(!open); if (!open) setTab("price") }}
        style={{
          background: open ? "#1A2B4A" : "rgba(17,24,39,0.85)",
          backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(255,255,255,0.15)",
          borderRadius: 20,
          padding: "6px 14px",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ fontSize: 14 }}>🏆</span>
        {open ? "랭킹 닫기" : "랭킹"}
      </button>

      {/* 패널 */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 200,
          width: 300, maxWidth: "calc(100vw - 24px)",
          maxHeight: "calc(100vh - 200px)",
          background: "rgba(23,25,35,0.95)",
          backdropFilter: "blur(12px)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* 헤더 */}
          <div style={{
            padding: "12px 14px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              🏆 실거래 랭킹
            </div>
            {/* 탭 */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["price", "volume"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    fontSize: 11,
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: tab === t ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
                    color: tab === t ? "#818CF8" : "#6B7280",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t === "price" ? "💰 고가 TOP" : "📊 거래량 TOP"}
                </button>
              ))}
            </div>
          </div>

          {/* 리스트 */}
          <div style={{
            overflowY: "auto",
            flex: 1,
            padding: "4px 0",
          }}>
            {loading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#6B7280", fontSize: 12 }}>
                로딩중...
              </div>
            ) : error ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                <div style={{ color: "#EF4444", fontSize: 12, marginBottom: 6 }}>{error}</div>
                <button
                  onClick={() => fetchRankings(tab)}
                  style={{
                    background: "rgba(99,102,241,0.2)", border: "none",
                    borderRadius: 8, padding: "4px 12px",
                    color: "#818CF8", fontSize: 11, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  다시 시도
                </button>
              </div>
            ) : !data || data.results.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#6B7280", fontSize: 12 }}>
                데이터 없음
              </div>
            ) : (
              data.results.map((item, idx) => (
                <button
                  key={item.apt_id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 14px",
                    border: "none",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  {/* 순위 */}
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                    background: idx < 3 ? "linear-gradient(135deg,#FFD700,#FFA500)" : "rgba(255,255,255,0.1)",
                    color: idx < 3 ? "#1A2B4A" : "#9CA3AF",
                  }}>
                    {item.rank}
                  </div>
                  {/* 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.apt_nm}
                    </div>
                    <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>
                      {item.sigungu_nm} {item.umd_nm}
                    </div>
                  </div>
                  {/* 값 */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: tab === "price" ? "#FBBF24" : "#60A5FA" }}>
                      {tab === "price" ? formatPrice(item.max_price) : `${item.trade_count}건`}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 하단 정보 */}
          <div style={{
            padding: "6px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 10,
            color: "#6B7280",
            textAlign: "center",
          }}>
            행정동당 1개씩 · 총 {data?.total_umd ?? 0}개 동
          </div>
        </div>
      )}
    </div>
  )
}
