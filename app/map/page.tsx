"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import OnboardingModal, { getOnboarding, skipOnboarding, type OnboardingData } from "@/components/OnboardingModal"
import MapWelcomeModal from "@/components/landing/MapWelcomeModal"
import { supabase } from "@/lib/supabaseClient"
import { PRODUCT_TAGLINE } from "@/lib/constants"
import {
  LS_AUCTION_BUDGET_EOK,
  LS_AUCTION_HIDE_HIGH,
  LS_AUCTION_DELTA_PCT,
} from "@/lib/auction/budgetFilter"

const NaverMap = dynamic(() => import("@/components/NaverMap"), {
  ssr: false,
  loading: () => (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F4F6F9", color: "#6B7280", fontSize: 14,
    }}>
      🗺️ 지도 불러오는 중...
    </div>
  ),
})

// useSearchParams는 Suspense 내부에서만 사용 가능
function MapPageInner() {
  const searchParams = useSearchParams()
  const aptIdParam = searchParams.get("aptId") || searchParams.get("apt")
  const initialAptId = aptIdParam && /^\d+$/.test(aptIdParam) ? Number(aptIdParam) : undefined

  const focusParam = searchParams.get("focus")
  const focusAuctionId = focusParam && /^\d+$/.test(focusParam) ? Number(focusParam) : undefined

  const [mapReady, setMapReady]             = useState(false)
  const [gateOnline, setGateOnline]         = useState<boolean | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [showPresale, setShowPresale]       = useState(false)
  const [showSubway, setShowSubway]         = useState(false)
  const [showHospital, setShowHospital]     = useState(false)
  const [showAcademy, setShowAcademy]       = useState(false)
  const [showSchool, setShowSchool]         = useState(false)
  const [showAuction, setShowAuction]       = useState(true)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [auctionFilter, setAuctionFilter]   = useState<"all" | "short-trade" | "rental">("all")
  /** 경매 예산(억) — /auction 과 동일 localStorage 키 */
  const [auctionBudgetEok, setAuctionBudgetEok] = useState("")
  const [auctionDeltaPct, setAuctionDeltaPct]   = useState(10)
  const [auctionHideHigh, setAuctionHideHigh]   = useState(true)
  const [auctionShowAll, setAuctionShowAll]     = useState(false)
  const [showWelcome, setShowWelcome]       = useState(false)
  const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

  useEffect(() => {
    try {
      const b = localStorage.getItem(LS_AUCTION_BUDGET_EOK)
      if (b != null) setAuctionBudgetEok(b)
      const h = localStorage.getItem(LS_AUCTION_HIDE_HIGH)
      if (h != null) setAuctionHideHigh(h === "1")
      const d = localStorage.getItem(LS_AUCTION_DELTA_PCT)
      if (d != null) {
        const n = Number(d)
        if (n === 5 || n === 10 || n === 15) setAuctionDeltaPct(n)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      if (auctionBudgetEok) localStorage.setItem(LS_AUCTION_BUDGET_EOK, auctionBudgetEok)
      else localStorage.removeItem(LS_AUCTION_BUDGET_EOK)
      localStorage.setItem(LS_AUCTION_HIDE_HIGH, auctionHideHigh ? "1" : "0")
      localStorage.setItem(LS_AUCTION_DELTA_PCT, String(auctionDeltaPct))
    } catch { /* ignore */ }
  }, [auctionBudgetEok, auctionHideHigh, auctionDeltaPct])

  // 첫 방문 웰컴 가이드 모달 체크
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seenWelcome = localStorage.getItem("orulzi_map_welcome_seen")
      if (!seenWelcome) {
        setShowWelcome(true)
      }
    }
  }, [])

  // 로그인 유저 온보딩 — 건너뛴 경우 다시 안 띄움
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const existing = getOnboarding()
      if (existing && !(existing as any).skipped) {
        setOnboardingData(existing)
      } else if (!existing) {
        setShowOnboarding(true)
      }
    })
  }, [])

  // 게이트 서버 상태 확인
  useEffect(() => {
    fetch(`${GATE_URL}/health`)
      .then(r => r.ok ? setGateOnline(true) : setGateOnline(false))
      .catch(() => setGateOnline(false))
  }, [GATE_URL])

  // Naver Maps 스크립트 동적 로드
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
    if (!clientId || typeof window === "undefined") return
    if ((window as any).naver?.maps) { setMapReady(true); return }

    const script = document.createElement("script")
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`
    script.async = true
    script.onload = () => setMapReady(true)
    document.head.appendChild(script)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>

      {showWelcome && (
        <MapWelcomeModal
          isOpen={showWelcome}
          onClose={() => {
            localStorage.setItem("orulzi_map_welcome_seen", "true")
            setShowWelcome(false)
          }}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          onDone={data => { setOnboardingData(data); setShowOnboarding(false) }}
          onSkip={() => { skipOnboarding(); setShowOnboarding(false) }}
        />
      )}

      {/* 상단 헤더 */}
      <div className="map-header-container" style={{
        padding: "10px 12px", background: "#fff",
        borderBottom: "1px solid #E5E7EB",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexShrink: 1 }}>
          <img src="/logo.png" alt="오를지 로고" className="map-header-logo" style={{ height: 24, objectFit: "contain", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div className="map-header-title" style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              오를지AI
            </div>
            <div className="map-header-sub" style={{ fontSize: 10, color: "#9CA3AF" }}>
              {gateOnline === true  && PRODUCT_TAGLINE}
              {gateOnline === false && "● 오프라인"}
              {gateOnline === null  && "연결 확인 중..."}
            </div>
          </div>
        </div>

        <div className="map-header-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0, minWidth: 0 }}>
          <div className="map-header-links" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", gap: 4 }}>
            <Link href="/how-it-works" className="map-header-link link-orange" style={{ fontSize: 10, color: "#D97706", fontWeight: 600, textDecoration: "none", background: "#FFFBEB", borderRadius: 9999, padding: "2px 7px", whiteSpace: "nowrap" }}>
              엔진소개
            </Link>
            <Link href="/sample" className="map-header-link link-indigo" style={{ fontSize: 10, color: "#6366F1", fontWeight: 600, textDecoration: "none", background: "#EEF2FF", borderRadius: 9999, padding: "2px 7px", whiteSpace: "nowrap" }}>
              샘플보기
            </Link>
            <div className="map-header-predict" style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap" }}>24개월예측</div>
          </div>
          {onboardingData && (
            <button
              onClick={() => setShowOnboarding(true)}
              className="map-onboarding-btn"
              style={{
                fontSize: 10, color: "#16A34A", fontWeight: 600,
                background: "#F0FDF4", border: "none", borderRadius: 9999,
                padding: "2px 8px", cursor: "pointer",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {onboardingData.targetRegion || "전국"} ·{" "}
              {onboardingData.budget ? `${(onboardingData.budget / 10000).toFixed(0)}억 이내` : ""} ·{" "}
              {onboardingData.timeline} 내 매수
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .map-header-container { padding: 4px 8px !important; gap: 4px !important; }
          .map-header-logo { height: 18px !important; }
          .map-header-title { font-size: 11px !important; }
          .map-header-sub { display: none !important; }
          .map-header-predict { display: none !important; }
          .map-header-right { flex-direction: row !important; align-items: center !important; gap: 4px !important; }
          .map-header-links { gap: 3px !important; }
          .map-header-link { font-size: 9px !important; padding: 2px 4px !important; }
          .map-onboarding-btn { font-size: 9px !important; padding: 2px 5px !important; max-width: 110px !important; }
          
          .map-filter-bar { padding: 3px 8px !important; gap: 6px !important; }
          .map-filter-bar span { font-size: 10px !important; }
          .map-filter-bar button { padding: 2px 6px !important; gap: 4px !important; }
          .map-filter-bar button span { font-size: 10px !important; }
          .map-filter-info { display: none !important; }
        }
      `}</style>

      {/* 범례 + 토글 */}
      <div className="map-filter-bar" style={{
        padding: "6px 12px", background: "#fff",
        borderBottom: "1px solid #E5E7EB",
        display: "flex", gap: 10, alignItems: "center", flexShrink: 0,
        overflowX: "auto", WebkitOverflowScrolling: "touch",
      }}>
        {[
          { color: "#2ECC71", label: "안전" },
          { color: "#F39C12", label: "중립" },
          { color: "#E74C3C", label: "위험" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%", background: color,
              border: "1.5px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
            <span style={{ color: "#374151", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
        {/* 더 보기 버튼 — 분양/지하철/병원/학원/학교 */}
        <button
          onClick={() => setShowMoreFilters(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: showMoreFilters ? "#F3F4F6" : "transparent",
            border: showMoreFilters ? "1px solid #D1D5DB" : "1px solid transparent",
            borderRadius: 9999, padding: "3px 8px", cursor: "pointer",
            flexShrink: 0, fontSize: 11, fontWeight: 600,
            color: showMoreFilters ? "#374151" : "#9CA3AF",
          }}
        >
          {showMoreFilters ? "접기 ▲" : "더 보기 ▼"}
        </button>
        {showMoreFilters && (<>
        <button
          onClick={() => setShowPresale(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showPresale ? "#F5F3FF" : "transparent",
            border: showPresale ? "1px solid #C4B5FD" : "1px solid transparent",
            borderRadius: 9999, padding: "3px 8px", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#8B5CF6",
            border: "1.5px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            opacity: showPresale ? 1 : 0.5,
          }} />
          <span style={{
            fontSize: 11, fontWeight: showPresale ? 700 : 500,
            color: showPresale ? "#7C3AED" : "#6B7280",
          }}>
            분양 단지
          </span>
        </button>
        <button
          onClick={() => setShowSubway(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showSubway ? "#EFF6FF" : "transparent",
            border: showSubway ? "1px solid #93C5FD" : "1px solid transparent",
            borderRadius: 9999, padding: "3px 8px", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#3B82F6",
            border: "1.5px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            opacity: showSubway ? 1 : 0.5,
          }} />
          <span style={{
            fontSize: 11, fontWeight: showSubway ? 700 : 500,
            color: showSubway ? "#2563EB" : "#6B7280",
          }}>
            지하철
          </span>
        </button>
        <button
          onClick={() => setShowHospital(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showHospital ? "#FFF1F2" : "transparent",
            border: showHospital ? "1px solid #FECDD3" : "1px solid transparent",
            borderRadius: 9999, padding: "3px 8px", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#F43F5E",
            border: "1.5px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            opacity: showHospital ? 1 : 0.5,
          }} />
          <span style={{
            fontSize: 11, fontWeight: showHospital ? 700 : 500,
            color: showHospital ? "#E11D48" : "#6B7280",
          }}>
            병원
          </span>
        </button>
        <button
          onClick={() => setShowAcademy(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showAcademy ? "#F5F3FF" : "transparent",
            border: showAcademy ? "1px solid #DDD6FE" : "1px solid transparent",
            borderRadius: 9999, padding: "3px 8px", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#8B5CF6",
            border: "1.5px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            opacity: showAcademy ? 1 : 0.5,
          }} />
          <span style={{
            fontSize: 11, fontWeight: showAcademy ? 700 : 500,
            color: showAcademy ? "#6D28D9" : "#6B7280",
          }}>
            학원
          </span>
        </button>
        <button
          onClick={() => setShowSchool(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showSchool ? "#EFF6FF" : "transparent",
            border: showSchool ? "1px solid #BFDBFE" : "1px solid transparent",
            borderRadius: 9999, padding: "3px 8px", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#2563EB",
            border: "1.5px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            opacity: showSchool ? 1 : 0.5,
          }} />
          <span style={{
            fontSize: 11, fontWeight: showSchool ? 700 : 500,
            color: showSchool ? "#1D4ED8" : "#6B7280",
          }}>
            학교
          </span>
        </button>
        </>)}
        <button
          onClick={() => setShowAuction(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showAuction ? "#FEF2F2" : "transparent",
            border: showAuction ? "1px solid #FECACA" : "1px solid transparent",
            borderRadius: 9999, padding: "3px 8px", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#B91C1C",
            border: "1.5px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            opacity: showAuction ? 1 : 0.5,
          }} />
          <span style={{
            fontSize: 11, fontWeight: showAuction ? 700 : 500,
            color: showAuction ? "#991B1B" : "#6B7280",
          }}>
            ⚖️ 경매
          </span>
        </button>
        {showAuction && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            {(["all", "short-trade", "rental"] as const).map(f => (
              <button key={f} onClick={() => setAuctionFilter(f)}
                style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 9999, cursor: "pointer",
                  background: auctionFilter === f ? "#FEE2E2" : "transparent",
                  border: auctionFilter === f ? "1px solid #FECACA" : "1px solid transparent",
                  color: auctionFilter === f ? "#991B1B" : "#9CA3AF",
                  fontWeight: auctionFilter === f ? 700 : 400,
                }}>
                {f === "all" ? "전체" : f === "short-trade" ? "시세차익" : "월세수익"}
              </button>
            ))}
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "2px 6px",
            }}>
              <label htmlFor="map-budget-eok" style={{ fontSize: 10, color: "#991B1B", fontWeight: 600, whiteSpace: "nowrap" }}>
                예산
              </label>
              <input
                id="map-budget-eok"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                placeholder="억"
                value={auctionBudgetEok}
                onChange={(e) => setAuctionBudgetEok(e.target.value)}
                style={{
                  width: 52, fontSize: 12, fontWeight: 700, border: "1px solid #FECACA",
                  borderRadius: 6, padding: "2px 4px", outline: "none",
                }}
              />
              <span style={{ fontSize: 10, color: "#991B1B" }}>억</span>
              <select
                value={auctionDeltaPct}
                onChange={(e) => setAuctionDeltaPct(Number(e.target.value))}
                style={{ fontSize: 10, border: "1px solid #FECACA", borderRadius: 6, padding: "2px", color: "#991B1B" }}
                title="예산 여유 ±%"
              >
                <option value={5}>±5%</option>
                <option value={10}>±10%</option>
                <option value={15}>±15%</option>
              </select>
            </div>
            <label style={{
              display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#6B7280",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <input
                type="checkbox"
                checked={auctionHideHigh}
                onChange={(e) => setAuctionHideHigh(e.target.checked)}
              />
              위험 숨김
            </label>
            {auctionBudgetEok && (
              <label style={{
                display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#6B7280",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>
                <input
                  type="checkbox"
                  checked={auctionShowAll}
                  onChange={(e) => setAuctionShowAll(e.target.checked)}
                />
                예산 밖
              </label>
            )}
          </div>
        )}
        <div className="map-filter-info" style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>
          {showAuction
            ? (auctionBudgetEok
              ? `예산 ${auctionBudgetEok}억 ±${auctionDeltaPct}% · 마커=신호등`
              : "예산을 넣으면 해당 물건만 표시 · 마커를 클릭하면 상세 정보")
            : "마커 클릭 시 상세정보"}
        </div>
      </div>

      {/* 지도 영역 */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {mapReady ? (
          <NaverMap
            key={24}
            horizon={24}
            initialRegion={onboardingData?.targetRegion}
            initialAptId={initialAptId}
            onboarding={onboardingData ? {
              budget: onboardingData.budget,
              timeline: onboardingData.timeline,
              purpose: onboardingData.purpose,
            } : undefined}
            onClearFilter={() => setOnboardingData(prev => prev ? { ...prev, budget: 0 } : prev)}
            showPresale={showPresale}
            showSubway={showSubway}
            showHospital={showHospital}
            showAcademy={showAcademy}
            showSchool={showSchool}
            showAuction={showAuction}
            auctionFilter={auctionFilter}
            focusAuctionId={focusAuctionId}
            auctionBudgetEok={
              auctionBudgetEok && parseFloat(auctionBudgetEok) > 0
                ? parseFloat(auctionBudgetEok)
                : null
            }
            auctionBudgetDelta={auctionDeltaPct / 100}
            auctionHideHighRisk={auctionHideHigh}
            auctionShowAllBudget={auctionShowAll}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#F4F6F9", gap: 12,
          }}>
            <div style={{ fontSize: 40 }}>🗺️</div>
            <div style={{ fontWeight: 600, color: "#374151" }}>지도 초기화 중...</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div style={{
        width: "100%", height: "calc(100dvh - 128px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#F4F6F9", color: "#6B7280", fontSize: 14,
      }}>
        🗺️ 지도 불러오는 중...
      </div>
    }>
      <MapPageInner />
    </Suspense>
  )
}
