"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { AddressSuggestion, AreaOption } from "./types"
import { prefetchDashboard } from "@/lib/prefetch"

export default function SearchForm() {
  const router = useRouter()

  const [address, setAddress]           = useState("")
  const [aptName, setAptName]           = useState("")
  const [lawdCd, setLawdCd]             = useState("")
  const [bjdongCd, setBjdongCd]         = useState("")
  const [selectedArea, setSelectedArea] = useState("")
  const [areas, setAreas]               = useState<AreaOption[]>([])
  const [areasLoading, setAreasLoading] = useState(false)
  const [suggestions, setSuggestions]   = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [addrLoading, setAddrLoading]   = useState(false)

  const suggestRef  = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // 아파트명 + lawdCd 있으면 평형 자동 조회
  useEffect(() => {
    if (!lawdCd || !aptName || aptName.length < 2) { setAreas([]); setSelectedArea(""); return }
    setAreasLoading(true)
    setSelectedArea("")
    fetch(`/api/apt-areas?lawdCd=${encodeURIComponent(lawdCd)}&apt=${encodeURIComponent(aptName)}`)
      .then(r => r.json())
      .then(data => setAreas(data.areas ?? []))
      .catch(() => setAreas([]))
      .finally(() => setAreasLoading(false))
  }, [lawdCd, aptName])

  const handleAddressInput = useCallback((val: string) => {
    setAddress(val)
    setLawdCd("")
    setBjdongCd("")
    setAreas([])
    setSelectedArea("")

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return }

    debounceRef.current = setTimeout(async () => {
      setAddrLoading(true)
      try {
        const res = await fetch(`/api/kakao-address?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        setSuggestions(data.documents ?? [])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      } finally {
        setAddrLoading(false)
      }
    }, 400)
  }, [])

  const handleSelectAddress = useCallback((s: AddressSuggestion) => {
    const fullAddr = s.roadAddress || s.addressName
    setAddress(fullAddr)
    setLawdCd(s.lawdCd)
    setBjdongCd(s.bjdongCd ?? "")
    setShowSuggestions(false)
    setSuggestions([])
  }, [])

  const handleAnalyze = () => {
    if (!address || !aptName) return
    prefetchDashboard(address, aptName, lawdCd || undefined)
    const params = new URLSearchParams({
      address,
      apt: aptName,
      ...(lawdCd   && { lawdCd }),
      ...(bjdongCd && { bjdongCd }),
      ...(selectedArea && { area: selectedArea }),
    })
    router.push(`/dashboard?${params.toString()}`)
  }

  const canAnalyze = address.trim().length > 0 && aptName.trim().length > 0

  return (
    <section style={{
      background: "linear-gradient(160deg, #1B4FBB 0%, #0A2463 100%)",
      padding: "72px 20px 64px",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }} className="fade-up">
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#FFFFFF",
          lineHeight: 1.3,
          letterSpacing: "-0.5px",
          marginBottom: 12,
        }}>
          계약 전 딱 한 번만 확인하세요
        </h1>
        <p style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.82)",
          marginBottom: 8,
          lineHeight: 1.6,
        }}>
          감이 아니라 데이터로 결정합니다
        </p>
        <span style={{
          display: "inline-block",
          background: "rgba(255,255,255,0.18)",
          color: "#FFFFFF",
          borderRadius: 9999,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 32,
        }}>
          실거래 기반 · 지역 이슈 AI 분석
          <span style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 400, marginTop: 4 }}>
            최종 업데이트: 2026년 4월 · 매일 실거래 갱신 · 매주 AI 분석 · 매월 모델 재학습
          </span>
        </span>

        {/* Search Card */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          padding: 24,
          textAlign: "left",
        }}>
          {/* 주소 입력 */}
          <div style={{ marginBottom: 16, position: "relative" }} ref={suggestRef}>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#6B7280",
              marginBottom: 6,
            }}>
              주소
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={address}
                onChange={e => handleAddressInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="예) 서울특별시 강남구 대치동"
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 16px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 15,
                  color: "#111827",
                  background: "#FFFFFF",
                }}
              />
              {addrLoading && (
                <div className="pulse" style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  width: 14, height: 14, borderRadius: "50%", background: "#16A34A",
                }} />
              )}
              {lawdCd && !addrLoading && (
                <div style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15,
                }}>✅</div>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                marginTop: 4,
                boxShadow: "0 4px 12px rgba(0,0,0,0.09)",
                overflow: "hidden",
              }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={() => handleSelectAddress(s)}
                    style={{
                      display: "block", width: "100%", padding: "12px 16px",
                      textAlign: "left", background: "transparent", border: "none",
                      borderBottom: i < suggestions.length - 1 ? "1px solid #F3F4F6" : "none",
                      cursor: "pointer", minHeight: 44,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {s.roadAddress || s.addressName}
                    </div>
                    {s.roadAddress && (
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{s.addressName}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 아파트명 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#6B7280",
              marginBottom: 6,
            }}>
              아파트 이름
            </label>
            <input
              type="text"
              value={aptName}
              onChange={e => setAptName(e.target.value)}
              placeholder="예) 은마아파트, 헬리오시티"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 15,
                color: "#111827",
                background: "#FFFFFF",
              }}
            />
          </div>

          {/* 평형 선택 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#6B7280",
              marginBottom: 6,
            }}>
              평형 <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(선택)</span>
            </label>
            {areasLoading ? (
              <div className="pulse" style={{
                height: 48, borderRadius: 8, background: "#F3F4F6",
              }} />
            ) : areas.length > 0 ? (
              <select
                value={selectedArea}
                onChange={e => setSelectedArea(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 15,
                  color: "#111827",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  appearance: "none",
                  minHeight: 48,
                }}
              >
                <option value="">전체 평형</option>
                {areas.map(a => (
                  <option key={a.m2} value={a.m2}>{a.label}</option>
                ))}
              </select>
            ) : (
              <div style={{
                padding: "12px 16px",
                border: "1px dashed #D1D5DB",
                borderRadius: 8,
                fontSize: 14,
                color: "#9CA3AF",
                minHeight: 48,
                display: "flex",
                alignItems: "center",
              }}>
                {lawdCd && aptName.length >= 2
                  ? "해당 아파트 거래 데이터가 없습니다"
                  : "주소와 아파트명 입력 후 자동으로 불러옵니다"}
              </div>
            )}
          </div>

          {/* 분석 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              background: canAnalyze ? "#16A34A" : "#E5E7EB",
              color: canAnalyze ? "#FFFFFF" : "#9CA3AF",
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              cursor: canAnalyze ? "pointer" : "not-allowed",
              transition: "background .15s",
              minHeight: 52,
            }}
          >
            {canAnalyze ? "🛡️ 24개월 리스크 분석하기 →" : "주소와 아파트명을 입력해주세요"}
          </button>
        </div>
      </div>
    </section>
  )
}
