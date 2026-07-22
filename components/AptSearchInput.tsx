"use client"

import { useState, useEffect, useRef } from "react"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

export type AptSelection = {
  aptId: number
  aptName: string
  address: string   // "시군구 읍면동" 형태
  lawdCd: string
  pyeong?: number
  dong?: string
}

type SearchResult = {
  apt_id: number
  apt_nm: string
  sido_nm: string
  sigungu_nm: string
  umd_nm: string
  sigungu_cd: string
  score?: number
}

type PyeongItem = {
  pyeong: number
  latest_price: number | null
  latest_yyyymm: string | null
}

interface Props {
  value?: AptSelection | null
  onChange: (apt: AptSelection) => void
  placeholder?: string
}

export default function AptSearchInput({ value, onChange, placeholder = "아파트명 또는 주소 입력" }: Props) {
  const [query, setQuery]         = useState(value ? value.aptName : "")
  const [results, setResults]     = useState<SearchResult[]>([])
  const [loading, setLoading]     = useState(false)
  const [showDrop, setShowDrop]   = useState(false)
  // value로 초기화된 경우 = 이미 선택 완료 상태 (프리셋·내 아파트 주입 시 재검색 방지)
  const [selected, setSelected]   = useState<SearchResult | null>(
    value ? ({ apt_id: value.aptId, apt_nm: value.aptName, sido_nm: "", sigungu_nm: "", umd_nm: "", sigungu_cd: value.lawdCd } as SearchResult) : null
  )
  const [pyeongs, setPyeongs]     = useState<PyeongItem[]>([])
  const [pyeong, setPyeong]       = useState<number | undefined>(value?.pyeong)
  const [dong, setDong]           = useState(value?.dong || "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDrop(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // 검색어 디바운스
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      setShowDrop(false)
      return
    }
    if (selected && selected.apt_nm === query) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${GATE_URL}/apt/search?q=${encodeURIComponent(query)}&limit=8`)
        if (!res.ok) return
        const data = await res.json()
        setResults(data.results || [])
        setShowDrop(true)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query, selected])

  async function handleSelect(r: SearchResult) {
    setSelected(r)
    setQuery(r.apt_nm)
    setShowDrop(false)
    setPyeongs([])
    setPyeong(undefined)
    setDong("")

    const address = [r.sigungu_nm, r.umd_nm].filter(Boolean).join(" ")
    const initial: AptSelection = {
      aptId: r.apt_id,
      aptName: r.apt_nm,
      address,
      lawdCd: r.sigungu_cd,
    }
    onChange(initial)

    // 평형 목록 조회
    try {
      const res = await fetch(`${GATE_URL}/apt/${r.apt_id}/pyeong`)
      if (res.ok) {
        const data = await res.json()
        setPyeongs(data.pyeongs || [])
      }
    } catch {
      // 평형 데이터 없으면 무시
    }
  }

  function handlePyeongSelect(p: number) {
    const next = pyeong === p ? undefined : p
    setPyeong(next)
    if (selected) {
      const address = [selected.sigungu_nm, selected.umd_nm].filter(Boolean).join(" ")
      onChange({ aptId: selected.apt_id, aptName: selected.apt_nm, address, lawdCd: selected.sigungu_cd, pyeong: next, dong: dong || undefined })
    }
  }

  function handleDongChange(v: string) {
    setDong(v)
    if (selected) {
      const address = [selected.sigungu_nm, selected.umd_nm].filter(Boolean).join(" ")
      onChange({ aptId: selected.apt_id, aptName: selected.apt_nm, address, lawdCd: selected.sigungu_cd, pyeong, dong: v || undefined })
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1.5px solid #E5E7EB", fontSize: 14, background: "#F9FAFB",
    outline: "none", boxSizing: "border-box",
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* 검색 입력 */}
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          onFocus={() => { if (results.length > 0) setShowDrop(true) }}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            paddingRight: 36,
            borderColor: selected ? "#16A34A" : "#E5E7EB",
          }}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF" }}>
            ⟳
          </span>
        )}
        {selected && !loading && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#16A34A" }}>
            ✓
          </span>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {showDrop && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          overflow: "hidden",
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
              {group.items.map((r, i) => {
                const addr = [r.sido_nm, r.sigungu_nm, r.umd_nm].filter(Boolean).join(" ")
                return (
                  <button
                    key={r.apt_id}
                    onMouseDown={() => handleSelect(r)}
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "none", border: "none",
                      borderBottom: i < group.items.length - 1 ? "1px solid #F3F4F6" : "none",
                      textAlign: "left", cursor: "pointer", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{r.apt_nm}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{addr}</div>
                    </div>
                    {r.score != null && (
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: r.score >= 64 ? "#16A34A" : r.score >= 50 ? "#D97706" : "#DC2626",
                        flexShrink: 0, marginLeft: 8,
                      }}>
                        {r.score}점
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {showDrop && results.length === 0 && !loading && query.length >= 2 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
          padding: "16px 14px", fontSize: 13, color: "#9CA3AF",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}>
          검색 결과가 없습니다
        </div>
      )}

      {/* 선택 후: 동 입력 + 평형 선택 */}
      {selected && (
        <div style={{ marginTop: 10 }}>
          {/* 동 입력 (선택) */}
          <input
            value={dong}
            onChange={e => handleDongChange(e.target.value)}
            placeholder="동 입력 (선택) — 예: 101동"
            style={{ ...inputStyle, marginBottom: pyeongs.length > 0 ? 10 : 0, fontSize: 13 }}
          />

          {/* 평형 선택 */}
          {pyeongs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 7 }}>
                평형 선택 <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(선택 안 하면 전체 평형 기준)</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pyeongs.map(p => {
                  const isActive = pyeong === p.pyeong
                  const priceStr = p.latest_price
                    ? p.latest_price >= 10000
                      ? `${(p.latest_price / 10000).toFixed(1)}억`
                      : `${p.latest_price.toLocaleString()}만`
                    : null
                  return (
                    <button
                      key={p.pyeong}
                      onClick={() => handlePyeongSelect(p.pyeong)}
                      style={{
                        padding: "7px 12px", borderRadius: 9999,
                        background: isActive ? "#16A34A" : "#F3F4F6",
                        color: isActive ? "#fff" : "#374151",
                        border: isActive ? "none" : "1px solid #E5E7EB",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        lineHeight: 1.3,
                      }}
                    >
                      <div>{p.pyeong}평</div>
                      {priceStr && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>{priceStr}</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
