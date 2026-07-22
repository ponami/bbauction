"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface SearchResult {
  apt_id: number
  apt_nm: string
  sido_nm: string
  sigungu_nm: string
  umd_nm: string
  sigungu_cd: string
  lat: number
  lon: number
  households: number | null
  build_year: number | null
  score: number | null
  is_presale?: boolean
  is_predicted_score?: boolean
}

interface Props {
  onSelect: (result: SearchResult) => void
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

export default function MapSearchBar({ onSelect }: Props) {
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<SearchResult[]>([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef            = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`${GATE_URL}/apt/search?q=${encodeURIComponent(q)}&limit=10`)
      if (!res.ok) return
      const data = await res.json()
      setResults(data.results ?? [])
      setOpen(true)
    } catch {
      // 검색 실패는 조용히 무시
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(r: SearchResult) {
    setQuery(r.apt_nm)
    setOpen(false)
    onSelect(r)
  }

  function handleClear() {
    setQuery("")
    setResults([])
    setOpen(false)
  }

  function scoreColor(score: number | null) {
    if (score == null) return "#9CA3AF"
    if (score >= 75) return "#2ECC71"
    if (score >= 64) return "#27AE60"
    if (score >= 56) return "#F39C12"
    if (score >= 50) return "#E67E22"
    return "#E74C3C"
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* 입력창 */}
      <div style={{
        display: "flex", alignItems: "center",
        background: "#fff", borderRadius: 12,
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        border: "1.5px solid #E5E7EB",
        padding: "0 12px", gap: 8, height: 44,
      }}>
        <span style={{ fontSize: 17, flexShrink: 0 }}>🔍</span>
        <input
          type="search"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="아파트명 또는 지역으로 검색"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          style={{
            flex: 1, border: "none", outline: "none",
            fontSize: 14, color: "#111827",
            background: "transparent",
            fontFamily: "'Pretendard', sans-serif",
          }}
        />
        {loading && (
          <div style={{
            width: 16, height: 16, border: "2px solid #E5E7EB",
            borderTopColor: "#6366F1", borderRadius: "50%",
            animation: "spin 0.7s linear infinite", flexShrink: 0,
          }} />
        )}
        {query && !loading && (
          <button
            onClick={handleClear}
            style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}
          >×</button>
        )}
      </div>

      {/* 드롭다운 결과 */}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          border: "1px solid #E5E7EB",
          overflow: "hidden", zIndex: 500,
          maxHeight: 360, overflowY: "auto",
        }}>
          {results.reduce<{ region: string; items: typeof results }[]>((groups, r) => {
            const region = [r.sigungu_nm, r.umd_nm].filter(Boolean).join(" ")
            const last = groups[groups.length - 1]
            if (last && last.region === region) { last.items.push(r) }
            else { groups.push({ region, items: [r] }) }
            return groups
          }, []).map((group, gi) => (
            <div key={group.region}>
              {gi > 0 && <div style={{ height: 1, background: "#E5E7EB", margin: "4px 0" }} />}
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", padding: "6px 14px 2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {group.region}
              </div>
              {group.items.map((r, i) => (
                <button
                  key={r.apt_id}
                  onClick={() => handleSelect(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 14px",
                    background: "none", border: "none", cursor: "pointer",
                    textAlign: "left",
                    borderBottom: i < group.items.length - 1 ? "1px solid #F3F4F6" : "none",
                  }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              {/* 점수 뱃지 */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: scoreColor(r.score),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 11, fontWeight: 800,
              }}>
                {r.score != null ? r.score : "–"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.apt_nm}
                  {r.is_presale && (
                    <span style={{
                      display: "inline-block", marginLeft: 6,
                      background: "#F3E8FF", color: "#7C3AED",
                      fontSize: 9, fontWeight: 800,
                      borderRadius: 4, padding: "1px 6px",
                      verticalAlign: "middle",
                    }}>분양</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                  {[r.sido_nm, r.sigungu_nm, r.umd_nm].filter(Boolean).join(" ")}
                  {r.households ? ` · ${r.households.toLocaleString()}세대` : ""}
                  {r.build_year ? ` · ${r.build_year}년` : ""}
                </div>
              </div>
            </button>
          ))}
            </div>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.trim().length >= 1 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", borderRadius: 12, padding: "14px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: "1px solid #E5E7EB",
          fontSize: 13, color: "#6B7280", textAlign: "center", zIndex: 500,
        }}>
          검색 결과가 없습니다
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
