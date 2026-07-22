"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import PaywallModal from "@/components/PaywallModal"
import { format } from "date-fns"
import type { CategoryId, CategoryResult, DashboardData, ImpactLevel, TradeRecord } from "@/lib/types"
import { PriceSimulator } from "./PriceSimulator"
import AlertSystem from "./AlertSystem"
import WeeklyReportCard from "@/components/reports/WeeklyReportCard"
import ShareButton from "@/components/ShareButton"
import PresaleSystem from "./PresaleSystem"
import { MlForecast } from "./MlForecast"
import { SupplyRisk } from "./SupplyRisk"
import { TaxCalculator } from "./TaxCalculator"
import GuideModal from "./GuideModal"
import { PRODUCT_TAGLINE } from "@/lib/constants"
import LoanCalculator from "@/components/LoanCalculator"
import ChecklistBlock from "@/components/reports/ChecklistBlock"
import DecisionPackCard from "@/components/reports/DecisionPackCard"
import ExplainabilityCard from "@/components/explainability/ExplainabilityCard"
import TrustStrip from "@/components/TrustStrip"
import { getAdvisoryVerdict } from "@/lib/advisoryCopy"
import {
  getRecommendationCopy,
  inferBudgetFit,
  normalizeRecommendationContext,
  recommendationLabel,
  type RecommendationContext,
} from "@/lib/recommendationCopy"
import { getChecklistPack, getDecisionPack, type ReportPersona } from "@/lib/reportProducts"
import {
  getShareAudience,
  getShareIntentCopy,
  markShareReward,
  readAgentProfile,
  readShareReward,
  type ShareAudience,
} from "@/lib/shareIntentCopy"
import type { ReportProofPreview } from "@/lib/reportProofPreview"

type ActiveTab = CategoryId | "predict" | "alerts" | "presale" | "ml-forecast" | "weekly"

const CATEGORY_META: Record<CategoryId, { label: string; icon: string }> = {
  transport: { label: "교통 호재",     icon: "🚇" },
  policy:    { label: "부동산 정책",   icon: "📋" },
  politics:  { label: "정치 상황",     icon: "🏛" },
  global:    { label: "세계 경제",     icon: "🌐" },
  market:    { label: "부동산 시장",   icon: "📊" },
  geo:       { label: "지정학·입지",   icon: "📍" },
  school:    { label: "초품아·학군",   icon: "🏫" },
  momcafe:   { label: "맘카페 트렌드", icon: "💬" },
}

const IMPACT_STYLE: Record<ImpactLevel, { bg: string; text: string; border: string; label: string }> = {
  HIGH: { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5", label: "핵심호재" },
  POS:  { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", label: "긍정"    },
  MED:  { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A", label: "중립"    },
  NEG:  { bg: "#DBEAFE", text: "#2563EB", border: "#93C5FD", label: "부정"    },
  KEY:  { bg: "#F3E8FF", text: "#7C3AED", border: "#C4B5FD", label: "확인필요" },
}

const CATEGORY_ORDER: CategoryId[] = [
  "transport", "policy", "politics", "global",
  "market", "geo", "school", "momcafe",
]

const CATEGORY_LOADING_MESSAGES: Record<CategoryId, { emoji: string; lines: string[] }> = {
  transport: { emoji: "🚇", lines: ["지하철역 도보 10초...", "맨션 매물 나올 동안 기다리는 중"] },
  policy:    { emoji: "📋", lines: ["국토부장관님 브리핑 준비 중이에요"] },
  politics:  { emoji: "🏛", lines: ["여의도에서 설전이 붙었네요...", "끝나길 기다리는 중"] },
  global:    { emoji: "☕", lines: ["FOMC·환율·유가 최신 뉴스 기준으로 반영", "더 새로운 뉴스가 있으면 '기준 시각' 확인"] },
  market:    { emoji: "💻", lines: ["실거래 내역 10만 건 정렬 중..."] },
  geo:       { emoji: "📍", lines: ["지도 펴고 역세권 맞는지", "줄자로 재는 중"] },
  school:    { emoji: "🏫", lines: ["초등학교 옆에 학원 많은지 확인 중"] },
  momcafe:   { emoji: "💬", lines: ["맘카페에서 '이 동네 어떤가요'", "글 확인 중"] },
}

function scoreGrade(s: number): { label: string; color: string; bg: string } {
  if (s >= 75) return { label: "좋음", color: "#16A34A", bg: "#DCFCE7" }
  if (s >= 64) return { label: "양호", color: "#059669", bg: "#D1FAE5" }
  if (s >= 56) return { label: "보합", color: "#D97706", bg: "#FEF9C3" }
  if (s >= 50) return { label: "주의", color: "#D97706", bg: "#FEF3C7" }
  return             { label: "위험", color: "#DC2626", bg: "#FEE2E2" }
}

/** 후회 확률 = 서버 regret_prob 기반 */
function regretPct(score: number) {
  return Math.round(100 - score * 0.85)
}

function totalGrade(s: number) {
  if (s >= 75) return "A"
  if (s >= 65) return "B+"
  if (s >= 55) return "B"
  return "C+"
}

function fmtMlScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "데이터 없음"
  const sign = value > 0 ? "+" : ""
  const label = value > 0.3 ? "상승 우위" : value > 0.1 ? "소폭 상승" : value < -0.5 ? "타 지역 대비 약세" : value < -0.1 ? "타 지역 대비 소폭 약세" : "중립"
  return `${sign}${value.toFixed(2)}(${label})`
}

function formatDateTime(value?: string) {
  if (!value) return "알 수 없음"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "알 수 없음"
  return format(d, "yyyy.MM.dd HH:mm")
}

function formatDateOnly(value?: string) {
  if (!value) return "알 수 없음"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "알 수 없음"
  return format(d, "yyyy.MM.dd")
}

const CATEGORY_SOURCES: Record<CategoryId, string[]> = {
  transport: ["네이버 뉴스 API"],
  policy: ["네이버 뉴스 API"],
  politics: ["네이버 뉴스 API"],
  global: ["한국은행 ECOS API", "환율 API", "네이버 뉴스 API"],
  market: ["국토부 실거래가 API"],
  geo: ["카카오맵 API"],
  school: ["카카오맵 API"],
  momcafe: ["네이버 뉴스 API"],
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? "#2ECC71" : score >= 64 ? "#27AE60" : score >= 56 ? "#F59E0B" : score >= 50 ? "#E67E22" : "#E74C3C"
  const safe = Math.max(0, Math.min(100, score))
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safe / 100) * circumference

  return (
    <div style={{ position: "relative", width: 130, height: 130, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>점</div>
      </div>
    </div>
  )
}

function GNB({
  activeTab,
  setActiveTab,
  aptName,
  address,
  area,
  lastUpdated,
  userName,
  onOpenGuide,
}: {
  activeTab: ActiveTab
  setActiveTab: (t: ActiveTab) => void
  aptName: string
  address?: string
  area?: string
  lastUpdated: string
  userName: string
  onOpenGuide: () => void
}) {
  const pyeong = area ? `${Math.round(parseFloat(area) / 3.3058)}평` : ""
  const paidTabs = new Set(["analysis", "predict", "ml-forecast"])
  const tabs = [
    { key: "analysis",    label: "리스크 분석",       isActive: activeTab !== "predict" && activeTab !== "alerts" && activeTab !== "presale" && activeTab !== "ml-forecast" && activeTab !== "weekly", onClick: () => setActiveTab("transport") },
    { key: "predict",     label: "📊 시나리오",        isActive: activeTab === "predict",     onClick: () => setActiveTab("predict")      },
    { key: "ml-forecast", label: "🤖 AI예측",          isActive: activeTab === "ml-forecast", onClick: () => setActiveTab("ml-forecast") },
    { key: "alerts",      label: "🔔 알림",            isActive: activeTab === "alerts",      onClick: () => setActiveTab("alerts")       },
    { key: "presale",     label: "🏗 분양",            isActive: activeTab === "presale",     onClick: () => setActiveTab("presale")      },
    { key: "weekly",      label: "📬 주간",            isActive: activeTab === "weekly",      onClick: () => setActiveTab("weekly")       },
  ]

  return (
    <header>
      {/* TOP INFO BAR */}
      <div className="top-info-bar" style={{ background: "#F0FDF4", borderBottom: "1px solid #DCFCE7", padding: "0 12px", height: 36, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#16A34A", fontWeight: 600, minWidth: 0 }}>
          <img src="/logo.png" alt="Orulzi" style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>오를지AI · {PRODUCT_TAGLINE}</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>갱신: {formatDateOnly(lastUpdated)}</span>
          <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700 }}>● PRO</span>
        </div>
      </div>

      {/* MAIN GNB — 로고 + 아파트명 한 줄 */}
      <div className="main-gnb-container" style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 36, zIndex: 100 }}>
        <div className="main-gnb-inner" style={{ display: "flex", alignItems: "center", padding: "0 12px", height: 48, gap: 8 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <img src="/logo.png" alt="Orulzi" className="gnb-logo-img" style={{ width: 36, height: 36, objectFit: "contain" }} />
          </Link>
          <span className="gnb-apt-badge" style={{ background: "#F0FDF4", color: "#15803D", borderRadius: 9999, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100vw - 200px)" }}>
            {aptName}{pyeong && ` · ${pyeong}`}
          </span>
          <div className="gnb-right-actions" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button
              onClick={onOpenGuide}
              style={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                border: "none",
                borderRadius: "6px",
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                boxShadow: "0 2px 4px rgba(16, 185, 129, 0.15)",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(16, 185, 129, 0.25)"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none"
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.15)"
              }}
            >
              🧭 <span className="gnb-guide-text">가이드</span>
            </button>
            <button onClick={() => window.location.href = "/mypage"} style={{ background: "none", border: "none", fontSize: 12, color: "#6B7280", cursor: "pointer", padding: "4px 0", whiteSpace: "nowrap" }}>마이</button>
            <span className="gnb-username" style={{ fontSize: 12, color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>{userName}님</span>
          </div>
        </div>

        {/* 탭 메뉴 — 가로 스크롤 */}
        <nav className="gnb-tab-nav" style={{
          display: "flex", overflowX: "auto", overflowY: "hidden",
          WebkitOverflowScrolling: "touch" as any,
          scrollbarWidth: "none" as any,
          borderTop: "1px solid #F3F4F6",
          msOverflowStyle: "none" as any,
        }}>
          <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
          {tabs.map((item) => (
            <button key={item.key} onClick={item.onClick} style={{
              flexShrink: 0,
              height: 44, padding: "0 14px",
              background: "transparent", border: "none", outline: "none",
              borderBottom: item.isActive ? "2px solid #16A34A" : "2px solid transparent",
              color: item.isActive ? "#16A34A" : "#6B7280",
              fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all .15s",
              whiteSpace: "nowrap",
            }}>
              {item.label}
              {paidTabs.has(item.key) && (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#16A34A", marginLeft: 3, border: "1px solid #16A34A", borderRadius: 4, padding: "0 4px", lineHeight: "16px", display: "inline-block" }}>PRO</span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

function AssetHero({ data, favId, favLoading, onToggleFav, aptId, recommendationContext }: {
  data: DashboardData
  favId: string | null
  favLoading: boolean
  onToggleFav: () => void
  aptId: number | null
  recommendationContext?: RecommendationContext
}) {
  const { myProperty, totalScore, gateScore, finalScore } = data

  // finalScore(ML+AI 통합) → gateScore(ML) → totalScore(AI) 순으로 헤드라인 결정
  const headlineScore = (finalScore != null && !isNaN(finalScore)) ? finalScore
    : (gateScore != null && !isNaN(gateScore)) ? gateScore
    : totalScore
  const sg = scoreGrade(headlineScore)
  const grade = totalGrade(headlineScore)
  const market = data.categories.market as CategoryResult & {
    rawData?: {
      recentTrades?: TradeRecord[]
      latestTrade?: TradeRecord | null
      latestScope?: "apt" | "lawd" | "none"
      referenceTrades?: TradeRecord[]
      referenceScope?: "umd" | "lawd" | "none"
      referenceNote?: string | null
    }
  }
  const recentTrades = market?.rawData?.recentTrades ?? []
  const latestTrade = market?.rawData?.latestTrade ?? null
  const referenceTrades = market?.rawData?.referenceTrades ?? []
  const referenceScope = market?.rawData?.referenceScope ?? "none"
  const referenceNote = market?.rawData?.referenceNote ?? null
  const hasDirectTrades = recentTrades.length > 0 || Boolean(latestTrade)
  const verdict = getAdvisoryVerdict({ final_score: finalScore, oreulji_score: gateScore ?? totalScore })
  const recommendationCopy = getRecommendationCopy(recommendationContext)
  const recommendationBadge = recommendationLabel(recommendationContext)
  const rewardKey = aptId ? String(aptId) : myProperty.aptName
  const [shareAudience, setShareAudience] = useState<ShareAudience>("family")
  const [shareRewardVisible, setShareRewardVisible] = useState(false)
  const shareIntentCopy = getShareIntentCopy(shareAudience)
  const agentProfile = readAgentProfile()

  useEffect(() => {
    const audience = getShareAudience(readAgentProfile())
    setShareAudience(audience)
    setShareRewardVisible(Boolean(readShareReward(rewardKey)))
  }, [rewardKey])

  const gradeBadge = grade === "A"
    ? { bg: "#16A34A", color: "#fff" }
    : grade === "B+"
    ? { bg: "#059669", color: "#fff" }
    : grade === "B"
    ? { bg: "#D97706", color: "#fff" }
    : { bg: "#DC2626", color: "#fff" }

  return (
    <div style={{ background: "linear-gradient(135deg, #0F1E0F 0%, #1A3320 50%, #0D2B1D 100%)", padding: "32px 24px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* LEFT COLUMN */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <span style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: 11, borderRadius: 9999, padding: "3px 10px", marginBottom: 8 }}>
            분석 대상 부동산
          </span>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginTop: 8, marginBottom: 4 }}>
            {myProperty.aptName}
          </h2>
          <TrustStrip
            updatedAt={data.lastUpdated}
            lastNewsTime={(data.categories?.global?.rawData as any)?.news?.[0]?.pubDate}
            tradeCount={recentTrades.length}
            confidence={(data.categories?.global as any)?.confidence || "보통"}
            variant="full"
          />

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, marginBottom: 8 }}>
            {myProperty.address}
          </p>

          {myProperty.area && (
            <span style={{ display: "inline-block", background: "rgba(22,163,74,0.3)", color: "#86EFAC", borderRadius: 9999, fontSize: 12, padding: "2px 10px", marginBottom: 20 }}>
              {Math.round(parseFloat(myProperty.area) / 3.3058)}평 ({myProperty.area}㎡)
            </span>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {myProperty.totalInvestment > 0 && [
              { label: "매매가",    value: `${myProperty.purchasePrice.toLocaleString("ko-KR")}만원` },
              { label: "인테리어",  value: `${myProperty.interiorCost.toLocaleString("ko-KR")}만원` },
              { label: "총 투자금", value: `${myProperty.totalInvestment.toLocaleString("ko-KR")}만원` },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.1)", minWidth: 110 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>{item.value}</div>
              </div>
            ))}
            <button
              onClick={onToggleFav}
              disabled={favLoading}
              title={favId ? "즐겨찾기 해제" : "즐겨찾기 추가 (알림 받기)"}
              style={{
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 9999, padding: "6px 14px", fontSize: 15, cursor: "pointer",
                opacity: favLoading ? 0.5 : 1, alignSelf: "center", lineHeight: 1,
              }}
            >
              {favId ? "⭐ 즐겨찾기 해제" : "☆ 즐겨찾기"}
            </button>
          </div>

          <div style={{
            marginTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 14px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              {shareIntentCopy.helperLine}
            </div>
            {agentProfile && (
              <div style={{ background: "rgba(15,23,42,0.26)", borderRadius: 10, padding: "10px 12px", border: "1px solid rgba(148,163,184,0.28)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#BFDBFE", marginBottom: 4 }}>
                  중개사 모드 ON
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
                  {[agentProfile.office, agentProfile.name].filter(Boolean).join(" · ")}
                  {agentProfile.leadName ? ` · ${agentProfile.leadName}` : ""}
                  {agentProfile.reportPurpose ? ` · ${agentProfile.reportPurpose}` : ""}
                </div>
              </div>
            )}
            <ShareButton
              aptName={myProperty.aptName}
              address={myProperty.address}
              score={headlineScore}
              aptId={aptId ?? undefined}
              recommendationContext={recommendationContext}
              label={shareIntentCopy.primaryButtonLabel}
              rewardKey={rewardKey}
              onShared={() => setShareRewardVisible(true)}
              style={{
                width: "100%",
                justifyContent: "center",
                background: "#16A34A",
                border: "none",
                color: "#FFFFFF",
                minHeight: 46,
              }}
            />
            {shareRewardVisible && (
              <div style={{
                background: "rgba(22,163,74,0.14)",
                border: "1px solid rgba(134,239,172,0.35)",
                borderRadius: 10,
                padding: "10px 12px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#DCFCE7", marginBottom: 4 }}>{shareIntentCopy.rewardTitle}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{shareIntentCopy.rewardDescription}</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>최근 실거래</div>
            {data.is_presale ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                분양예정 단지라 아직 확정 실거래가가 없습니다
              </div>
            ) : !hasDirectTrades ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>실거래 데이터가 아직 없습니다</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(recentTrades.length > 0 ? recentTrades.slice(0, 5) : latestTrade ? [latestTrade] : []).map((t, i) => {
                  const areaSqm = t.area ? parseFloat(t.area) : null
                  const pyeong = areaSqm ? Math.round(areaSqm / 3.305) : null
                  const areaLabel = areaSqm ? `${areaSqm}㎡(${pyeong}평형)` : ""
                  const priceText = t.price >= 10000
                    ? `${Math.floor(t.price / 10000)}억 ${t.price % 10000 > 0 ? (t.price % 10000).toLocaleString() + "만원" : ""}`
                    : `${t.price.toLocaleString()}만원`
                  const badgeColor = t.dealType === "전세" ? "#FBBF24" : t.dealType === "월세" ? "#F97316" : "#3B82F6"
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                        {t.dealDate} · {areaLabel} {t.floor}층
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {t.dealType && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor, background: `${badgeColor}22`, borderRadius: 4, padding: "1px 6px" }}>{t.dealType}</span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>{priceText}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {referenceTrades.length > 0 && (
            <div style={{ marginTop: 12, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: "#FDE68A", fontWeight: 700 }}>주변 동일평형 참고 거래</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  {referenceScope === "umd" ? "단지 실거래 아님 · 같은 법정동 기준" : "단지 실거래 아님 · 같은 시군구 기준"}
                </div>
              </div>
              {referenceNote && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  {referenceNote}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {referenceTrades.map((t, i) => {
                  const areaSqm = t.area ? parseFloat(t.area) : null
                  const pyeong = areaSqm ? Math.round(areaSqm / 3.305) : null
                  const areaLabel = areaSqm ? `${areaSqm}㎡(${pyeong}평형)` : ""
                  const priceText = t.price >= 10000
                    ? `${Math.floor(t.price / 10000)}억 ${t.price % 10000 > 0 ? (t.price % 10000).toLocaleString() + "만원" : ""}`
                    : `${t.price.toLocaleString()}만원`
                  return (
                    <div key={`${t.aptName}-${t.dealDate}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                        {t.dealDate} · {t.aptName} · {areaLabel}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>{priceText}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: 의사결정 안전 점수 + 후회 확률 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 200, alignSelf: "center" }}>
          {/* Score gauge card */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              오를지 종합점수
            </div>
            <ScoreGauge score={headlineScore} />
            <div style={{ fontSize: 40, fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginTop: 8 }}>{headlineScore}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>/ 100점</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: gradeBadge.bg, borderRadius: 9999, padding: "4px 14px", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: gradeBadge.color, fontWeight: 700 }}>등급 {grade}</span>
              <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: gradeBadge.color }}>{sg.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {data.presale_score_label || "오를지 엔진 + AI 통합 분석"}
            </div>
            {/* 상담자 관점 한 줄 해석 */}
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: headlineScore >= 64 ? "rgba(34,197,94,0.15)" : headlineScore >= 50 ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${headlineScore >= 64 ? "rgba(34,197,94,0.3)" : headlineScore >= 50 ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`,
              fontSize: 11, fontWeight: 600,
              color: headlineScore >= 64 ? "#86EFAC" : headlineScore >= 50 ? "#FDE68A" : "#FCA5A5",
              lineHeight: 1.5,
            }}>
              {verdict.emoji} {verdict.label}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 8, lineHeight: 1.6 }}>
              {verdict.sub}
            </div>
            <div style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(99,102,241,0.14)",
              border: "1px solid rgba(129,140,248,0.35)",
              textAlign: "left",
            }}>
              <div style={{ fontSize: 10, color: "#C7D2FE", fontWeight: 700, marginBottom: 4 }}>
                {recommendationBadge}
              </div>
              <div style={{ fontSize: 11, color: "#E0E7FF", lineHeight: 1.6 }}>
                {recommendationCopy.dashboardBanner}
              </div>
            </div>
          </div>

          {/* 점수 구성 안내 */}
          <div style={{
            borderRadius: 14,
            padding: "14px 18px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 10, letterSpacing: "0.06em" }}>
              {data.is_presale ? "점수 기준" : "점수 구성"}
            </div>
            {data.is_presale ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                분양단지는 실거래 데이터가 없어<br />
                <strong style={{ color: "rgba(255,255,255,0.85)" }}>시세차익 60%</strong> + <strong style={{ color: "rgba(255,255,255,0.85)" }}>입지전망 25%</strong> + <strong style={{ color: "rgba(255,255,255,0.85)" }}>단지품질 15%</strong>로 점수 산출
              </div>
            ) : (
              <>
                {[
                  { label: "오를지 엔진", pct: 65, color: "#3B82F6" },
                  { label: "AI 지역 이슈", pct: 35, color: "#10B981" },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
                      <span style={{ fontSize: 11, color: item.color, fontWeight: 700 }}>{item.pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 9999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${item.pct}%`, background: item.color, borderRadius: 9999 }} />
                    </div>
                  </div>
                ))}
              </>
            )}
            {data.score_explanation && (
              <div style={{
                marginTop: 10, padding: "8px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.6,
              }}>
                {data.score_explanation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreStrip({ categories, activeTab, setActiveTab, loadingCats }: {
  categories: Partial<Record<CategoryId, CategoryResult>>
  activeTab: ActiveTab
  setActiveTab: (t: ActiveTab) => void
  loadingCats: Set<CategoryId>
}) {
  return (
    <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB", overflowX: "auto" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .cat-loading { animation: pulse 1.2s ease-in-out infinite; }
      `}</style>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(8,1fr)", minWidth: 600 }}>
        {CATEGORY_ORDER.map((id) => {
          const m = CATEGORY_META[id]
          const loading = loadingCats.has(id)
          const score = categories[id]?.score ?? 0
          const sg = scoreGrade(score)
          const active = id === activeTab
          const barColor = score >= 75 ? "#16A34A" : score >= 64 ? "#059669" : score >= 56 ? "#D97706" : score >= 50 ? "#D97706" : "#DC2626"

          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: "16px 12px",
              background: active ? "#F0FDF4" : "transparent",
              border: "none",
              borderBottom: active ? "2px solid #16A34A" : "2px solid transparent",
              cursor: "pointer", textAlign: "center", transition: "all .15s",
              outline: "none",
              minHeight: 48,
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.label}
              </div>
              {loading ? (
                <>
                  <div className="cat-loading" style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: "#D1D5DB", lineHeight: 1 }}>--</div>
                  <div style={{ height: 3, background: "#F3F4F6", borderRadius: 9999, margin: "8px 6px 0" }}>
                    <div className="cat-loading" style={{ height: "100%", width: "40%", background: "#E5E7EB", borderRadius: 9999 }} />
                  </div>
                  <div className="cat-loading" style={{ fontSize: 10, fontWeight: 600, color: "#D1D5DB", marginTop: 4 }}>분석중</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, color: active ? "#16A34A" : "#111827", lineHeight: 1 }}>
                    {score}
                  </div>
                  <div style={{ height: 3, background: "#F3F4F6", borderRadius: 9999, margin: "8px 6px 0" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 9999, transition: "width .6s" }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: sg.color, marginTop: 4 }}>{sg.label}</div>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CategoryDetail({ cat, meta }: { cat: CategoryResult | null; meta: { label: string; icon: string } | null }) {
  if (!cat || !meta) return null
  const sg = scoreGrade(cat.score)
  const sources = CATEGORY_SOURCES[cat.id] ?? []
  const evidence = (cat.items ?? []).slice(0, 3)
  const updatedLabel = formatDateTime(cat.updatedAt)
  const cachedLabel = formatDateTime(cat.cachedAt)
  const schoolRaw = cat.id === "school"
    ? (cat.rawData as {
        schoolCount?: number
        academyCount?: number
        hasChoopuma?: boolean
        closestSchool?: { name: string; distance: number; walkMinutes: number; isChoopuma?: boolean } | null
        closestAcademy?: { name: string; distance: number; walkMinutes: number } | null
      } | undefined)
    : undefined

  const scoreColor = cat.score >= 75 ? "#16A34A" : cat.score >= 64 ? "#059669" : cat.score >= 56 ? "#D97706" : cat.score >= 50 ? "#D97706" : "#DC2626"
  const scoreBg   = cat.score >= 75 ? "#DCFCE7" : cat.score >= 64 ? "#D1FAE5" : cat.score >= 56 ? "#FEF9C3" : cat.score >= 50 ? "#FEF3C7" : "#FEE2E2"
  const reportRows = [
    { label: "최신성", value: `업데이트 ${updatedLabel} · 캐시 ${cat.cached ? "사용" : "미사용"} · 기준 ${cachedLabel}` },
    { label: "출처", value: sources.length === 0 ? "출처 정보 없음" : sources.join(", ") },
    { label: "근거 3줄", value: evidence.length === 0 ? "분석 근거 항목이 없습니다." : evidence.map((e, i) => `${i + 1}. ${e.name} (${e.status})`).join("  ") },
  ]

  if (schoolRaw) {
    reportRows.push(
      {
        label: "주변 초등학교",
        value: `${schoolRaw.schoolCount ?? 0}개` +
          (schoolRaw.closestSchool
            ? ` · 가장 가까움 ${schoolRaw.closestSchool.name} ${schoolRaw.closestSchool.distance}m / ${schoolRaw.closestSchool.walkMinutes}분`
            : ""),
      },
      {
        label: "학원수",
        value: `${schoolRaw.academyCount ?? 0}개` +
          (schoolRaw.closestAcademy
            ? ` · 가장 가까움 ${schoolRaw.closestAcademy.name} ${schoolRaw.closestAcademy.distance}m / ${schoolRaw.closestAcademy.walkMinutes}분`
            : ""),
      },
      {
        label: "초품아",
        value: schoolRaw.hasChoopuma ? "예" : "아니오",
      },
    )
  }

  return (
    <>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{meta.label}</div>
            {cat.summary && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{cat.summary}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: scoreBg, color: scoreColor, borderRadius: 9999, padding: "4px 12px", fontSize: 14, fontWeight: 800 }}>
            {cat.score}점
          </span>
          <span style={{ background: sg.bg, color: sg.color, borderRadius: 9999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            {sg.label}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              {["항목", "상태", "내용", "영향"].map((h) => (
                <th key={h} style={{
                  padding: "10px 20px", fontSize: 12, fontWeight: 600, color: "#6B7280",
                  textAlign: h === "영향" ? "center" : "left",
                  letterSpacing: "0.05em", textTransform: "uppercase" as const,
                  borderBottom: "1px solid #E5E7EB",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cat.items?.map((item, i) => {
              const imp = IMPACT_STYLE[item.impact] ?? IMPACT_STYLE.MED
              return (
                <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "#111827", minWidth: 120 }}>{item.name}</td>
                  <td style={{ padding: "14px 20px", fontSize: 18, textAlign: "center" }}>{item.status}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{item.detail}</td>
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>
                    <span style={{
                      background: imp.bg, color: imp.text,
                      border: `1px solid ${imp.border}`,
                      borderRadius: 9999, padding: "3px 8px",
                      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const,
                    }}>{imp.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Evidence footer */}
      <div style={{ background: "#F9FAFB", padding: "14px 20px", borderTop: "1px solid #E5E7EB" }}>
        {reportRows.map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, minWidth: 56, flexShrink: 0 }}>{row.label}</span>
            <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function SidePanel({ data, canAccess, isLoggedIn, onPaywall, recommendationContext, aptId }: { data: DashboardData; canAccess: boolean; isLoggedIn: boolean; onPaywall: () => void; recommendationContext?: RecommendationContext; aptId?: number | null }) {
  const { sellScenarios, categories, myProperty } = data
  const [copied, setCopied] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const shareRef = useRef<HTMLDivElement | null>(null)
  const rewardKey = aptId ? String(aptId) : myProperty.aptName
  const [shareAudience, setShareAudience] = useState<ShareAudience>("family")
  const [shareRewardVisible, setShareRewardVisible] = useState(false)
  const [proofPreview, setProofPreview] = useState<ReportProofPreview | null>(null)
  const agentProfile = readAgentProfile()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      void session
    })
  }, [])

  useEffect(() => {
    const audience = getShareAudience(readAgentProfile())
    setShareAudience(audience)
    setShareRewardVisible(Boolean(readShareReward(rewardKey)))
  }, [rewardKey])

  useEffect(() => {
    const targetPrice = myProperty.purchasePrice || null
    if (!targetPrice) { setProofPreview(null); return }
    const persona = agentProfile ? "agent" : normalizedContext.purpose === "투자" ? "investor" : normalizedContext.purpose === "실거주" ? "first-home" : "general"
    fetch("/api/proof-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona,
        targetPrice,
        budget: recommendationContext?.budget ?? null,
      }),
    }).then(r => r.json()).then(json => {
      if (json.data) setProofPreview(json.data)
    }).catch(() => setProofPreview(null))
  }, [myProperty.purchasePrice, recommendationContext?.budget])

  const transport = categories.transport
  const school = categories.school
  const geo = categories.geo
  const market = categories.market
  const finalScore = data.finalScore ?? data.gateScore ?? data.totalScore
  const finalGrade = totalGrade(finalScore)
  const mlHorizons = data.mlForecast?.horizons ?? []
  const ml12 = mlHorizons.find((h) => h.horizon === 12)
  const ml24 = mlHorizons.find((h) => h.horizon === 24)
  const ml36 = mlHorizons.find((h) => h.horizon === 36)
  const recommendationCopy = getRecommendationCopy(recommendationContext)
  const recommendationBadge = recommendationLabel(recommendationContext)
  const shareIntentCopy = getShareIntentCopy(shareAudience)
  const budgetFit = inferBudgetFit(myProperty.purchasePrice || null, recommendationContext?.budget ?? 0)
  const normalizedContext = normalizeRecommendationContext(recommendationContext)
  const reportPersona: ReportPersona = agentProfile
    ? "agent"
    : normalizedContext.purpose === "투자"
    ? "investor"
    : normalizedContext.purpose === "실거주"
    ? "first-home"
    : "general"
  const productId = reportPersona === "first-home" ? "first-home-pack" : "single-report"
  const decisionPack = getDecisionPack({ context: recommendationContext, budgetFit, persona: reportPersona, productId, hasAgentProfile: Boolean(agentProfile) })
  const checklistPack = getChecklistPack({ productId, context: recommendationContext, persona: reportPersona, hasAgentProfile: Boolean(agentProfile) })
  const describeCategory = (id: CategoryId) => {
    const cat = categories[id]
    const score = cat?.score ?? 0
    const tone = score >= 70
      ? "받쳐주는 힘이 있는 편입니다"
      : score >= 55
      ? "중립에서 버티는 수준입니다"
      : score >= 40
      ? "프리미엄을 강하게 기대하긴 어렵습니다"
      : "가격을 끌어올리는 축으로 보기는 어렵습니다"
    const summary = cat?.summary && !cat.summary.includes("오류") ? ` ${cat.summary}` : ""
    return `${CATEGORY_META[id].icon} ${CATEGORY_META[id].label}은 ${score}점으로 ${tone}.${summary}`
  }
  const scoreAnalysisRows = CATEGORY_ORDER.map(describeCategory)
  const mlNarrative = mlHorizons.length > 0
    ? `오를지 엔진은 이 지역이 전국 평균 대비 얼마나 유리하거나 불리한지를 -1~+1로 나타냅니다(양수=타 지역보다 강세, 음수=타 지역보다 약세). 12개월 ${fmtMlScore(ml12?.regionScore ?? ml12?.total ?? null)}, 24개월 ${fmtMlScore(ml24?.regionScore ?? ml24?.total ?? null)}, 36개월 ${fmtMlScore(ml36?.regionScore ?? ml36?.total ?? null)}로, 집값이 반드시 하락한다는 의미가 아니라 다른 지역에 비해 상대적으로 덜 오를 가능성이 높다는 신호입니다. 방향정확도는 12개월 ${ml12 ? Math.round(ml12.dirAcc * 100) : 0}%, 24개월 ${ml24 ? Math.round(ml24.dirAcc * 100) : 0}%, 36개월 ${ml36 ? Math.round(ml36.dirAcc * 100) : 0}%로, 언제 흐름이 전환되는지를 함께 보는 게 중요합니다.`
    : "오를지 엔진 리포트가 아직 연결되지 않아, 중기 방향은 별도 확인이 필요합니다."
  const reportLines = [
    `${myProperty.aptName} 리포트`,
    `${myProperty.address}`,
    "",
    ...(agentProfile
      ? [
          `[상담 정보] ${[agentProfile.office, agentProfile.name, agentProfile.phone].filter(Boolean).join(" · ")}`,
          agentProfile.leadName ? `[공유 대상] ${agentProfile.leadName}` : "",
          agentProfile.reportPurpose ? `[리포트 목적] ${agentProfile.reportPurpose}` : "",
          agentProfile.intro ? `[추가 안내] ${agentProfile.intro}` : "",
          "",
        ].filter(Boolean)
      : []),
    `${recommendationBadge} 해석을 기준으로 다시 정리한 상담 메모입니다. ${recommendationCopy.dashboardBanner}`,
    ...decisionPack.signals.map((signal) => `${signal.label}: ${signal.headline} — ${signal.detail}`),
    "",
    `이 리포트는 점수 하나보다 가격 흐름, 환금성, 실거주·투자 적합성을 같이 보도록 만든 상담 메모입니다. 교통 ${transport?.score ?? 0}점, 학군 ${school?.score ?? 0}점, 입지 ${geo?.score ?? 0}점, 시장 ${market?.score ?? 0}점을 함께 봐야 실제 체력이 보입니다.`,
    "",
    `교통은 ${transport?.summary || "출퇴근 동선과 환승 부담을 같이 봐야 하는 구간입니다."} 단순히 역이 있다는 사실보다, 출근 시간대에 얼마나 안정적으로 움직일 수 있느냐가 가격 방어력을 만듭니다.`,
    "",
    `학군은 ${school?.summary || "학교 수만이 아니라 학원 밀도와 생활권의 수요를 함께 봐야 합니다."} 초등학교, 학원, 통학 동선이 같이 받쳐줘야 실거주 수요가 오래 유지됩니다.`,
    "",
    `가격은 ${market?.summary || "최근 실거래와 거래 건수가 가격을 설명합니다."} 최근 실거래가가 개별 변수로 작동할 때는 급매 체결만 보고 판단하면 안 되고, 실제 호가와 층수 프리미엄까지 같이 봐야 매수 가능 가격이 보입니다.`,
    "",
    `점수분석표 전체를 같이 보면, 정책 ${categories.policy?.score ?? 0}점, 정치 ${categories.politics?.score ?? 0}점, 글로벌 ${categories.global?.score ?? 0}점, 맘카페 ${categories.momcafe?.score ?? 0}점도 결국 교통·학군·가격이 버틸 수 있는 환경인지 확인하는 보조축입니다.`,
    "",
    ...scoreAnalysisRows,
    "",
    mlNarrative,
    "",
    "계약 전 체크리스트",
    ...checklistPack.items.map((item) => `- ${item}`),
    "",
    `정리하면, 종합 점수 ${finalScore}점(${finalGrade})은 참고 출발점이고 최종 답은 아닙니다. 최근 거래, 전세가율, 거래량, 오를지 엔진 점수를 같이 봐서 지금 가격이 설명 가능한지 확인하는 게 핵심입니다.`,
  ]

  const ranked = CATEGORY_ORDER
    .map((id) => ({ id, score: categories[id]?.score ?? 0, label: CATEGORY_META[id].label }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const shareText = [
    `오를지AI 상담 분석 리포트`,
    `${myProperty.aptName} (${myProperty.address})`,
    `종합 점수: ${finalScore}점 (${finalGrade})`,
    `상위 지표: ${ranked.map((r) => `${r.label} ${r.score}점`).join(", ")}`,
    "",
    ...reportLines,
    "",
    `업데이트: ${formatDateTime(data.lastUpdated)}`,
  ].join("\n")

  async function captureShare() {
    if (!shareRef.current) return
    setCapturing(true)
    try {
      const { default: html2canvas } = await import("html2canvas")
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
      })
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = "oreulji-report.png"
      a.click()
    } finally {
      setCapturing(false)
    }
  }

  const cardStyle = { background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" as const }
  const cardHeaderStyle = { padding: "14px 16px", borderBottom: "1px solid #F3F4F6", fontSize: 14, fontWeight: 700, color: "#111827" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Share Report */}
      <div ref={shareRef} style={cardStyle}>
        <div style={cardHeaderStyle}>공유 리포트</div>
        {canAccess ? (
          <div style={{ padding: "14px 16px" }}>
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#F5F7FF", border: "1px solid #C7D2FE" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", marginBottom: 4 }}>{recommendationBadge}</div>
              <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>{recommendationCopy.dashboardBanner}</div>
            </div>
            {agentProfile && (
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#1D4ED8", marginBottom: 4 }}>중개사 모드 공유 미리보기</div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
                  {[agentProfile.office, agentProfile.name, agentProfile.phone].filter(Boolean).join(" · ")}
                  {agentProfile.leadName ? ` · ${agentProfile.leadName}` : ""}
                  {agentProfile.reportPurpose ? ` · ${agentProfile.reportPurpose}` : ""}
                </div>
              </div>
            )}
            {shareRewardVisible && (
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#166534", marginBottom: 4 }}>{shareIntentCopy.rewardTitle}</div>
                <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>{shareIntentCopy.rewardDescription}</div>
              </div>
            )}
            <textarea
              readOnly
              value={shareText}
              style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, fontSize: 13, width: "100%", resize: "none", height: 260, color: "#374151", lineHeight: 1.7, fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareText)
                    markShareReward(rewardKey, shareAudience)
                    setCopied(true)
                    setShareRewardVisible(true)
                    setTimeout(() => setCopied(false), 1500)
                  } catch {
                    setCopied(false)
                  }
                }}
                style={{ flex: 1, padding: "8px 14px", borderRadius: 8, background: "#F4F6F9", color: "#374151", border: "1px solid #E5E7EB", fontSize: 13, fontWeight: 500, cursor: "pointer", minHeight: 44 }}
              >
                {copied ? "✓ 복사됨" : shareIntentCopy.copyButtonLabel}
              </button>
              <button
                onClick={async () => {
                  markShareReward(rewardKey, shareAudience)
                  setShareRewardVisible(true)
                  await captureShare()
                }}
                style={{ flex: 1, padding: "8px 14px", borderRadius: 8, background: "#16A34A", color: "#FFFFFF", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}
              >
                {capturing ? "저장중..." : shareIntentCopy.imageButtonLabel}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", overflow: "hidden" }}>
            {/* 실제 리포트 내용 블러 처리 */}
            <div style={{ filter: "blur(5px)", pointerEvents: "none", padding: "14px 16px", userSelect: "none" }}>
              <textarea
                readOnly
                value={shareText}
                style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, fontSize: 13, width: "100%", resize: "none", height: 200, color: "#374151", lineHeight: 1.7, fontFamily: "inherit" }}
              />
            </div>
            {/* 오버레이 */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(255,255,255,0.72)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span style={{ fontSize: 22 }}>🔒</span>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{recommendationCopy.lockedOverlayTitle}</div>
              <div style={{ fontSize: 11, color: "#6B7280", textAlign: "center", padding: "0 16px", lineHeight: 1.6 }}>
                {recommendationCopy.lockedOverlayDescription}<br/>
                복사 및 이미지 저장 가능
              </div>
              {isLoggedIn ? (
                <button onClick={onPaywall} style={{
                  marginTop: 4, padding: "9px 24px", borderRadius: 9999,
                  background: "#16A34A", color: "#FFFFFF", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                }}>{recommendationCopy.lockedOverlayTitle}</button>
              ) : (
                <Link href="/login" style={{
                  marginTop: 4, padding: "9px 24px", borderRadius: 9999,
                  background: "#16A34A", color: "#FFFFFF", fontSize: 12, fontWeight: 700, textDecoration: "none",
                }}>로그인하기</Link>
              )}
            </div>
          </div>
        )}
      </div>

      {canAccess ? (
        <>
          <DecisionPackCard
            title={decisionPack.title}
            subtitle={decisionPack.subtitle}
            signals={decisionPack.signals}
          />
          <ChecklistBlock title={checklistPack.title} items={checklistPack.items} />
        </>
      ) : (
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
          <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none", display: "grid", gap: 16 }}>
            <DecisionPackCard
              title={decisionPack.title}
              subtitle={decisionPack.subtitle}
              signals={decisionPack.signals}
            />
            <ChecklistBlock title={checklistPack.title} items={checklistPack.items} />
          </div>
          <div style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,0.72)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            textAlign: "center", gap: 8, padding: 20,
          }}>
            <span style={{ fontSize: 22 }}>🔒</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{recommendationCopy.lockedOverlayTitle}</div>
            <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
              공통 판단 리포트 뒤에 신혼부부·중개사·투자자 관점 3개가 따로 열리고, 계산표·상담 브리프·세후 손익표까지 한 번에 확인할 수 있습니다.
            </div>
            {proofPreview && (
              <div style={{ width: "100%", maxWidth: 280, background: "#EEF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#1D4ED8", marginBottom: 6 }}>{proofPreview.title}</div>
                <div style={{ display: "grid", gap: 4 }}>
                  {proofPreview.lines.slice(0, 3).map((item) => (
                    <div key={item} style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isLoggedIn ? (
              <button onClick={onPaywall} style={{
                marginTop: 4, padding: "9px 24px", borderRadius: 9999,
                background: "#16A34A", color: "#FFFFFF", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              }}>{recommendationCopy.lockedOverlayTitle}</button>
            ) : (
              <Link href="/login" style={{
                marginTop: 4, padding: "9px 24px", borderRadius: 9999,
                background: "#16A34A", color: "#FFFFFF", fontSize: 12, fontWeight: 700, textDecoration: "none",
              }}>로그인하기</Link>
            )}
          </div>
        </div>
      )}

      {/* Attractiveness chart */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>투자 매력도 분포</div>
        <div style={{ padding: "14px 16px" }}>
          {CATEGORY_ORDER.map((id) => {
            const m = CATEGORY_META[id]
            const score = categories[id]?.score ?? 0
            const barColor = score >= 75 ? "#16A34A" : score >= 64 ? "#059669" : score >= 56 ? "#D97706" : score >= 50 ? "#D97706" : "#DC2626"
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#374151", minWidth: 84, lineHeight: 1.3 }}>{m.icon} {m.label}</span>
                <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 9999 }}>
                  <div style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 9999, transition: "width .8s" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", minWidth: 24, textAlign: "right" }}>{score}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Loan Calculator */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>🏦 대출 계산기</div>
        <div style={{ padding: "14px 16px 16px" }}>
          <LoanCalculator defaultPrice={myProperty.purchasePrice || null} />
        </div>
      </div>

      {/* Tax Calculator */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>💰 세금 계산기</div>
        <div style={{ padding: "14px 16px 16px" }}>
          <TaxCalculator />
        </div>
      </div>

      {/* (legacy sell scenario placeholder — hidden if empty) */}
      <div style={{ display: "none" }}>
        <div style={{ padding: "8px 16px 16px" }}>
          {sellScenarios.map((s, i) => (
            <div key={i} style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: i < sellScenarios.length - 1 ? 8 : 0,
              background: s.isOptimal ? "#FFFBEB" : "#F9FAFB",
              border: s.isOptimal ? "1px solid #FDE68A" : "1px solid #F3F4F6",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {s.isOptimal && <span style={{ background: "#D97706", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 9999 }}>최적</span>}
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{s.period}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: s.isOptimal ? "#D97706" : "#16A34A" }}>+{s.roi}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#111827" }}>
                <span>예상 {s.expectedPrice.toLocaleString("ko-KR")}만원</span>
                <span style={{ color: "#16A34A", fontWeight: 600 }}>+{s.profit.toLocaleString("ko-KR")}만원</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Triggers */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>📌 시장 확인 트리거</div>
        <div style={{ padding: "4px 16px 8px" }}>
          {[
            { icon: "🚇", title: "주요 교통호재 착공 발표",  desc: "생활권 프리미엄 재확인", level: "HIGH" as ImpactLevel },
            { icon: "📉", title: "기준금리 2회 연속 인하",  desc: "수요 변화 확인 필요",    level: "MED"  as ImpactLevel },
            { icon: "📈", title: "인근 실거래 신고가 경신",  desc: "현재 가격 눈높이 재확인", level: "POS"  as ImpactLevel },
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9999, background: "#F0FDF4", color: "#16A34A", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 3 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Flow */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>📋 계약 전 체크리스트</div>
        <div style={{ padding: "12px 16px 16px" }}>
          {[
            { step: "1", title: "필수 자료 점검",    desc: "등기부등본, 대출잔액, 관리비·수선기록 정리", tag: "D-7~14" },
            { step: "2", title: "가격 전략 확정",    desc: "최소 순이익 목표 설정 후 호가/하한가 결정",   tag: "D-3~7"  },
            { step: "3", title: "매물 등록 & 사진",  desc: "동/층/뷰 강점 강조, 방문 동선 최적화",       tag: "D-1~3"  },
            { step: "4", title: "계약·세금 체크",    desc: "계약금/잔금 일정, 세금/수수료 확정",         tag: "D-day"  },
          ].map((s, i) => (
            <div key={s.step} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < 3 ? 12 : 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: "#16A34A", color: "#FFFFFF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.title}</div>
                  <span style={{ background: "#F0FDF4", color: "#15803D", borderRadius: 9999, fontSize: 10, fontWeight: 600, padding: "2px 8px", whiteSpace: "nowrap" as const }}>{s.tag}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>즉시 확인 필요 항목</div>
        <div style={{ padding: "8px 16px 16px" }}>
          {[
            "초등학교 경로 신호등 유무 현장 확인",
            "인근 역까지 도보 거리 실측",
            "인근 역 버스 환승 동선 파악",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: 24, height: 24, borderRadius: 9999, background: "#DCFCE7", color: "#15803D", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: "#374151" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: "12px 14px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 11, color: "#9CA3AF", lineHeight: 1.8 }}>
        본 분석은 공공 실거래 데이터 기반의 AI 참고 정보이며, 특정 부동산의 매수·매도를 권유하지 않습니다. 투자 결과에 대한 책임은 이용자 본인에게 있으며, 최종 결정 전 반드시 공인중개사 등 전문가와 상담하시기 바랍니다.
      </div>
    </div>
  )
}

function QuickOnboarding() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const closed = localStorage.getItem("orulzi_onboarding_closed")
      if (!closed) {
        setVisible(true)
      }
    }
  }, [])

  if (!visible) return null

  const handleClose = () => {
    setVisible(false)
    localStorage.setItem("orulzi_onboarding_closed", "true")
  }

  return (
    <div style={{
      maxWidth: 1280,
      margin: "12px auto 0",
      padding: "0 16px",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
        border: "1px solid #A7F3D0",
        borderRadius: "14px",
        padding: "16px 20px",
        position: "relative",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.02)",
      }}>
        {/* CLOSE BUTTON */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "transparent",
            border: "none",
            color: "#065F46",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            padding: "4px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* TITLE */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span style={{ fontSize: "18px" }}>💡</span>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#065F46" }}>
            오를지AI 3초 사용 가이드
          </span>
        </div>

        {/* 3-STEP GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}>
          {/* STEP 1 */}
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "20px", fontWeight: 900, color: "#059669", lineHeight: 1 }}>1</span>
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#065F46", margin: "0 0 2px 0" }}>
                무슨 서비스인가요?
              </h4>
              <p style={{ fontSize: "12px", color: "#047857", margin: 0, lineHeight: 1.5 }}>
                광고·추천에 속아 집을 잘못 사고 후회하지 않도록, 실거래 통계와 AI 분석으로 <strong>2년 후 후회할 리스크</strong>를 점수화합니다.
              </p>
            </div>
          </div>

          {/* STEP 2 */}
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "20px", fontWeight: 900, color: "#059669", lineHeight: 1 }}>2</span>
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#065F46", margin: "0 0 2px 0" }}>
                점수는 어떻게 보나요?
              </h4>
              <p style={{ fontSize: "12px", color: "#047857", margin: 0, lineHeight: 1.5 }}>
                종합점수가 <strong>75점 이상(A)</strong>이면 안심 매수 영역, <strong>50점 이하(C+)</strong>는 후회 확률이 매우 높으니 신중하세요.
              </p>
            </div>
          </div>

          {/* STEP 3 */}
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "20px", fontWeight: 900, color: "#059669", lineHeight: 1 }}>3</span>
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#065F46", margin: "0 0 2px 0" }}>
                어떻게 쓰나요?
              </h4>
              <p style={{ fontSize: "12px", color: "#047857", margin: 0, lineHeight: 1.5 }}>
                하단 리스크 지표를 눌러 <strong>AI 요약</strong>을 읽어보고, <strong>시나리오</strong> 탭에서 내 예산/대출 금리에 따른 감당 능력을 체크하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const AI_DYNAMIC_CATS = new Set(["transport", "policy", "politics", "global", "momcafe", "geo"])

export function Dashboard({ data, userName = "사용자", lawdCd = "", recommendationContext }: { data: DashboardData, userName?: string, lawdCd?: string, recommendationContext?: RecommendationContext }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("transport")
  const contentRef = useRef<HTMLElement | null>(null)
  const isFirstRender = useRef(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [categories, setCategories] = useState<Partial<Record<CategoryId, CategoryResult>>>(data.categories ?? {})
  const [loadingCats, setLoadingCats] = useState<Set<CategoryId>>(new Set(CATEGORY_ORDER))
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallTrigger, setPaywallTrigger] = useState<"scenario" | "ml-forecast">("scenario")
  const [userPlan, setUserPlan] = useState<"free" | "subscription">("free")
  const [purchasedAptIds, setPurchasedAptIds] = useState<number[]>([])
  const [favId, setFavId] = useState<string | null>(null)
  const [favLoading, setFavLoading] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  // URL 파라미터에서 aptId 추출 (gate DB id)
  const aptId = typeof window !== "undefined"
    ? Number(new URLSearchParams(window.location.search).get("aptId") ?? "0") || null
    : null

  const canAccessDeep = useCallback(() => {
    if (userPlan === "subscription") return true
    if (aptId && purchasedAptIds.includes(aptId)) return true
    return false
  }, [userPlan, purchasedAptIds, aptId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session))

    // 첫 방문 시 가이드 자동 표시
    if (typeof window !== "undefined") {
      const hasSeenGuide = localStorage.getItem("orulzi_guide_seen")
      if (!hasSeenGuide) {
        setGuideOpen(true)
        localStorage.setItem("orulzi_guide_seen", "true")
      }
    }

    // 결제 상태 조회
    fetch("/api/payments/status")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setUserPlan(d.plan ?? "free")
        setPurchasedAptIds((d.purchases ?? []).map((p: { aptId: number }) => p.aptId))
      })
      .catch(() => {})

    // 즐겨찾기 상태 조회
    fetch("/api/favorites")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data) return
        const found = json.data.find((f: { aptName: string; id: string }) => f.aptName === data.myProperty.aptName)
        setFavId(found?.id ?? null)
      })
      .catch(() => {})

    // URL 파라미터 없이 직접 접근 시: localStorage의 내 아파트 데이터로 리다이렉트
    // (dashboard/page.tsx가 NextAuth 기반이라 Supabase 세션을 못 읽는 문제 우회)
    const params = new URLSearchParams(window.location.search)
    if (!params.get("apt")) {
      const storedApt    = localStorage.getItem("my_apt_name")
      const storedAddr   = localStorage.getItem("my_address")
      const storedLawdCd = localStorage.getItem("my_lawdcd")
      if (storedApt && storedAddr) {
        const url = new URL(window.location.href)
        url.searchParams.set("apt",     storedApt)
        url.searchParams.set("address", storedAddr)
        if (storedLawdCd) url.searchParams.set("lawdCd", storedLawdCd)
        window.location.replace(url.toString())
        return
      }
    }

    // 마이페이지에서 내 아파트를 저장하지 않은 경우에만 마지막 조회 아파트 저장
    // (my_apt_locked가 있으면 내 아파트가 확정된 것이므로 덮어쓰지 않음)
    if (params.get("apt") && lawdCd && data.myProperty.aptName && data.myProperty.address) {
      if (!localStorage.getItem("my_apt_locked")) {
        localStorage.setItem("my_lawdcd",  lawdCd)
        localStorage.setItem("my_apt_name", data.myProperty.aptName)
        localStorage.setItem("my_address",  data.myProperty.address)
      }
    }

    const leadId = params.get("leadId")
    if (leadId) {
      fetch("/api/lead-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          type: "dashboard_view",
          aptId,
          aptName: data.myProperty.aptName,
          address: data.myProperty.address,
        }),
      }).catch(() => {})
    }

    // 카테고리 클라이언트 사이드 스트리밍 로드 (캐시 히트 시 즉시 반환)
    const { address, aptName } = data.myProperty
    const urlParams = new URLSearchParams(window.location.search)
    const aptIdParam = urlParams.get("aptId") || ""

    const fetchCategory = async (id: CategoryId) => {
      const apiPath = AI_DYNAMIC_CATS.has(id) ? `ai-category/${id}` : id
      const areaParam = data.myProperty.area ? `&area=${encodeURIComponent(data.myProperty.area)}` : ""
      let url = `/api/${apiPath}?address=${encodeURIComponent(address)}&apt=${encodeURIComponent(aptName)}${lawdCd ? `&lawdCd=${encodeURIComponent(lawdCd)}` : ""}${areaParam}`
      if (id === "market" && aptIdParam) url += `&aptId=${encodeURIComponent(aptIdParam)}`
      try {
        const res = await fetch(url)
        const json = await res.json()
        if (json?.data) {
          setCategories(prev => ({ ...prev, [id]: { ...json.data, cached: json.cached, cachedAt: json.cachedAt } }))
        }
      } catch { /* 개별 카테고리 실패는 무시 */ }
      setLoadingCats(prev => { const s = new Set(prev); s.delete(id); return s })
    }

    // 병렬 실행 — 브라우저 동시 연결 제한에 의해 자연스럽게 큐잉
    Promise.all(CATEGORY_ORDER.map(fetchCategory))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 탭 전환 시 콘텐츠 영역으로 자동 스크롤
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [activeTab])

  async function toggleFav() {
    if (favLoading) return
    setFavLoading(true)
    try {
      if (favId) {
        await fetch(`/api/favorites?id=${favId}`, { method: "DELETE" })
        setFavId(null)
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aptName: data.myProperty.aptName,
            address: data.myProperty.address,
            lawdCd,
            dealTypes: ["매매"],
            areaFilter: [],
          }),
        })
        if (res.status === 401) { alert("로그인 후 이용 가능합니다"); return }
        if (res.status === 403) { alert("즐겨찾기는 최대 3개까지 저장 가능합니다. 유료구독 시 무제한 이용 가능합니다."); return }
        const json = await res.json()
        if (json?.data?.id) setFavId(json.data.id)
      }
    } finally {
      setFavLoading(false)
    }
  }

  // 로드된 카테고리 기반 동적 점수 계산
  const loadedList = Object.values(categories).filter(Boolean) as CategoryResult[]
  const totalScore = loadedList.length > 0
    ? Math.round(loadedList.reduce((s, c) => s + c.score, 0) / loadedList.length)
    : (data.gateScore ?? 50)
  const aiNoSchool = loadedList.filter(c => c.id !== "school")
  const aiScoreNoSchool = aiNoSchool.length > 0
    ? Math.round(aiNoSchool.reduce((s, c) => s + c.score, 0) / aiNoSchool.length)
    : 50
  const computedFinalScore = Math.round((data.gateScore ?? 50) * 0.65 + aiScoreNoSchool * 0.35)
  // DB 사전계산값(dbFinalScore)이 있으면 우선 사용 — AI 로드로 인한 점수 변동 방지
  const finalScore = (data.finalScore != null && !isNaN(data.finalScore)) ? data.finalScore
    : loadedList.length > 0 ? computedFinalScore
    : (data.gateScore ?? 50)

  // 서브컴포넌트에 전달할 live data (카테고리 + 점수 실시간 반영)
  const liveData: DashboardData = {
    ...data,
    categories: categories as Record<CategoryId, CategoryResult>,
    totalScore,
    finalScore,
  }

  const isCategoryTab = activeTab !== "predict" && activeTab !== "alerts" && activeTab !== "presale" && activeTab !== "ml-forecast"
  const cat  = isCategoryTab ? categories[activeTab as CategoryId] ?? null : null
  const meta = isCategoryTab ? CATEGORY_META[activeTab as CategoryId] : null

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", color: "#111827" }}>
      {paywallOpen && (
        <PaywallModal
          aptName={data.myProperty.aptName}
          aptId={aptId ?? undefined}
          lawdCd={lawdCd}
          aptPrice={data.myProperty.purchasePrice || undefined}
          trigger={paywallTrigger}
          onClose={() => setPaywallOpen(false)}
          onSuccess={() => {
            setPaywallOpen(false)
            if (aptId) {
              setPurchasedAptIds(prev => [...prev, aptId])
            }
          }}
        />
      )}
      <GuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #F4F6F9; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
        button { font-family: inherit; cursor: pointer; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn .25s ease; }
        
        @media (max-width: 768px) {
          .top-info-bar { display: none !important; }
          .main-gnb-container { top: 0 !important; }
          .main-gnb-inner { height: 38px !important; gap: 4px !important; }
          .gnb-logo-img { width: 26px !important; height: 26px !important; }
          .gnb-guide-text { display: none !important; }
          .gnb-username { display: none !important; }
          .gnb-apt-badge { max-width: calc(100vw - 125px) !important; font-size: 11px !important; padding: 2px 6px !important; }
          .gnb-right-actions { gap: 6px !important; }
          .gnb-right-actions button { font-size: 11px !important; }
          .gnb-tab-nav button { height: 34px !important; padding: 0 10px !important; font-size: 12px !important; }
        }
      `}</style>

      <GNB
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aptName={data.myProperty.aptName}
        address={data.myProperty.address}
        area={data.myProperty.area}
        lastUpdated={data.lastUpdated}
        userName={userName}
        onOpenGuide={() => setGuideOpen(true)}
      />
      <QuickOnboarding />
      <AssetHero data={liveData} favId={favId} favLoading={favLoading} onToggleFav={toggleFav} aptId={aptId} recommendationContext={recommendationContext} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 16px 0" }}>
        <ExplainabilityCard data={liveData} title="🧭 점수 구성과 근거" />
      </div>
      <ScoreStrip categories={categories} activeTab={activeTab} setActiveTab={setActiveTab} loadingCats={loadingCats} />

      <main ref={contentRef} style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px", scrollMarginTop: 90 }}>
        <style>{`@media(max-width:768px){.dash-cat-grid{grid-template-columns:1fr!important}.dash-main-padding{padding:16px 12px!important}}@keyframes orulziSpin{to{transform:rotate(360deg)}}@keyframes orulziPulse{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>

        {activeTab === "ml-forecast" && (
          <div key="ml-forecast" className="fade-in" style={{ maxWidth: 720 }}>
            {canAccessDeep() ? (
              <MlForecast data={data.mlForecast} />
            ) : (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ background: "#F0F4FF", borderBottom: "1px solid #E5E7EB", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>🤖 AI 24개월 예측 리포트</span>
                  <span style={{ background: "#1B4FBB", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 9999 }}>유료 전용</span>
                </div>
                <div style={{ position: "relative" }}>
                  <div style={{ padding: 24, filter: "blur(7px)", userSelect: "none", pointerEvents: "none" }}>
                    <MlForecast data={data.mlForecast} />
                  </div>
                  {(() => {
                    const horizons = data.mlForecast?.horizons ?? []
                    const ml24 = horizons.find(h => h.horizon === 24)
                    const direction = ml24
                      ? (ml24.regionScore ?? ml24.total ?? 0) >= 0 ? "상대 강세" : "상대 약세"
                      : null
                    const dirColor = direction === "상대 강세" ? "#16A34A" : "#DC2626"
                    return (
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.68)", backdropFilter: "blur(2px)",
                        padding: "0 24px",
                      }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                        {direction && (
                          <div style={{ background: "#F0F4FF", border: "1px solid #C7D2FE", borderRadius: 8, padding: "8px 16px", marginBottom: 12, textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "#6B7280" }}>24개월 후 이 지역 예측 방향</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: dirColor, marginTop: 2 }}>{direction}</div>
                            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>구체적 수치 · 진입 시점 · 가격 방향은 잠금 해제 후 확인</div>
                          </div>
                        )}
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>AI 24개월 예측 리포트</div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 18, textAlign: "center", lineHeight: 1.6 }}>
                          진입 시점 · 리스크 구간 · 가격 방향 예측<br/>6개월 안에 계약 예정이라면 지금 구간 해석이 중요합니다
                        </div>
                        {isLoggedIn ? (
                          <button onClick={() => { setPaywallTrigger("ml-forecast"); setPaywallOpen(true) }} style={{
                            padding: "11px 32px", borderRadius: 10,
                            background: "#1B4FBB", color: "#fff",
                            fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                          }}>AI 24개월 예측 전체 보기</button>
                        ) : (
                          <Link href="/login" style={{
                            padding: "11px 32px", borderRadius: 10,
                            background: "#16A34A", color: "#FFFFFF",
                            fontSize: 14, fontWeight: 700, textDecoration: "none",
                          }}>로그인하기</Link>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "alerts" && (
          <div key="alerts" className="fade-in" style={{ maxWidth: 600 }}>
            <AlertSystem />
          </div>
        )}

        {activeTab === "presale" && (
          <div key="presale" className="fade-in" style={{ maxWidth: 680 }}>
            <PresaleSystem />
          </div>
        )}

        {activeTab === "weekly" && (
          <div key="weekly" className="fade-in" style={{ maxWidth: 600 }}>
            <WeeklyReportCard />
          </div>
        )}

        {activeTab === "predict" && (
          <div key="predict" className="fade-in" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
            <div style={{ background: "#F0FDF4", borderBottom: "1px solid #DCFCE7", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>📊 가격 흐름 시나리오</span>
                <span style={{ fontSize: 12, color: "#6B7280", marginLeft: 12 }}>8개 지표 자동 연동 · 시나리오별 가격 부담 변화 시뮬레이션</span>
              </div>
              <span style={{ background: "#1B4FBB", color: "#FFFFFF", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 9999 }}>유료 전용</span>
            </div>
            {canAccessDeep() ? (
              <div style={{ padding: 24 }}>
                <PriceSimulator data={liveData} />
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* 실제 컴포넌트를 블러로 덮어 미리보기 유도 */}
                <div style={{ padding: 24, filter: "blur(7px)", userSelect: "none", pointerEvents: "none" }}>
                  <PriceSimulator data={liveData} />
                </div>
                {/* 결제 유도 오버레이 */}
                {(() => {
                  const headScore = data.finalScore ?? data.gateScore ?? data.totalScore
                  const riskLoss = data.categories?.market?.score != null
                    ? Math.round((100 - data.categories.market.score) / 100 * (data.myProperty.purchasePrice || 0) / 10000 * 10) / 10
                    : null
                  return (
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.68)",
                      backdropFilter: "blur(2px)",
                      padding: "0 24px",
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 16px", marginBottom: 12, textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>종합점수 {headScore}점 기준</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#DC2626", marginTop: 2 }}>
                          최악/기준/최선 시나리오 · 진입/보류 판단 참고
                        </div>
                        {riskLoss && riskLoss > 0 && (
                          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                            보유 시 예상 손실 범위 포함
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>상승/하락 시나리오</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 18, textAlign: "center", lineHeight: 1.6 }}>
                        지금 사면 언제 팔아야 할까?<br/>3가지 시나리오로 출구 전략을 미리 세우세요
                      </div>
                      {isLoggedIn ? (
                        <button onClick={() => { setPaywallTrigger("scenario"); setPaywallOpen(true) }} style={{
                          padding: "11px 32px", borderRadius: 10,
                          background: "#1B4FBB", color: "#fff",
                          fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                        }}>시나리오 전체 확인하기</button>
                      ) : (
                        <Link href="/login" style={{
                          padding: "11px 32px", borderRadius: 10,
                          background: "#16A34A", color: "#FFFFFF",
                          fontSize: 14, fontWeight: 700, textDecoration: "none",
                        }}>로그인하기</Link>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {isCategoryTab && <SupplyRisk aptId={aptId} />}

        {isCategoryTab && loadingCats.has(activeTab as CategoryId) && (() => {
          const msg = CATEGORY_LOADING_MESSAGES[activeTab as CategoryId]
          return (
            <div key={activeTab} className="fade-in" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, marginTop: 20, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16, animation: "orulziSpin 1.2s linear infinite", display: "inline-block" }}>⚙️</div>
              {msg && (
                <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.8, marginBottom: 8 }}>
                  {msg.lines.map((l, i) => <div key={i}>{msg.emoji} {l}</div>)}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 12 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#D1D5DB", margin: "0 3px", animation: "orulziPulse 1.4s ease-in-out infinite" }} />
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#D1D5DB", margin: "0 3px", animation: "orulziPulse 1.4s ease-in-out infinite", animationDelay: "0.2s" }} />
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#D1D5DB", margin: "0 3px", animation: "orulziPulse 1.4s ease-in-out infinite", animationDelay: "0.4s" }} />
              </div>
            </div>
          )
        })()}

        {isCategoryTab && !loadingCats.has(activeTab as CategoryId) && (
          <div key={activeTab} className="fade-in dash-cat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
            {/* Left: category detail + quick nav */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              {canAccessDeep() ? (
                <CategoryDetail cat={cat} meta={meta} />
              ) : (
                <div style={{ position: "relative" }}>
                  <div style={{ filter: "blur(6px)", userSelect: "none", pointerEvents: "none" }}>
                    <CategoryDetail cat={cat} meta={meta} />
                  </div>
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.68)", backdropFilter: "blur(2px)",
                    padding: "0 24px",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                    {/* 실제 데이터 기반 힌트 */}
                    {cat && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 14px", marginBottom: 12, textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>
                          {meta?.icon} {meta?.label} {cat.score}점
                          {cat.items && cat.items.length > 0 && ` · 위험 요인 ${cat.items.filter(i => i.status === "위험" || i.status === "주의").length}개 감지`}
                        </div>
                        {cat.summary && !cat.summary.includes("오류") && (
                          <div style={{ fontSize: 11, color: "#7F1D1D", marginTop: 3, lineHeight: 1.5 }}>
                            {cat.summary.slice(0, 40)}...
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>위험 원인 전체 보기</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 18, textAlign: "center", lineHeight: 1.6 }}>
                      계약 전 이 아파트의 구체적인 위험 요인과<br/>근거 데이터를 확인하세요
                    </div>
                    {isLoggedIn ? (
                      <button onClick={() => { setPaywallTrigger("scenario"); setPaywallOpen(true) }} style={{
                        padding: "10px 28px", borderRadius: 10,
                        background: "#1B4FBB", color: "#fff",
                        fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                      }}>위험요소 전체 확인하기</button>
                    ) : (
                      <Link href="/login" style={{
                        padding: "10px 28px", borderRadius: 10,
                        background: "#16A34A", color: "#fff",
                        fontSize: 14, fontWeight: 700, textDecoration: "none",
                      }}>로그인하기</Link>
                    )}
                  </div>
                </div>
              )}
              {/* Quick category nav */}
              <div style={{ padding: "12px 20px", background: "#F9FAFB", borderTop: "1px solid #E5E7EB", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CATEGORY_ORDER.map((id) => {
                  const m = CATEGORY_META[id]
                  const active = id === activeTab
                  return (
                    <button key={id} onClick={() => setActiveTab(id)} style={{
                      padding: "5px 12px", borderRadius: 9999,
                      background: active ? "#16A34A" : "#F4F6F9",
                      color: active ? "#FFFFFF" : "#6B7280",
                      border: active ? "1px solid #16A34A" : "1px solid #E5E7EB",
                      fontSize: 12, fontWeight: active ? 600 : 400,
                      transition: "all .12s", minHeight: 32,
                    }}>{m.icon} {m.label}</button>
                  )
                })}
              </div>
            </div>
            {/* Right: side panel */}
            <SidePanel data={liveData} canAccess={canAccessDeep()} isLoggedIn={isLoggedIn} onPaywall={() => { setPaywallTrigger("scenario"); setPaywallOpen(true) }} recommendationContext={recommendationContext} aptId={aptId} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: "#111827", padding: "28px 24px", marginTop: 40 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, color: "#16A34A", fontWeight: 700 }}>오를지 AI</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, maxWidth: 600 }}>
              본 서비스의 분석 결과는 AI 기반 참고 정보이며 투자 수익을 보장하지 않습니다. 최종 투자 판단의 책임은 이용자에게 있습니다.
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#4B5563" }}>© 2026 오를지AI · 부동산 분석 플랫폼</span>
        </div>
      </footer>
    </div>
  )
}
