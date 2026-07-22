"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { AddressSuggestion, AptRankItem, NeighborhoodResult } from "./types"
import { fmtPrice } from "./types"
import { prefetchDashboard } from "@/lib/prefetch"

export default function NeighborhoodSearch() {
  const router = useRouter()

  const [nbAddr, setNbAddr]               = useState("")
  const [nbLawdCd, setNbLawdCd]           = useState("")
  const [nbSuggestions, setNbSuggestions] = useState<AddressSuggestion[]>([])
  const [showNbSugg, setShowNbSugg]       = useState(false)
  const [nbAddrLoading, setNbAddrLoading] = useState(false)
  const [nbLoading, setNbLoading]         = useState(false)
  const [nbResult, setNbResult]           = useState<NeighborhoodResult | null>(null)

  const nbSuggestRef  = useRef<HTMLDivElement>(null)
  const nbDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (nbSuggestRef.current && !nbSuggestRef.current.contains(e.target as Node)) {
        setShowNbSugg(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleNbAddrInput = useCallback((val: string) => {
    setNbAddr(val)
    setNbLawdCd("")
    setNbResult(null)
    if (nbDebounceRef.current) clearTimeout(nbDebounceRef.current)
    if (val.length < 2) { setNbSuggestions([]); setShowNbSugg(false); return }
    nbDebounceRef.current = setTimeout(async () => {
      setNbAddrLoading(true)
      try {
        const res = await fetch(`/api/kakao-address?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        setNbSuggestions(data.documents ?? [])
        setShowNbSugg(true)
      } catch { setNbSuggestions([]) }
      finally { setNbAddrLoading(false) }
    }, 400)
  }, [])

  const handleSelectNbAddr = useCallback(async (s: AddressSuggestion) => {
    const fullAddr = s.roadAddress || s.addressName
    setNbAddr(fullAddr)
    setNbLawdCd(s.lawdCd)
    setShowNbSugg(false)
    setNbSuggestions([])
    setNbLoading(true)
    setNbResult(null)
    try {
      const res = await fetch(`/api/neighborhood-apts?lawdCd=${encodeURIComponent(s.lawdCd)}`)
      const data = await res.json()
      setNbResult(data)
    } catch { setNbResult({ undervalued: [], expensive: [] }) }
    finally { setNbLoading(false) }
  }, [])

  const handleAptClick = (apt: AptRankItem) => {
    prefetchDashboard(nbAddr, apt.name, nbLawdCd || undefined)
    const params = new URLSearchParams({ address: nbAddr, apt: apt.name, ...(nbLawdCd && { lawdCd: nbLawdCd }) })
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <section style={{ background: "#FFFFFF", padding: "48px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>우리 동네 리스크 지도</h2>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            동네를 검색하면 최근 6개월 실거래 기준 안전 단지·고위험 단지 TOP 7을 분석합니다
          </p>
        </div>

        {/* 동네 검색 입력 */}
        <div ref={nbSuggestRef} style={{ position: "relative", maxWidth: 480, margin: "0 auto 36px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "#FFFFFF",
            border: "1px solid #D1D5DB",
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <span style={{ padding: "0 14px", color: "#9CA3AF", fontSize: 17, flexShrink: 0 }}>🔍</span>
            <input
              type="text"
              placeholder="동네/구/시 검색 (예: 강남구, 판교, 송도동)"
              value={nbAddr}
              onChange={e => handleNbAddrInput(e.target.value)}
              style={{
                flex: 1, border: "none", padding: "14px 0 14px",
                fontSize: 14, color: "#111827", background: "transparent",
                minHeight: 48,
              }}
            />
            {nbAddrLoading && (
              <span className="pulse" style={{ padding: "0 14px", fontSize: 12, color: "#6B7280", flexShrink: 0 }}>검색중…</span>
            )}
          </div>

          {showNbSugg && nbSuggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.09)",
              zIndex: 50, overflow: "hidden",
            }}>
              {nbSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectNbAddr(s)}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 16px",
                    background: "transparent", border: "none",
                    borderBottom: i < nbSuggestions.length - 1 ? "1px solid #F3F4F6" : "none",
                    cursor: "pointer", fontSize: 13, minHeight: 44,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F9FAFB" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <div style={{ fontWeight: 600, color: "#111827" }}>
                    {s.dong || s.sigungu || s.sido}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {s.roadAddress || s.addressName}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 로딩 */}
        {nbLoading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div className="pulse" style={{ display: "inline-block" }}>
              <div style={{
                display: "flex", gap: 12, alignItems: "center",
                background: "#F9FAFB", border: "1px solid #E5E7EB",
                borderRadius: 12, padding: "16px 24px",
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#16A34A",
                    animation: `pulse 1.2s infinite ${i * 0.2}s`,
                  }} />
                ))}
                <span style={{ fontSize: 13, color: "#6B7280" }}>리스크 데이터 분석 중… (최대 15초 소요)</span>
              </div>
            </div>
          </div>
        )}

        {/* 결과 없음 */}
        {!nbLoading && nbResult && nbResult.undervalued.length === 0 && (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            color: "#6B7280", fontSize: 14,
            background: "#F9FAFB", borderRadius: 12,
            border: "1px solid #E5E7EB",
            maxWidth: 480, margin: "0 auto",
          }}>
            {nbResult.message || "해당 지역의 충분한 실거래 데이터를 찾지 못했습니다. 더 넓은 지역(구/시)을 검색해보세요."}
          </div>
        )}

        {/* 결과 그리드 */}
        {!nbLoading && nbResult && nbResult.undervalued.length > 0 && (
          <div className="fade-up">
            {nbResult.totalTx && (
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20, textAlign: "center" }}>
                최근 6개월 실거래 {nbResult.totalTx.toLocaleString("ko-KR")}건 리스크 분석
                {nbResult.areaAvgPpm2 && ` · 지역 평균 ${nbResult.areaAvgPpm2.toLocaleString("ko-KR")}만원/㎡`}
              </div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}>
              {/* 저평가 TOP 7 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{
                    background: "#DCFCE7", color: "#15803D",
                    fontSize: 13, fontWeight: 700,
                    padding: "5px 12px", borderRadius: 9999,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    🛡️ 안전 단지 TOP 7
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>리스크 낮은 순 · 가격 메리트 단지</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {nbResult.undervalued.map(apt => (
                    <button
                      key={apt.rank}
                      onClick={() => handleAptClick(apt)}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 10,
                        padding: "12px 16px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all .2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                        width: "100%",
                        minHeight: 48,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-1px)"
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.09)"
                        e.currentTarget.style.borderColor = "#16A34A"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)"
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"
                        e.currentTarget.style.borderColor = "#E5E7EB"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: apt.discountRatio !== undefined ? 8 : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 9999,
                            background: "#F0FDF4", color: "#16A34A",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {apt.rank}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{apt.name}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                              {apt.dong && `${apt.dong} · `}{apt.mainAreas.join(" · ")}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                            {fmtPrice(apt.avgPrice)}
                          </div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                            {apt.avgPricePerM2.toLocaleString("ko-KR")}만/㎡
                          </div>
                        </div>
                      </div>
                      {apt.discountRatio !== undefined && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            flex: 1, height: 3, background: "#DCFCE7", borderRadius: 9999, overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", borderRadius: 9999,
                              background: "#16A34A",
                              width: `${Math.min(apt.discountRatio * 100, 100)}%`,
                              transition: "width .6s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: "#16A34A", fontWeight: 700, whiteSpace: "nowrap" }}>
                            안전 지수 {Math.round(apt.discountRatio * 100)}%
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 최고가 TOP 7 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{
                    background: "#FEF3C7", color: "#D97706",
                    fontSize: 13, fontWeight: 700,
                    padding: "5px 12px", borderRadius: 9999,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    👑 최고가 TOP 7
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>평균 거래가 높은 순</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {nbResult.expensive.map(apt => (
                    <button
                      key={apt.rank}
                      onClick={() => handleAptClick(apt)}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 10,
                        padding: "12px 16px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all .2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                        width: "100%",
                        minHeight: 48,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-1px)"
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.09)"
                        e.currentTarget.style.borderColor = "#D97706"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)"
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"
                        e.currentTarget.style.borderColor = "#E5E7EB"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 9999,
                            background: "#FEF3C7", color: "#D97706",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {apt.rank}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{apt.name}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                              {apt.dong && `${apt.dong} · `}{apt.mainAreas.join(" · ")}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                            {fmtPrice(apt.avgPrice)}
                          </div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                            {apt.avgPricePerM2.toLocaleString("ko-KR")}만/㎡ · {apt.count}건
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
