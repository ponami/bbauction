"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { prefetchDashboard as prefetchDashboardUtil } from "@/lib/prefetch"
import MapSearchBar from "./MapSearchBar"
import PriceChart from "./PriceChart"
import LoanCalculator from "./LoanCalculator"
import CompareSheet from "./CompareSheet"
import AuctionPanel from "./AuctionPanel"
import {
  DEFAULT_BUDGET_DELTA,
  budgetBand,
  eokToManwon,
  formatManwonShort,
  isHighRiskSignal,
  recommendReason,
} from "@/lib/auction/budgetFilter"
import PaywallModal from "./PaywallModal"
import RankingPanel from "./RankingPanel"
import ExplainabilityCard from "@/components/explainability/ExplainabilityCard"
import TrustStrip from "@/components/TrustStrip"
import { getAdvisoryVerdict, getThreeAxisReasons } from "@/lib/advisoryCopy"
import { schoolGradeLabel } from "@/lib/schoolGrade"
import { trackAnalyticsEvent } from "@/lib/analytics"
import {
  appendRecommendationParams,
  getBudgetFitCopy,
  getRecommendationCopy,
  getRecommendationReasonLine,
  recommendationLabel,
  type RecommendationContext,
} from "@/lib/recommendationCopy"

declare global {
  interface Window {
    naver: any
  }
}

interface Marker {
  id: number
  lat: number
  lon: number
  apt_nm: string
  sigungu?: string
  umd_nm?: string
  sigungu_cd?: string
  mode: "safe" | "good" | "neutral" | "caution" | "danger" | "presale"
  color: string
  risk_level: string
  risk_score?: number
  price: number | null
  oreulji_score?: number
  final_score?: number
  build_year?: number | null
  is_presale?: boolean
}

interface AptDetail {
  apt_id: number
  apt_nm: string
  sigungu: string
  sigungu_cd?: string
  umd_nm?: string
  mode: string
  oreulji_score: number
  final_score?: number
  risk_score: number
  risk_level: string
  expected_loss: number
  show_rise: boolean
  rise_prob?: number
  short_rank?: { pct: number; regime: string; signal_valid: boolean; algo: string; built_at: string; accuracy?: { h6?: { acc: number; floor: number }; h12?: { acc: number } } } | null
  apt_rank_national?: { national_pct: number; cell_pct: number; top_pct: number; regime: string; algo: string; built_at: string; accuracy?: { h24_up?: { acc: number }; h24_neutral?: { acc: number } } } | null
  regret_prob?: number | null
  downside_regret_prob?: number | null
  opportunity_regret_prob?: number | null
  expected_gain?: number
  price: number | null
  build_year: number | null
  jeonse_risk_score?: number
  jeonse_risk_level?: string
  jeonse_return_pressure?: number
  school_score?: number
  kapt_ho_cnt?: number
  kapt_builder?: string
  kapt_heat?: string
  trade_areas?: number[]
  recent_trades?: {
    ym: string
    pyeong: number
    area_m2: number
    floor: string
    price_man: number
    dealType?: string
  }[]
  market_offer_mid_low?: number
  market_offer_mid_high?: number
  low_floor_offer_low?: number
  low_floor_offer_high?: number
  top_floor_offer_low?: number
  top_floor_offer_high?: number
  offer_note?: string
  horizon_m?: number
  pred_pcts?: Record<string, number | null>  // { "6": 2.1, "12": 3.5, "24": 5.2, ... }
  confidence?: string  // "높음" | "보통" | "낮음"
  confidence_map?: Record<string, string>  // { "6": "높음", "12": "보통", ... }
  peak_info?: {
    peak_price: number
    peak_ym: string
    drawdown_pct: number
    drawdown_label: string
  }
  dispersion_pct?: number
  urgent_sale_signal?: boolean
  sample_count?: number
  // 분양 단지 전용
  is_presale?: boolean
  is_predicted_score?: boolean
  no_trade_data?: boolean
  lat?: number
  lon?: number
  kapt_sale_price?: number
  score_explanation?: string
  presale_score_label?: string
  presale_info?: {
    move_in_status?: string
    move_in_date_raw?: string
    builder?: string
    total_households?: number
    parking?: number
    heating?: string
    hall?: string
    sale_price?: number
  }
  supply_units?: {
    type: string
    area_m2: string
    count: number
    price: number
    price_per_pyeong?: number
  }[]
  price_competitiveness?: {
    sale_price: number
    avg_market_price: number
    premium_market_price?: number
    gap_vs_avg_pct: number
    gap_vs_premium_pct?: number
    level: string
  }
  presale_score_breakdown?: {
    comp_score: number | null
    comp_weight: number
    future_score?: number
    future_weight?: number
    quality_score?: number
    quality_weight?: number
  }
  updatedAt?: string
  lastUpdated?: string
  categories?: any
  turnover?: {
    total_trades_12m: number
    turnover_rate_pct: number | null
    kapt_ho_cnt: number
  } | null
  score_components?: {
    display_score?: number | null
    base_score?: number | null
    final_score?: number | null
    ai_adjustment?: number | null
    signals?: {
      label: string
      value: string | number | null
      kind: string
    }[]
    unit_profile?: {
      label: string
      value: string | number | null
    }[]
    ai_breakdown?: {
      category: string
      label: string
      score: number
      trend?: string
      summary?: string
      updated_at?: string
    }[]
  }
  evidence?: {
    recent_news?: {
      category?: string
      label?: string
      keyword?: string
      title?: string
      link?: string
      pub_date?: string
      collected_at?: string
    }[]
    recent_trades?: {
      ym: string
      pyeong: number
      area_m2: number
      floor: string
      price_man: number
      dealType?: string
    }[]
    jeonse_summary?: {
      level?: string
      score?: number | null
      pressure?: number | null
    }
    school_summary?: {
      school_score?: number | null
      prestige_school_score?: number | null
      special_hs_score?: number | null
      intl_school_score?: number | null
    }
    turnover_summary?: {
      total_trades_12m: number
      turnover_rate_pct: number | null
      kapt_ho_cnt: number
    } | null
  }
  management_fee?: {
    status: "ok" | "unavailable"
    source?: string
    note?: string
    households?: number | null
    basis_months?: string[]
    area_type_summaries?: {
      exclusive_area_m2: number
      households: number
      seasonal?: {
        summer?: {
          unit_price_per_m2?: number
          estimated_monthly_fee?: number
          basis_months?: string[]
          sample_count?: number
        }
        winter?: {
          unit_price_per_m2?: number
          estimated_monthly_fee?: number
          basis_months?: string[]
          sample_count?: number
        }
        normal?: {
          unit_price_per_m2?: number
          estimated_monthly_fee?: number
          basis_months?: string[]
          sample_count?: number
        }
      }
    }[]
    seasonal_summary?: {
      summer?: {
        avg?: number
        common?: number
        individual?: number
        repair_reserve?: number
        basis_months?: string[]
        sample_count?: number
      }
      winter?: {
        avg?: number
        common?: number
        individual?: number
        repair_reserve?: number
        basis_months?: string[]
        sample_count?: number
      }
      normal?: {
        avg?: number
        common?: number
        individual?: number
        repair_reserve?: number
        basis_months?: string[]
        sample_count?: number
      }
    }
    recent_monthly_avg?: number
    recent_monthly_common?: number
    recent_monthly_individual?: number
    recent_monthly_repair_reserve?: number
  }
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

// Build marker to force new asset hashes on deploy
export const __DEPLOY_MARKER = "deploy-2026-05-06-v2"

/** 종합 결론 — 후회 확률 중심 메시지 */
function getVerdict(apt: AptDetail): { emoji: string; label: string; sub: string; color: string; bg: string; border: string } {
  return getAdvisoryVerdict(apt)
}

/** 핵심 이유 최대 3가지 — 후회 확률 중심 */
function getReasons(apt: AptDetail): { axis: string; text: string; positive: boolean }[] {
  return getThreeAxisReasons(apt)
}

/** 최근 거래 추세 방향 */
function calcTrend(apt: AptDetail): { direction: "상승" | "하락" | "보합" | "없음"; pct: string | null } {
  if (!apt.recent_trades || apt.recent_trades.length < 2) {
    return { direction: "없음", pct: null }
  }
  const sorted = [...apt.recent_trades].sort((a, b) => a.ym.localeCompare(b.ym))
  const mid = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, mid)
  const secondHalf = sorted.slice(mid)
  const avg1 = firstHalf.reduce((s, t) => s + t.price_man, 0) / firstHalf.length
  const avg2 = secondHalf.reduce((s, t) => s + t.price_man, 0) / secondHalf.length
  const change = avg1 > 0 ? (avg2 - avg1) / avg1 : 0
  if (change > 0.03) return { direction: "상승", pct: `+${(change * 100).toFixed(1)}%` }
  if (change < -0.03) return { direction: "하락", pct: `${(change * 100).toFixed(1)}%` }
  return { direction: "보합", pct: null }
}

function formatMonthlyFee(value: number): string {
  if (value >= 100000) return `${(value / 10000).toFixed(0)}만원`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만원`
  return `${value.toLocaleString("ko-KR")}원`
}

function formatExclusiveArea(area: number): string {
  return `${Number.isInteger(area) ? area.toFixed(0) : area.toFixed(1)}㎡형`
}

function formatEokDelta(value: number): string {
  const abs = Math.abs(value)
  const prefix = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${prefix}${(abs / 10000).toFixed(1)}억`
}

function formatPctDelta(value: number): string {
  const prefix = value > 0 ? "+" : value < 0 ? "" : "±"
  return `${prefix}${Math.abs(value).toFixed(1)}%`
}

function getSimilarPriceDisplay({
  basePrice,
  similar,
  purpose,
}: {
  basePrice: number | null | undefined
  similar: SimilarApt
  purpose: "실거주" | "투자"
}): {
  primary: { text: string; color: string } | null
  secondary: string | null
} {
  if (purpose === "실거주" && basePrice && similar.latest_price != null) {
    const priceGap = similar.latest_price - basePrice
    return {
      primary: {
        text: priceGap === 0 ? "같은 가격대" : `${formatEokDelta(priceGap)} ${priceGap < 0 ? "저렴" : "비쌈"}`,
        color: priceGap <= 0 ? "#16A34A" : "#DC2626",
      },
      secondary: similar.price_diff_pct != null ? formatPctDelta(similar.price_diff_pct) : null,
    }
  }

  const selectedOpportunity = similar.opportunity_cost_diff_selected
  const selectedPrediction = similar.predicted_change_selected
  return {
    primary: selectedOpportunity != null
      ? {
          text: formatEokDelta(selectedOpportunity),
          color: selectedOpportunity > 0 ? "#16A34A" : "#DC2626",
        }
      : null,
    secondary: selectedPrediction != null ? `~${formatEokDelta(selectedPrediction)}` : null,
  }
}

function getManagementFeeText(apt: AptDetail): string | null {
  const fee = apt.management_fee
  if (!fee) return null
  if (fee.status !== "ok" || fee.recent_monthly_avg == null) {
    return fee.note || "관리비 정보 없음"
  }
  const monthCount = fee.basis_months?.length ?? 0
  const basis = monthCount > 0 ? `최근 ${monthCount}개월 평균` : "최근 평균"
  return `약 ${formatMonthlyFee(fee.recent_monthly_avg)} (${basis} · 세대당)`
}

function getSeasonalManagementFeeDisplay(apt: AptDetail): {
  rows: { label: string; value: string; color?: string }[]
  caption: string | null
} {
  const fee = apt.management_fee
  if (!fee) return { rows: [], caption: null }

  if (fee.status !== "ok") {
    // 내부 오류성 note는 사용자에게 노출하지 않고 섹션 자체를 숨긴다 (2026-07-18)
    return { rows: [], caption: null }
  }

  if (fee.area_type_summaries && fee.area_type_summaries.length > 0) {
    const rows = fee.area_type_summaries
      .slice()
      .sort((a, b) => a.exclusive_area_m2 - b.exclusive_area_m2)
      .map((item) => {
        const seasonal = item.seasonal || {}
        const parts = [
          seasonal.summer?.estimated_monthly_fee != null ? `여름 ${formatMonthlyFee(seasonal.summer.estimated_monthly_fee)}` : null,
          seasonal.winter?.estimated_monthly_fee != null ? `겨울 ${formatMonthlyFee(seasonal.winter.estimated_monthly_fee)}` : null,
          seasonal.normal?.estimated_monthly_fee != null ? `평상시 ${formatMonthlyFee(seasonal.normal.estimated_monthly_fee)}` : null,
        ].filter((part): part is string => Boolean(part))

        return {
          label: `관리비 (${formatExclusiveArea(item.exclusive_area_m2)})`,
          value: parts.join(" · "),
        }
      })
      .filter((item) => item.value.length > 0)

    if (rows.length > 0) {
      return {
        rows,
        caption: fee.note || "최근 1년 공개월 기준 · 전용면적 기준 추정",
      }
    }
  }

  const seasonal = fee.seasonal_summary
  if (seasonal) {
    const rows = [
      { label: "여름 관리비", value: seasonal.summer?.avg },
      { label: "겨울 관리비", value: seasonal.winter?.avg },
      { label: "평상시 관리비", value: seasonal.normal?.avg },
    ]
      .filter((item): item is { label: string; value: number } => item.value != null)
      .map((item) => ({ label: item.label, value: `약 ${formatMonthlyFee(item.value)}` }))

    if (rows.length > 0) {
      return {
        rows,
        caption: fee.note || "최근 1년 공개월 기준 · 세대당",
      }
    }
  }

  const fallback = getManagementFeeText(apt)
  return fallback
    ? { rows: [{ label: "월 평균 관리비", value: fallback }], caption: null }
    : { rows: [], caption: null }
}

/** 체크리스트 — N개 중 M개 통과 */
function getChecklist(apt: AptDetail): { items: { label: string; pass: boolean; na?: boolean; note?: string }[]; pass: number; total: number } {
  const items: { label: string; pass: boolean; na?: boolean; note?: string }[] = []

  // 1. 거래 활성도 — 결측(미로드)은 실패가 아니라 데이터 부족으로 구분
  if (apt.is_presale) {
    items.push({ label: "거래 활성도", pass: true, na: true, note: "분양단지 — 입주 후 평가" })
  } else if (apt.recent_trades == null) {
    items.push({ label: "거래 활성도", pass: false, na: true, note: "데이터 부족" })
  } else if (apt.recent_trades.length >= 3) {
    items.push({ label: "거래 활성도", pass: true })
  } else {
    items.push({ label: "거래 활성도", pass: false })
  }

  // 2. 가격 안정성
  if (apt.risk_level == null) {
    items.push({ label: "가격 안정성", pass: false, na: true, note: "데이터 부족" })
  } else if (apt.risk_level === "낮음") {
    items.push({ label: "가격 안정성", pass: true })
  } else {
    items.push({ label: "가격 안정성", pass: false })
  }

  // 3. 전세 리스크
  if (apt.jeonse_risk_level == null) {
    items.push({ label: "전세 안정성", pass: false, na: true, note: "데이터 부족" })
  } else if (apt.jeonse_risk_level === "낮음") {
    items.push({ label: "전세 안정성", pass: true })
  } else {
    items.push({ label: "전세 안정성", pass: false })
  }

  // 4. AI 전망
  if (apt.short_rank == null && apt.expected_gain == null) {
    items.push({ label: "AI 전망", pass: false, na: true, note: "데이터 부족" })
  } else {
    const hasGoodOutlook = (apt.short_rank?.signal_valid && apt.short_rank?.regime === 'up' && apt.short_rank?.pct <= 30)
      || (apt.expected_gain != null && apt.expected_gain > 0)
    items.push({ label: "AI 전망", pass: hasGoodOutlook })
  }

  // 5. Hot zone specific (Yongin/Suwon/Dongtan): supply and 5km local
  const sgg = (apt.sigungu || "").toLowerCase()
  if (sgg.includes("용인") || sgg.includes("수원") || sgg.includes("화성") || sgg.includes("동탄")) {
    items.push({ label: "핫존 공급/생활권 5km 대안 확인", pass: true })
  }

  const valid = items.filter(i => !i.na)
  return { items, pass: valid.filter(i => i.pass).length, total: valid.length }
}

/** 체크리스트 카드 UI */
function ChecklistCard({ apt }: { apt: AptDetail }) {
  const ck = getChecklist(apt)
  return (
    <div style={{
      background: "#FAFAFA", borderRadius: 10, padding: "12px 14px",
      marginBottom: 12, border: "1px solid #E5E7EB",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>📋 체크리스트</span>
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: ck.pass === ck.total ? "#16A34A" : ck.pass >= ck.total / 2 ? "#D97706" : "#DC2626",
        }}>
          {ck.total === 0 ? "데이터 부족" : `${ck.pass}/${ck.total} 통과`}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ck.items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: item.na ? "#9CA3AF" : item.pass ? "#16A34A" : "#DC2626",
            }}>
              {item.na ? "–" : item.pass ? "✅" : "❌"}
            </span>
            <span style={{ color: item.na ? "#9CA3AF" : "#374151" }}>
              {item.label}
              {item.note ? ` (${item.note})` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** displayScore 기준으로 마커/뱃지 색상 통일 */
function scoreToColor(score: number): string {
  if (score >= 75) return "#2ECC71"  // safe   — 초록
  if (score >= 64) return "#27AE60"  // good   — 진초록
  if (score >= 56) return "#F39C12"  // neutral— 노랑
  if (score >= 50) return "#E67E22"  // caution— 주황
  return "#E74C3C"                   // danger — 빨강
}

function spreadOverlappedMarker(lat: number, lon: number, index: number, total: number): { lat: number; lon: number } {
  if (total <= 1) return { lat, lon }

  // 완전히 같은 좌표의 마커를 육각 링 형태로 펼쳐서 모두 클릭 가능하게 만든다.
  let remain = index
  let ring = 1
  while (remain >= ring * 6) {
    remain -= ring * 6
    ring += 1
  }
  const pointsInRing = ring * 6
  const angle = (2 * Math.PI * remain) / pointsInRing
  const radiusMeters = 12 * ring
  const latOffset = (radiusMeters / 111320) * Math.sin(angle)
  const lonScale = Math.cos((lat * Math.PI) / 180)
  const safeLonScale = Math.abs(lonScale) < 1e-6 ? 1e-6 : lonScale
  const lonOffset = (radiusMeters / (111320 * safeLonScale)) * Math.cos(angle)

  return { lat: lat + latOffset, lon: lon + lonOffset }
}

const MODE_LABEL: Record<string, string> = {
  safe:    "💚 좋음",
  good:    "🟢 양호",
  neutral: "🟡 보합",
  caution: "🟠 주의",
  danger:  "🔴 위험",
}

const MODE_BADGE: Record<string, { bg: string; text: string }> = {
  safe:    { bg: "#DCFCE7", text: "#15803D" },
  good:    { bg: "#D1FAE5", text: "#059669" },
  neutral: { bg: "#FEF9C3", text: "#A16207" },
  caution: { bg: "#FEF3C7", text: "#D97706" },
  danger:  { bg: "#FEE2E2", text: "#DC2626" },
}

interface DistrictInfo {
  display:    string
  sido_nm:    string
  sigungu_nm: string
  label:      string
  color:      string
  avg_score:  number
  total_apts: number
  top_pct:    number
  bottom_pct: number
}

interface OnboardingContext {
  budget?: number       // 만원
  timeline?: "3개월" | "6개월" | "1년" | "미정"
  purpose?: "실거주" | "투자"
}

interface SimilarApt {
  apt_id: number
  apt_nm: string
  sigungu_nm?: string
  umd_nm?: string
  oreulji_score?: number
  display_score?: number
  latest_price?: number | null
  build_year?: number | null
  score_diff?: number
  price_diff_pct?: number | null
  predicted_change_24m?: number | null
  predicted_change_selected?: number | null
  opportunity_cost_diff_24m?: number | null
  opportunity_cost_diff_selected?: number | null
  selected_horizon_m?: number
  distance_km?: number
  region_type?: string
  budget_fit?: "within" | "stretch" | "over" | "unknown"
  personalization_reason?: string
  regret_prob?: number | null
  downside_regret_prob?: number | null
}

interface SimilarAptResponse {
  alternatives?: SimilarApt[]
  purpose_sort?: string
  timeline_sort?: string
  selected_horizon_m?: number
}

export default function NaverMap({
  horizon = 24,
  initialRegion,
  initialAptId,
  onboarding,
  onClearFilter,
  showPresale = false,
  showSubway = false,
  showHospital = false,
  showAcademy = false,
  showSchool = false,
  showAuction = false,
  auctionFilter = "all",
  focusAuctionId,
  auctionBudgetEok = null,
  auctionBudgetDelta = DEFAULT_BUDGET_DELTA,
  auctionHideHighRisk = true,
  auctionShowAllBudget = false,
}: {
  horizon?: number
  initialRegion?: string
  initialAptId?: number
  onboarding?: OnboardingContext
  onClearFilter?: () => void
  showPresale?: boolean
  showSubway?: boolean
  showHospital?: boolean
  showAcademy?: boolean
  showSchool?: boolean
  showAuction?: boolean
  auctionFilter?: "all" | "short-trade" | "rental"
  /** ?focus={id} 로 진입 시 해당 경매물건 자동 오픈 */
  focusAuctionId?: number
  /** 투자 가능 금액 (억). null이면 예산 필터 미적용 */
  auctionBudgetEok?: number | null
  /** ±δ (0.1 = 10%) */
  auctionBudgetDelta?: number
  auctionHideHighRisk?: boolean
  /** true면 예산 밴드 밖 마커도 표시 */
  auctionShowAllBudget?: boolean
}) {
  const mapRef        = useRef<HTMLDivElement>(null)
  const mapObj        = useRef<any>(null)
  const markersRef       = useRef<any[]>([])
  const markerMapRef     = useRef<Map<number, any>>(new Map())
  const markersByLevelRef = useRef<Record<string, any[]>>({ safe: [], good: [], neutral: [], caution: [], danger: [] })
  const subwayMarkersRef = useRef<any[]>([])
  const subwayCirclesRef = useRef<any[]>([])
  const leaderMarkersRef = useRef<any[]>([])
  const listenerRef   = useRef<any[]>([])   // map 이벤트 리스너 추적 (cleanup용)
  const idleDebounceRef = useRef<any>(null)   // idle 중복 호출 디바운스
  const markersAbortRef = useRef<AbortController | null>(null) // 최신 마커 fetch만 처리
  const lastMarkerBoundsRef = useRef<{latMin:number, latMax:number, lonMin:number, lonMax:number} | null>(null)
  const lastMarkerFetchAtRef = useRef<number>(0)
  const lastSimilarIdRef = useRef<number | null>(null)  // similar 중복 로드 방지
  const aptDetailCacheRef = useRef<Map<number, AptDetail>>(new Map()) // 클릭 시 두번째부터 즉시 (메모리 캐시)
  const openingRef = useRef(false)  // 마커 클릭 직후 map click이 closePopup 하는 걸 막기
  const isMounted     = useRef(true)
  const authStateRef  = useRef<"unknown" | "signed_in" | "signed_out">("unknown")
  const onboardingRef = useRef(onboarding)
  useEffect(() => { onboardingRef.current = onboarding }, [onboarding])
  const showPresaleRef = useRef(showPresale)
  showPresaleRef.current = showPresale
  const showSubwayRef = useRef(showSubway)
  showSubwayRef.current = showSubway

  const hospitalMarkersRef = useRef<any[]>([])
  const academyMarkersRef = useRef<any[]>([])
  const schoolMarkersRef = useRef<any[]>([])
  const showHospitalRef = useRef(showHospital)
  showHospitalRef.current = showHospital
  const showAcademyRef = useRef(showAcademy)
  showAcademyRef.current = showAcademy
  const showSchoolRef = useRef(showSchool)
  showSchoolRef.current = showSchool
  const auctionMarkersRef = useRef<any[]>([])
  const showAuctionRef = useRef(showAuction)
  showAuctionRef.current = showAuction

  const LINE_COLORS: Record<string, string> = {
    "1호선": "#0052A4", "2호선": "#00A84D", "3호선": "#EF7C1C",
    "4호선": "#00A5DE", "5호선": "#996CDF", "6호선": "#CD7C2F",
    "7호선": "#68750D", "8호선": "#E51E64", "9호선": "#BDB093",
    "경의중앙선": "#72C7A6", "공항철도": "#01538B",
    "신분당선": "#D4003B", "수인분당선": "#F5A200",
    "경춘선": "#0C8D72", "경강선": "#003DA5",
    "서해선": "#8FC31F", "GTX-A": "#9A6292",
    "인천선": "#7E8DCD", "인천2호선": "#ED8B00",
    "용인에버라인": "#5DBB2F", "의정부경전철": "#F5A200",
    "우이신설선": "#BDB093",
  }
  const [district,   setDistrict]   = useState<DistrictInfo | null>(null)
  const [hudVisible, setHudVisible] = useState(true)
  const [popupApt,     setPopupApt]     = useState<AptDetail | null>(null)
  const [auctionDetail, setAuctionDetail] = useState<any | null>(null)
  const [popupSummary, setPopupSummary] = useState("")
  const [summaryFailed, setSummaryFailed] = useState(false)
  const [popupLoading, setPopupLoading] = useState(false)
  const [favId,        setFavId]        = useState<string | null>(null)
  const [favLoading,   setFavLoading]   = useState(false)
  const [similarApts,  setSimilarApts]  = useState<SimilarApt[]>([])
  const [similarMeta, setSimilarMeta] = useState<{ purpose: string; timeline: string; horizon: number }>({
    purpose: "실거주",
    timeline: "미정",
    horizon: 24,
  })
  const [similarLoaded, setSimilarLoaded] = useState(false)
  const [compareList,  setCompareList]  = useState<AptDetail[]>([])
  const [showCompare,  setShowCompare]  = useState(false)
  const [compareLoadingId, setCompareLoadingId] = useState<number | null>(null)
  const [shareToast,   setShareToast]   = useState(false)
  const [paywallOpen,  setPaywallOpen]  = useState(false)
  const [paywallTrigger, setPaywallTrigger] = useState<"scenario" | "ml-forecast">("ml-forecast")
  const [userPlan,     setUserPlan]     = useState<"free" | "subscription">("free")
  const [purchasedAptIds, setPurchasedAptIds] = useState<number[]>([])
  const [nearestSubways, setNearestSubways] = useState<{station_nm: string; line_nm: string; distance_m: number}[] | null>(null)
  const [aptRankInfo, setAptRankInfo] = useState<{
    price_rank_in_umd: number
    price_total_in_umd: number
    vol_rank_in_umd: number
    vol_total_in_umd: number
    max_price: number
    trade_count: number
  } | null>(null)

  const buildSimilarQuery = useCallback((aptId: number) => {
    // 5km 이내로 제한 — 사용자가 실제 고려하는 생활권 반경
    const params = new URLSearchParams({ limit: "5", radius: "5" })
    appendRecommendationParams(params, onboardingRef.current)
    return `${GATE_URL}/apt/${aptId}/similar?${params.toString()}`
  }, [])

  const buildDashboardUrl = useCallback((aptData: {
    aptId: number
    aptName: string
    address: string
    lawdCd?: string
    gateScore?: number | null
    finalScore?: number | null
    buildYear?: number | null
    isPresale?: boolean
  }) => {
    const params = new URLSearchParams({
      apt: aptData.aptName,
      address: aptData.address,
      lawdCd: aptData.lawdCd || "",
      aptId: String(aptData.aptId),
    })
    if (aptData.gateScore != null) params.set("gateScore", String(aptData.gateScore))
    if (aptData.finalScore != null) params.set("dbFinalScore", String(aptData.finalScore))
    if (aptData.buildYear != null) params.set("buildYear", String(aptData.buildYear))
    if (aptData.isPresale) params.set("is_presale", "1")
    appendRecommendationParams(params, onboardingRef.current)
    return `/dashboard?${params.toString()}`
  }, [])

  const buildShareUrl = useCallback((aptId: number) => {
    const params = new URLSearchParams()
    appendRecommendationParams(params, onboardingRef.current)
    try {
      const raw = localStorage.getItem("agent_profile")
      if (raw) {
        const profile = JSON.parse(raw) as { office?: string; name?: string; phone?: string }
        if (profile.name) params.set("agent", profile.name)
        if (profile.office) params.set("office", profile.office)
        if (profile.phone) params.set("phone", profile.phone)
      }
    } catch {}
    const query = params.toString()
    return `${window.location.origin}/share/${aptId}${query ? `?${query}` : ""}`
  }, [])

  // ── 5단계 레벨 필터 토글 ──────────────────────────────────
  const FILTER_LEVELS = ["safe", "good", "neutral", "caution", "danger"] as const
  const [filterLevels, setFilterLevels] = useState<Record<string, boolean>>({
    safe: true, good: true, neutral: true, caution: true, danger: true,
  })
  const filterLevelsRef = useRef(filterLevels)
  filterLevelsRef.current = filterLevels

  const applyLevelFilter = useCallback(() => {
    const levels = filterLevelsRef.current
    for (const level of FILTER_LEVELS) {
      const visible = levels[level] !== false
      for (const m of markersByLevelRef.current[level]) {
        m.setMap(visible ? mapObj.current : null)
      }
    }
  }, [])
  // filterLevels 변경 시마다 applyLevelFilter 실행
  useEffect(() => { applyLevelFilter() }, [filterLevels, applyLevelFilter])

  // 우측 패널 & 백드롭 공통
  const PANEL_WIDTH = 420

  const closePopup = useCallback(() => {
    setPopupApt(null)
    setPopupSummary("")
    setSummaryFailed(false)
    setFavId(null)
    setSimilarApts([])
    setSimilarLoaded(false)
    setNearestSubways(null)
    setAptRankInfo(null)
    setHudVisible(true)
    lastSimilarIdRef.current = null
    openingRef.current = false
  }, [])

  const buildFallbackCompareDetail = useCallback((similar: SimilarApt): AptDetail => {
    const score = similar.display_score ?? similar.oreulji_score ?? 50
    return {
      apt_id: similar.apt_id,
      apt_nm: similar.apt_nm,
      sigungu: similar.sigungu_nm || "",
      sigungu_cd: popupApt?.sigungu_cd,
      umd_nm: similar.umd_nm,
      mode: "neutral",
      oreulji_score: score,
      final_score: score,
      risk_score: Math.max(0, 100 - score),
      risk_level: score >= 75 ? "낮음" : score >= 56 ? "보통" : "높음",
      expected_loss: 0,
      show_rise: false,
      price: similar.latest_price ?? null,
      build_year: similar.build_year ?? null,
      regret_prob: similar.regret_prob ?? null,
      downside_regret_prob: similar.downside_regret_prob ?? null,
    }
  }, [popupApt?.sigungu_cd])

  const openTopRecommendationCompare = useCallback(async (currentApt: AptDetail, similar: SimilarApt) => {
    setCompareLoadingId(similar.apt_id)
    void trackAnalyticsEvent({
      eventType: "compare_entry",
      funnel: "consumer",
      source: "map-recommendation-compare",
      aptId: currentApt.apt_id,
      aptName: currentApt.apt_nm,
      meta: {
        recommendedApt: similar.apt_nm,
      },
    })
    try {
      const res = await fetch(`${GATE_URL}/apt/${similar.apt_id}?horizon=${horizon}`)
      const recommended = res.ok
        ? await res.json() as AptDetail
        : buildFallbackCompareDetail(similar)
      if (!isMounted.current) return
      setCompareList([currentApt, recommended])
      setShowCompare(true)
    } catch {
      if (!isMounted.current) return
      setCompareList([currentApt, buildFallbackCompareDetail(similar)])
      setShowCompare(true)
    } finally {
      if (isMounted.current) setCompareLoadingId(null)
    }
  }, [buildFallbackCompareDetail, horizon])

  /** 우측 오버레이 패널 + 백드롭 */
  function RightPanel({ children }: { children: React.ReactNode }) {
    return (
      <>
        <div onClick={closePopup} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          zIndex: 1299,
        }} />
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: PANEL_WIDTH, maxWidth: "95vw",
          background: "#fff",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          borderRadius: "16px 0 0 16px",
          zIndex: 1300,
          display: "flex", flexDirection: "column",
          fontFamily: "-apple-system, sans-serif",
          animation: "slideInRight 0.25s ease",
        }}>
          {children}
        </div>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      </>
    )
  }

  // 결제 상태 초기 로드
  useEffect(() => {
    fetch("/api/payments/status")
      .then(r => {
        if (r.status === 401) {
          authStateRef.current = "signed_out"
          return null
        }
        if (!r.ok) return null
        authStateRef.current = "signed_in"
        return r.json()
      })
      .then(d => {
        if (!d) return
        setUserPlan(d.plan ?? "free")
        setPurchasedAptIds((d.purchases ?? []).map((p: { aptId: number }) => p.aptId))
      })
      .catch(() => {})
  }, [])

  // ── 검색 선택 → 지도 이동 + 바텀시트 열기 ───────────────
  const handleSearchSelect = useCallback(async (result: {
    apt_id: number; apt_nm: string; lat: number; lon: number; sigungu_cd: string
  }) => {
    if (!mapObj.current) return
    const center = new window.naver.maps.LatLng(result.lat, result.lon)
    mapObj.current.setCenter(center)
    mapObj.current.setZoom(16)

    openingRef.current = true
    setTimeout(() => { if (isMounted.current) openingRef.current = false }, 200)
    setPopupSummary("")
    setSummaryFailed(false)
    setPopupLoading(true)
    setSimilarApts([])
    setSimilarLoaded(false)

    // 검색에서도 캐시 우선 + secondary 병렬
    const cachedS = aptDetailCacheRef.current.get(result.apt_id)
    let initialDataForSummaryS = null
    if (cachedS) {
      setPopupApt(cachedS)
      setPopupLoading(false)
      initialDataForSummaryS = cachedS
    } else {
      // 검색 결과로 기본 즉시 표시
      // keep loading true -> show loading UI with name + spinner + bullets during main fetch
      const basicS = {
        apt_id: result.apt_id,
        apt_nm: result.apt_nm,
        sigungu: "",
        sigungu_cd: result.sigungu_cd || "",
        umd_nm: "",
        mode: "neutral",
        oreulji_score: 50,
        risk_score: 50,
        risk_level: "보통",
        expected_loss: 0,
        show_rise: false,
        price: null,
        build_year: null,
      }
      setPopupApt(basicS)
      setPopupLoading(false)
      initialDataForSummaryS = basicS
    }

    const similarP = fetch(buildSimilarQuery(result.apt_id)).then(r => r.ok ? r.json() : null).catch(() => null)
    similarP.then((d: SimilarAptResponse | null) => {
      if (!d || !isMounted.current) {
        setSimilarLoaded(true)
        return
      }
      setSimilarMeta({
        purpose: d.purpose_sort || onboardingRef.current?.purpose || "실거주",
        timeline: d.timeline_sort || onboardingRef.current?.timeline || "미정",
        horizon: d.selected_horizon_m || 24,
      })
      if (d.alternatives?.length) setSimilarApts(d.alternatives)
      setSimilarLoaded(true)
    }).catch(() => { setSimilarLoaded(true) })

    const rankP = fetch(`${GATE_URL}/rankings/${result.apt_id}`).then(r => r.ok ? r.json() : null).catch(() => null)

    const mainP = fetch(`${GATE_URL}/apt/${result.apt_id}?horizon=${horizon}`).then(r => r.ok ? r.json() : null).catch(() => null)
    mainP.then(apt => {
      if (!apt || !isMounted.current) return
      prefetchDashboardUtil(
        [apt.sigungu, apt.umd_nm].filter(Boolean).join(" "),
        apt.apt_nm,
        apt.sigungu_cd || "",
      )
      setPopupApt(apt)
      setPopupLoading(false)
      aptDetailCacheRef.current.set(apt.apt_id, apt)
    })

    // attach rank early
    rankP.then(d => { if (d && isMounted.current) setAptRankInfo(d) }).catch(() => {})

    // start summary early with initial data (don't wait for mainP)
    const summaryTimeout = setTimeout(() => setSummaryFailed(true), 8000)
    const summaryBodyS = initialDataForSummaryS || { apt_id: result.apt_id, apt_nm: result.apt_nm }
    fetch("/api/apt-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summaryBodyS),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        clearTimeout(summaryTimeout)
        if (json?.summary) setPopupSummary(json.summary)
        else setSummaryFailed(true)
      })
      .catch(() => { clearTimeout(summaryTimeout); setSummaryFailed(true) })
  }, [buildSimilarQuery, horizon])

  // ── popupApt 변경 시 인근 지하철역 조회 ──────────────────────
  useEffect(() => {
    if (!popupApt?.lat || !popupApt?.lon) { setNearestSubways(null); return }
    const gateUrl = process.env.NEXT_PUBLIC_GATE_URL || "/gate"
    fetch(`${gateUrl}/map/nearest-subway?lat=${popupApt.lat}&lon=${popupApt.lon}&limit=2`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.stations?.length) setNearestSubways(d.stations)
        else setNearestSubways(null)
      })
      .catch(() => setNearestSubways(null))
  }, [popupApt])

  // ── 비슷한 매물 강제 로드 (모든 팝업Apt 설정 경로에서 확실히 로드되도록) ──
  // similarLoaded를 deps에 넣지 말고, apt id 기준으로만 트리거 (이전 버그로 비슷한아파트 안나오는 원인)
  useEffect(() => {
    const id = popupApt?.apt_id
    if (!id) return
    if (lastSimilarIdRef.current === id) return
    lastSimilarIdRef.current = id
    setSimilarApts([])
    setSimilarLoaded(false)
    fetch(buildSimilarQuery(id))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!isMounted.current) return
        if (!d) {
          setSimilarLoaded(true)
          return
        }
        setSimilarMeta({
          purpose: d.purpose_sort || onboardingRef.current?.purpose || "실거주",
          timeline: d.timeline_sort || onboardingRef.current?.timeline || "미정",
          horizon: d.selected_horizon_m || 24,
        })
        if (d.alternatives?.length) setSimilarApts(d.alternatives)
        setSimilarLoaded(true)
      })
      .catch(() => { if (isMounted.current) setSimilarLoaded(true) })
  }, [popupApt, buildSimilarQuery])

  // ── 즐겨찾기 상태 확인 ──────────────────────────────────
  useEffect(() => {
    if (!popupApt) return
    setFavId(null)
    if (authStateRef.current === "signed_out") return
    fetch("/api/favorites")
      .then(r => {
        if (r.status === 401) {
          authStateRef.current = "signed_out"
          return null
        }
        if (!r.ok) return null
        authStateRef.current = "signed_in"
        return r.json()
      })
      .then(json => {
        if (!json?.data) return
        const found = json.data.find((f: { aptName: string; lawdCd?: string; address?: string; id: string }) =>
          f.aptName === popupApt.apt_nm &&
          (f.lawdCd ? f.lawdCd === (popupApt.sigungu_cd ?? "") : true) &&
          (popupApt.umd_nm ? (f.address || "").includes(popupApt.umd_nm) : true)
        )
        setFavId(found?.id ?? null)
      })
      .catch(() => {})
  }, [popupApt])

  async function toggleFav() {
    if (!popupApt || favLoading) return
    if (authStateRef.current === "signed_out") {
      alert("로그인 후 이용 가능합니다")
      return
    }
    setFavLoading(true)
    try {
      if (favId) {
        await fetch(`/api/favorites?id=${favId}`, { method: "DELETE" })
        setFavId(null)
      } else {
        const address = [popupApt.sigungu, popupApt.umd_nm].filter(Boolean).join(" ")
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aptName: popupApt.apt_nm,
            address,
            lawdCd: popupApt.sigungu_cd ?? "",
            dealTypes: ["매매"],
            areaFilter: [],
          }),
        })
        if (res.status === 401) {
          alert("로그인 후 이용 가능합니다")
          return
        }
        if (res.status === 403) {
          alert("즐겨찾기는 최대 7개까지 저장 가능합니다. 유료구독 시 무제한 이용 가능합니다.")
          return
        }
        const json = await res.json()
        if (json?.data?.id) setFavId(json.data.id)
      }
    } finally {
      setFavLoading(false)
    }
  }

  // ── 마커 전부 제거 ───────────────────────────────────────
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => {
      window.naver.maps.Event.clearListeners(m, 'click')
      m.setMap(null)
    })
    markersRef.current = []
    markerMapRef.current.clear()
    // 레벨별 마커 분류도 함께 초기화
    for (const level of Object.keys(markersByLevelRef.current)) {
      markersByLevelRef.current[level] = []
    }
  }, [])

  // ── 게이트 API → 마커 렌더링 ────────────────────────────
  const loadMarkers = useCallback(async (forceRefresh = false) => {
    if (!mapObj.current) { console.log("[markers] mapObj 없음"); return }
    const bounds = mapObj.current.getBounds()
    if (!bounds) { console.log("[markers] bounds 없음"); return }
    const sw = bounds.getSW()
    const ne = bounds.getNE()
    if (!sw || !ne) { console.log("[markers] sw/ne 없음"); return }

    const latMin = sw.lat(), latMax = ne.lat()
    const lonMin = sw.lng(), lonMax = ne.lng()
    console.log("[markers] bounds:", { latMin, latMax, lonMin, lonMax })

    if (!isFinite(latMin) || !isFinite(latMax) || !isFinite(lonMin) || !isFinite(lonMax)) {
      console.log("[markers] NaN 좌표 → 스킵"); return
    }
    if (latMin < -90 || latMax > 90 || lonMin < -180 || lonMax > 180) {
      console.log("[markers] 범위 오류 → 스킵"); return
    }

    // skip if bounds almost same as last (reduce redundant fetches on small moves)
    if (!forceRefresh && lastMarkerBoundsRef.current) {
      const last = lastMarkerBoundsRef.current
      const eps = 0.005
      if (Math.abs(latMin - last.latMin) < eps &&
          Math.abs(latMax - last.latMax) < eps &&
          Math.abs(lonMin - last.lonMin) < eps &&
          Math.abs(lonMax - last.lonMax) < eps &&
          Date.now() - lastMarkerFetchAtRef.current < 60_000) {
        return
      }
    }
    lastMarkerBoundsRef.current = {latMin, latMax, lonMin, lonMax}

    const url = `${GATE_URL}/map/markers?lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}&horizon=${horizon}&limit=500&show_presale=${showPresaleRef.current}`
    console.log("[markers] fetch:", url)

    // 이전 fetch 중단 (최신 bounds만 처리)
    if (markersAbortRef.current) {
      markersAbortRef.current.abort()
    }
    const controller = new AbortController()
    markersAbortRef.current = controller

    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" })
      console.log("[markers] 응답 status:", res.status)
      if (!res.ok) return
      const data = await res.json()
      console.log("[markers] 마커 수:", data.markers?.length)
      lastMarkerFetchAtRef.current = Date.now()

      clearMarkers()

      const markerList: Marker[] = data.markers || []
      const overlapCountByCoord = new Map<string, number>()
      markerList.forEach((m) => {
        const key = `${m.lat.toFixed(7)}:${m.lon.toFixed(7)}`
        overlapCountByCoord.set(key, (overlapCountByCoord.get(key) ?? 0) + 1)
      })
      const overlapIndexByCoord = new Map<string, number>()

      // 대장 마커는 서버 /rankings/leaders 에서 별도 로딩 (아래 loadLeaders)
      markerList.forEach((m: Marker) => {
        const overBudget = !!(onboardingRef.current?.budget && m.price && m.price > onboardingRef.current.budget * 1.05)
        const markerOpacity = overBudget ? 0.35 : 1

        // 분양예정 마커는 고정 보라색
        const isPresaleMarker = m.is_presale
        const markerScore = m.final_score ?? m.oreulji_score ?? 50
        const markerColor = isPresaleMarker ? "#8B5CF6" : scoreToColor(markerScore)
        const coordKey = `${m.lat.toFixed(7)}:${m.lon.toFixed(7)}`
        const offsetIndex = overlapIndexByCoord.get(coordKey) ?? 0
        overlapIndexByCoord.set(coordKey, offsetIndex + 1)
        const displayPosition = spreadOverlappedMarker(
          m.lat,
          m.lon,
          offsetIndex,
          overlapCountByCoord.get(coordKey) ?? 1,
        )

        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(displayPosition.lat, displayPosition.lon),
          map: mapObj.current,
          zIndex: isPresaleMarker ? 2 : 1,
          icon: {
            content: `
              <div style="
                width:${isPresaleMarker ? 16 : 14}px; height:${isPresaleMarker ? 16 : 14}px;
                background:${markerColor};
                border:${isPresaleMarker ? "2.5px solid #C4B5FD" : "2px solid white"};
                border-radius:50%;
                box-shadow:0 1px 4px rgba(0,0,0,0.35);
                cursor:pointer;
                opacity:${markerOpacity};
              "></div>`,
            anchor: new window.naver.maps.Point(isPresaleMarker ? 8 : 7, isPresaleMarker ? 8 : 7),
          },
        })

        window.naver.maps.Event.addListener(marker, "click", async () => {
          if (!isMounted.current) return
          openingRef.current = true
          setTimeout(() => { if (isMounted.current) openingRef.current = false }, 200)
          setPopupSummary("")
          setSummaryFailed(false)
          setPopupLoading(true)
          setSimilarApts([])
          setSimilarLoaded(false)
          setAptRankInfo(null)
          setAptRankInfo(null)

          // 캐시 히트면 즉시 전체 보여줌 (두번째 클릭/로드가 빠른 이유). 항상 최신화는 시도.
          const cached = aptDetailCacheRef.current.get(m.id)
          let initialDataForSummary = null
          if (cached) {
            setPopupApt(cached)
            setPopupLoading(false)
            initialDataForSummary = cached
          } else {
            // 즉시 기본 패널 표시 (이름 등) 로 느린 fetch 동안에도 보이게
            const basic = {
              apt_id: m.id,
              apt_nm: m.apt_nm,
              sigungu: m.sigungu || "",
              sigungu_cd: m.sigungu_cd || "",
              umd_nm: m.umd_nm || "",
              mode: m.mode || "neutral",
              oreulji_score: m.oreulji_score || 50,
              risk_score: m.risk_score || 50,
              risk_level: m.risk_level || "보통",
              expected_loss: 0,
              show_rise: false,
              price: m.price || null,
              build_year: m.build_year || null,
            }
            setPopupApt(basic)
            setPopupLoading(false)
            initialDataForSummary = basic
          }

          // 병렬 시작: 메인 apt와 함께 secondary(비슷한/순위/지하철) 네트워크를 최대한 일찍 시작
          // 핸들러를 바로 attach 해서 similar가 main 기다리지 않고 채워지게
          const similarP = fetch(buildSimilarQuery(m.id)).then(r => r.ok ? r.json() : null).catch(() => null)
          similarP.then((d: SimilarAptResponse | null) => {
            if (!d || !isMounted.current) {
              setSimilarLoaded(true)
              return
            }
            setSimilarMeta({
              purpose: d.purpose_sort || onboardingRef.current?.purpose || "실거주",
              timeline: d.timeline_sort || onboardingRef.current?.timeline || "미정",
              horizon: d.selected_horizon_m || 24,
            })
            if (d.alternatives?.length) setSimilarApts(d.alternatives)
            setSimilarLoaded(true)
          }).catch(() => { if (isMounted.current) setSimilarLoaded(true) })

          const rankP = fetch(`${GATE_URL}/rankings/${m.id}`).then(r => r.ok ? r.json() : null).catch(() => null)
          const subwayP = (m.lat && m.lon ? fetch(`${GATE_URL}/map/nearest-subway?lat=${m.lat}&lon=${m.lon}&limit=2`).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null))

          // 메인 상세는 non-blocking으로 (기본 패널 즉시, 데이터 오면 enrich)
          const mainP = fetch(`${GATE_URL}/apt/${m.id}?horizon=${horizon}`).then(r => r.ok ? r.json() : null).catch(() => null)
          mainP.then(apt => {
            if (!apt || !isMounted.current) return
            prefetchDashboardUtil([apt.sigungu, apt.umd_nm].filter(Boolean).join(" "), apt.apt_nm, apt.sigungu_cd || "")
            setPopupApt(apt)
            // no need to setLoading false here, already done early for fast panel
            aptDetailCacheRef.current.set(apt.apt_id, apt)
            // 마커 색상 업데이트
            const freshScore = apt.final_score ?? apt.oreulji_score ?? 50
            const markerToSync = markerMapRef.current.get(m.id)
            if (markerToSync && !apt.is_presale) {
              markerToSync.setIcon({
                content: `<div style="width:14px;height:14px;background:${scoreToColor(freshScore)};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;"></div>`,
                anchor: new window.naver.maps.Point(7, 7),
              })
            }
          })

          // pre-started 결과 attach (이미 위에서 similarP에 attach 함)
          rankP.then(d => { if (d && isMounted.current) setAptRankInfo(d) }).catch(() => {})
          subwayP.then(d => { if (d && isMounted.current) setNearestSubways(d) }).catch(() => {})

          // Gemini 요약 — basic 데이터로도 시작 가능 (mainP 기다리지 않음)
          const summaryTimeout = setTimeout(() => { if (isMounted.current) setSummaryFailed(true) }, 8000)
          const summaryBody = initialDataForSummary || { apt_id: m.id, apt_nm: m.apt_nm }
          fetch("/api/apt-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(summaryBody),
          })
            .then(r => r.ok ? r.json() : null)
            .then(json => {
              clearTimeout(summaryTimeout)
              if (json?.summary && isMounted.current) setPopupSummary(json.summary)
              else if (isMounted.current) setSummaryFailed(true)
            })
            .catch(() => { if (isMounted.current) { clearTimeout(summaryTimeout); setSummaryFailed(true) } })
        })

        markersRef.current.push(marker)
        markerMapRef.current.set(m.id, marker)
        // 레벨별 마커 분류 (presale 제외)
        if (!isPresaleMarker && m.mode in markersByLevelRef.current) {
          markersByLevelRef.current[m.mode].push(marker)
        }
      })

      // prefetch top 5 highest score markers in current view for faster future clicks (background)
      try {
        const topForPrefetch = (data.markers || [])
          .filter((m: any) => m.oreulji_score != null)
          .sort((a: any, b: any) => (b.oreulji_score || 0) - (a.oreulji_score || 0))
          .slice(0, 5)
        topForPrefetch.forEach((m: any) => {
          const id = m.id
          if (!aptDetailCacheRef.current.has(id)) {
            fetch(`${GATE_URL}/apt/${id}?horizon=${horizon}`)
              .then(r => r.ok ? r.json() : null)
              .then(apt => {
                if (apt && isMounted.current) {
                  aptDetailCacheRef.current.set(id, apt)
                }
              })
              .catch(() => {})
          }
        })
      } catch (e) {
        // ignore prefetch errors
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error("마커 로딩 실패:", err)
    }
  }, [buildSimilarQuery, horizon, clearMarkers])

  // ── 지하철 마커 + 반경 원 ─────────────────────────────────────
  const clearSubwayCircles = useCallback(() => {
    subwayCirclesRef.current.forEach(c => { c.setMap(null) })
    subwayCirclesRef.current = []
  }, [])

  const clearLeaders = useCallback(() => {
    leaderMarkersRef.current.forEach(m => {
      window.naver.maps.Event.clearListeners(m, 'click')
      m.setMap(null)
    })
    leaderMarkersRef.current = []
  }, [])

  const clearSubwayMarkers = useCallback(() => {
    clearSubwayCircles()
    subwayMarkersRef.current.forEach(m => {
      window.naver.maps.Event.clearListeners(m, 'click')
      m.setMap(null)
    })
    subwayMarkersRef.current = []
  }, [clearSubwayCircles])

  const clearHospitalMarkers = useCallback(() => {
    hospitalMarkersRef.current.forEach(m => {
      window.naver.maps.Event.clearListeners(m, 'click')
      m.setMap(null)
    })
    hospitalMarkersRef.current = []
  }, [])

  const clearAcademyMarkers = useCallback(() => {
    academyMarkersRef.current.forEach(m => {
      window.naver.maps.Event.clearListeners(m, 'click')
      m.setMap(null)
    })
    academyMarkersRef.current = []
  }, [])

  const clearSchoolMarkers = useCallback(() => {
    schoolMarkersRef.current.forEach(m => {
      window.naver.maps.Event.clearListeners(m, 'click')
      m.setMap(null)
    })
    schoolMarkersRef.current = []
  }, [])

  const loadHospitalMarkers = useCallback(async () => {
    if (!mapObj.current) return
    const bounds = mapObj.current.getBounds()
    if (!bounds) return
    const sw = bounds.getSW(), ne = bounds.getNE()
    const latMin = sw.lat(), latMax = ne.lat(), lonMin = sw.lng(), lonMax = ne.lng()
    if (!isFinite(latMin) || !isFinite(latMax) || !isFinite(lonMin) || !isFinite(lonMax)) return

    try {
      const res = await fetch(
        `/api/map-infra?type=hospital&lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}`
      )
      if (!res.ok) return
      const data = await res.json()
      console.log(`[infra] 병원 ${data.places?.length ?? 0}곳`)
      if (!data.places?.length) return

      clearHospitalMarkers()

      const zoom = mapObj.current.getZoom()
      const showLabel = zoom >= 14

      data.places.forEach((p: any) => {
        const pos = new window.naver.maps.LatLng(p.lat, p.lon)
        const label = showLabel
          ? `<div style="
              position:absolute;top:10px;left:50%;transform:translateX(-50%);
              pointer-events:none;
            ">
              <div style="
                background:rgba(255,255,255,0.92);border-radius:4px;
                padding:1px 5px;font-size:10px;font-weight:600;
                white-space:nowrap;color:#1F2937;
                border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.1);
              ">${p.place_name}</div>
            </div>`
          : ""

        const marker = new window.naver.maps.Marker({
          position: pos,
          map: mapObj.current,
          zIndex: 4,
          icon: {
            content: `
              <div style="position:relative;width:24px;height:24px;">
                <div style="
                  width:16px;height:16px;
                  background:#F43F5E;
                  border:2px solid white;
                  border-radius:50%;
                  box-shadow:0 1px 4px rgba(0,0,0,0.3);
                  position:absolute;top:50%;left:50%;
                  transform:translate(-50%,-50%);
                  display:flex;align-items:center;justify-content:center;
                  font-size:9px;color:white;
                ">🏥</div>
                ${label}
              </div>
            `,
            anchor: new window.naver.maps.Point(12, 12),
          },
        })
        hospitalMarkersRef.current.push(marker)
      })
    } catch (err) {
      console.error("병원 마커 로딩 실패:", err)
    }
  }, [clearHospitalMarkers])

  const loadAcademyMarkers = useCallback(async () => {
    if (!mapObj.current) return
    const bounds = mapObj.current.getBounds()
    if (!bounds) return
    const sw = bounds.getSW(), ne = bounds.getNE()
    const latMin = sw.lat(), latMax = ne.lat(), lonMin = sw.lng(), lonMax = ne.lng()
    if (!isFinite(latMin) || !isFinite(latMax) || !isFinite(lonMin) || !isFinite(lonMax)) return

    try {
      const res = await fetch(
        `/api/map-infra?type=academy&lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}`
      )
      if (!res.ok) return
      const data = await res.json()
      console.log(`[infra] 학원 ${data.places?.length ?? 0}곳`)
      if (!data.places?.length) return

      clearAcademyMarkers()

      const zoom = mapObj.current.getZoom()
      const showLabel = zoom >= 14

      data.places.forEach((p: any) => {
        const pos = new window.naver.maps.LatLng(p.lat, p.lon)
        const label = showLabel
          ? `<div style="
              position:absolute;top:10px;left:50%;transform:translateX(-50%);
              pointer-events:none;
            ">
              <div style="
                background:rgba(255,255,255,0.92);border-radius:4px;
                padding:1px 5px;font-size:10px;font-weight:600;
                white-space:nowrap;color:#1F2937;
                border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.1);
              ">${p.place_name}</div>
            </div>`
          : ""

        const marker = new window.naver.maps.Marker({
          position: pos,
          map: mapObj.current,
          zIndex: 4,
          icon: {
            content: `
              <div style="position:relative;width:24px;height:24px;">
                <div style="
                  width:16px;height:16px;
                  background:#8B5CF6;
                  border:2px solid white;
                  border-radius:50%;
                  box-shadow:0 1px 4px rgba(0,0,0,0.3);
                  position:absolute;top:50%;left:50%;
                  transform:translate(-50%,-50%);
                  display:flex;align-items:center;justify-content:center;
                  font-size:9px;color:white;
                ">🎓</div>
                ${label}
              </div>
            `,
            anchor: new window.naver.maps.Point(12, 12),
          },
        })
        academyMarkersRef.current.push(marker)
      })
    } catch (err) {
      console.error("학원 마커 로딩 실패:", err)
    }
  }, [clearAcademyMarkers])

  const loadSchoolMarkers = useCallback(async () => {
    if (!mapObj.current) return
    const bounds = mapObj.current.getBounds()
    if (!bounds) return
    const sw = bounds.getSW(), ne = bounds.getNE()
    const latMin = sw.lat(), latMax = ne.lat(), lonMin = sw.lng(), lonMax = ne.lng()
    if (!isFinite(latMin) || !isFinite(latMax) || !isFinite(lonMin) || !isFinite(lonMax)) return

    try {
      const res = await fetch(
        `/api/map-infra?type=school&lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}`
      )
      if (!res.ok) return
      const data = await res.json()
      console.log(`[infra] 학교 ${data.places?.length ?? 0}곳`)
      if (!data.places?.length) return

      clearSchoolMarkers()

      const zoom = mapObj.current.getZoom()
      const showLabel = zoom >= 14

      data.places.forEach((p: any) => {
        const pos = new window.naver.maps.LatLng(p.lat, p.lon)
        const label = showLabel
          ? `<div style="
              position:absolute;top:10px;left:50%;transform:translateX(-50%);
              pointer-events:none;
            ">
              <div style="
                background:rgba(255,255,255,0.92);border-radius:4px;
                padding:1px 5px;font-size:10px;font-weight:600;
                white-space:nowrap;color:#1F2937;
                border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.1);
              ">${p.place_name}</div>
            </div>`
          : ""

        const marker = new window.naver.maps.Marker({
          position: pos,
          map: mapObj.current,
          zIndex: 4,
          icon: {
            content: `
              <div style="position:relative;width:24px;height:24px;">
                <div style="
                  width:16px;height:16px;
                  background:#2563EB;
                  border:2px solid white;
                  border-radius:50%;
                  box-shadow:0 1px 4px rgba(0,0,0,0.3);
                  position:absolute;top:50%;left:50%;
                  transform:translate(-50%,-50%);
                  display:flex;align-items:center;justify-content:center;
                  font-size:9px;color:white;
                ">🏫</div>
                ${label}
              </div>
            `,
            anchor: new window.naver.maps.Point(12, 12),
          },
        })
        schoolMarkersRef.current.push(marker)
      })
    } catch (err) {
      console.error("학교 마커 로딩 실패:", err)
    }
  }, [clearSchoolMarkers])

  const clearAuctionMarkers = useCallback(() => {
    auctionMarkersRef.current.forEach(m => {
      window.naver.maps.Event.clearListeners(m, 'click')
      m.setMap(null)
    })
    auctionMarkersRef.current = []
  }, [])

  const openAuctionDetail = useCallback(async (auctionId: number) => {
    try {
      const res = await fetch(`${GATE_URL}/auction/${auctionId}`)
      if (!res.ok) return
      const detail = await res.json()
      if (isMounted.current) { setPopupApt(null); setAuctionDetail(detail) }
    } catch (err) {
      console.error("경매 상세 로딩 실패:", err)
    }
  }, [])

  const loadAuctionMarkers = useCallback(async () => {
    if (!mapObj.current) return
    const bounds = mapObj.current.getBounds()
    if (!bounds) return
    const sw = bounds.getSW(), ne = bounds.getNE()
    const latMin = sw.lat(), latMax = ne.lat(), lonMin = sw.lng(), lonMax = ne.lng()
    if (!isFinite(latMin) || !isFinite(latMax) || !isFinite(lonMin) || !isFinite(lonMax)) return

    try {
      const baseUrl = auctionFilter === "all"
        ? `${GATE_URL}/auction/list`
        : `${GATE_URL}/auction/filter/${auctionFilter}`
      const res = await fetch(
        `${baseUrl}?lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}&limit=500`
      )
      if (!res.ok) return
      const data = await res.json()
      const rawItems: any[] = Array.isArray(data) ? data : (data.items || [])
      clearAuctionMarkers()
      if (!rawItems.length) return

      const budgetManwon =
        auctionBudgetEok != null && auctionBudgetEok > 0
          ? eokToManwon(auctionBudgetEok)
          : null
      const delta = auctionBudgetDelta ?? DEFAULT_BUDGET_DELTA

      let items = rawItems
      if (auctionHideHighRisk) {
        items = items.filter(
          (it) => !isHighRiskSignal(it.signal_level, it.signal),
        )
      }
      if (budgetManwon && !auctionShowAllBudget) {
        items = items.filter((it) =>
          budgetBand(it.min_bid_price, budgetManwon, delta).inBand,
        )
      }

      console.log(
        `[infra] 경매 마커 ${items.length}/${rawItems.length}건` +
          (budgetManwon ? ` · 예산 ${formatManwonShort(budgetManwon)} ±${Math.round(delta * 100)}%` : ""),
      )

      const zoom = mapObj.current.getZoom()
      const showLabel = zoom >= 14

      const eokFmt = (m: number | null) =>
        m == null ? "-" : m >= 10000 ? `${(m / 10000).toFixed(1)}억` : `${Number(m).toLocaleString()}만`
      // beginner_grade: 초급/중급/고급 (+ emoji 🟢🟡🔴)
      const signalColor = (it: any) => {
        if (auctionFilter === "rental") return "#1D4ED8"
        const lv = it.signal_level || ""
        const em = it.signal || ""
        if (lv === "고급" || em === "🔴" || lv === "위험") return "#DC2626"
        if (lv === "초급" || em === "🟢" || lv === "저렴") return "#16A34A"
        if (lv === "중급" || em === "🟡" || lv === "비쌈") return "#F59E0B"
        return "#9CA3AF"
      }

      items.forEach((it: any) => {
        if (it.lat == null || it.lon == null) return
        const pos = new window.naver.maps.LatLng(it.lat, it.lon)
        const rnd = it.round ? `${it.round}차` : ""
        const band = budgetBand(it.min_bid_price, budgetManwon, delta)
        const budgetBadge =
          band.tag === "over" && band.overPct != null
            ? `<span style="color:#FDE68A"> 예산+${band.overPct.toFixed(0)}%</span>`
            : band.tag === "over" && auctionShowAllBudget
              ? `<span style="color:#FCA5A5"> 예산밖</span>`
              : ""
        const disc =
          it.discount_pct != null && it.discount_pct > 0
            ? `<span style="color:#FDE047"> ${it.price_ref_label || "할인"} -${Math.abs(it.discount_pct)}%</span>`
            : ""
        const why = recommendReason(it, budgetManwon, delta)
        const whyShort = why.length > 22 ? why.slice(0, 21) + "…" : why
        const label = showLabel
          ? `<div style="position:absolute;top:24px;left:50%;transform:translateX(-50%);pointer-events:none;">
              <div style="background:rgba(17,24,39,0.92);border-radius:5px;padding:2px 6px;font-size:10px;
                font-weight:700;white-space:nowrap;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);">
                ${rnd} · 시작 ${eokFmt(it.min_bid_price)}${disc}${budgetBadge}
              </div>
              <div style="margin-top:2px;background:rgba(55,65,81,0.9);border-radius:4px;padding:1px 5px;font-size:9px;
                font-weight:500;white-space:nowrap;color:#E5E7EB;text-align:center;max-width:160px;overflow:hidden;text-overflow:ellipsis;">
                ${whyShort.replace(/</g, "")}
              </div></div>`
          : ""
        const markerColor = signalColor(it)
        const emoji = it.signal || "⚖️"
        const marker = new window.naver.maps.Marker({
          position: pos,
          map: mapObj.current,
          zIndex: 6,
          icon: {
            content: `<div style="position:relative;width:26px;height:26px;">
                <div style="width:22px;height:22px;background:${markerColor};border:2px solid white;border-radius:50%;
                  box-shadow:0 1px 5px rgba(0,0,0,0.35);position:absolute;top:50%;left:50%;
                  transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;
                  font-size:9px;font-weight:800;color:#fff;">${it.round ?? emoji}</div>${label}</div>`,
            anchor: new window.naver.maps.Point(13, 13),
          },
        })
        window.naver.maps.Event.addListener(marker, "click", () => openAuctionDetail(it.id))
        auctionMarkersRef.current.push(marker)
      })
    } catch (err) {
      console.error("경매 마커 로딩 실패:", err)
    }
  }, [
    clearAuctionMarkers,
    openAuctionDetail,
    auctionFilter,
    auctionBudgetEok,
    auctionBudgetDelta,
    auctionHideHighRisk,
    auctionShowAllBudget,
  ])

  const loadSubwayMarkers = useCallback(async () => {
    if (!mapObj.current) return
    const bounds = mapObj.current.getBounds()
    if (!bounds) return
    const sw = bounds.getSW(), ne = bounds.getNE()
    const latMin = sw.lat(), latMax = ne.lat(), lonMin = sw.lng(), lonMax = ne.lng()
    if (!isFinite(latMin) || !isFinite(latMax) || !isFinite(lonMin) || !isFinite(lonMax)) return

    try {
      const res = await fetch(
        `${GATE_URL}/map/subways?lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}`
      )
      if (!res.ok) return
      const data = await res.json()
      if (!data.stations?.length) return

      clearSubwayMarkers()

      const zoom = mapObj.current.getZoom()
      const showLabel = zoom >= 14

      data.stations.forEach((s: any) => {
        const lineColor = LINE_COLORS[s.line_nm] || "#6B7280"
        const pos = new window.naver.maps.LatLng(s.lat, s.lon)
        const walkLabel = "도보 10분"
        const label = showLabel
          ? `<div style="
              position:absolute;top:10px;left:50%;transform:translateX(-50%);
              display:flex;flex-direction:column;align-items:center;gap:1px;
              pointer-events:none;
            ">
              <div style="
                background:rgba(255,255,255,0.92);border-radius:4px;
                padding:1px 5px;font-size:10px;font-weight:600;
                white-space:nowrap;color:#1F2937;
                border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.1);
              ">${s.station_nm}</div>
              <div style="
                background:rgba(59,130,246,0.12);border-radius:3px;
                padding:0 4px;font-size:8px;font-weight:500;
                white-space:nowrap;color:#3B82F6;
              ">${walkLabel}</div>
            </div>
          `
          : ""

        const marker = new window.naver.maps.Marker({
          position: pos,
          map: mapObj.current,
          zIndex: 5,
          icon: {
            content: `
              <div style="position:relative;width:24px;height:24px;">
                <div style="
                  width:12px;height:12px;
                  background:${lineColor};
                  border:2px solid white;
                  border-radius:50%;
                  box-shadow:0 1px 4px rgba(0,0,0,0.3);
                  position:absolute;top:50%;left:50%;
                  transform:translate(-50%,-50%);
                "></div>
                ${label}
              </div>
            `,
            anchor: new window.naver.maps.Point(12, 12),
          },
        })
        subwayMarkersRef.current.push(marker)

        // 800m 반경 원 (도보 10분)
        if (showLabel) {
          const circle = new window.naver.maps.Circle({
            map: mapObj.current,
            center: pos,
            radius: 800,
            strokeColor: "#3B82F6",
            strokeWeight: 1.5,
            strokeOpacity: 0.4,
            fillColor: "#3B82F6",
            fillOpacity: 0.06,
          })
          subwayCirclesRef.current.push(circle)
        }
      })
    } catch (err) {
      console.error("지하철 마커 로딩 실패:", err)
    }
  }, [])


  // ── 대장 마커 (실거래가 대장 + 거래량 대장) ─────────────────────
  const loadLeaders = useCallback(async () => {
    if (!mapObj.current) return
    const bounds = mapObj.current.getBounds()
    if (!bounds) return
    const sw = bounds.getSW(), ne = bounds.getNE()
    const latMin = sw.lat(), latMax = ne.lat(), lonMin = sw.lng(), lonMax = ne.lng()
    if (!isFinite(latMin) || !isFinite(latMax) || !isFinite(lonMin) || !isFinite(lonMax)) return

    try {
      const res = await fetch(
        `${GATE_URL}/rankings/leaders?lat_min=${latMin}&lat_max=${latMax}&lon_min=${lonMin}&lon_max=${lonMax}`
      )
      if (!res.ok) return
      const data = await res.json()
      if (!data?.price_leaders?.length && !data?.volume_leaders?.length) return

      // 기존 리더 마커 제거
      clearLeaders()

      const allLeaders: { apt_id: number; lat: number; lon: number; type: string; apt_nm: string; price?: number | null }[] = []

      // 가격 대장
      for (const l of data.price_leaders || []) {
        allLeaders.push({ apt_id: l.apt_id, lat: l.lat, lon: l.lon, type: "price", apt_nm: l.apt_nm, price: l.price ?? null })
      }

      // 거래량 대장 — 가격 대장과 중복되면 합쳐서 표시
      const priceIds = new Set((data.price_leaders || []).map((l: any) => l.apt_id))
      for (const l of data.volume_leaders || []) {
        if (priceIds.has(l.apt_id)) {
          // 이미 가격 대장으로 있음 → combined 마커로 대체
          for (let i = 0; i < allLeaders.length; i++) {
            if (allLeaders[i].apt_id === l.apt_id) {
              allLeaders[i].type = "both"
              break
            }
          }
        } else {
          allLeaders.push({ apt_id: l.apt_id, lat: l.lat, lon: l.lon, type: "volume", apt_nm: l.apt_nm, price: l.price ?? null })
        }
      }

      for (const l of allLeaders) {
        let bgColor, borderColor, textColor, label
        if (l.type === "price") {
          bgColor = "#1A2B4A"; borderColor = "#FFD700"; textColor = "#FFD700"
          label = "👑 실거래가"
        } else if (l.type === "volume") {
          bgColor = "#1A2B4A"; borderColor = "#60A5FA"; textColor = "#60A5FA"
          label = "📊 거래량"
        } else {
          bgColor = "#1A2B4A"; borderColor = "#FFD700"; textColor = "#FFD700"
          label = "👑📊 실거래가+거래량"
        }

        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(l.lat, l.lon),
          map: mapObj.current,
          zIndex: 10,
          icon: {
            content: `<div style="
              background:${bgColor}; color:${textColor};
              border:2px solid ${borderColor}; border-radius:8px;
              padding:3px 10px; font-size:10px; font-weight:900;
              cursor:pointer; white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.45);
              line-height:1.4;
            ">${label}</div>`,
            anchor: new window.naver.maps.Point(28, 14),
          },
        })

        window.naver.maps.Event.addListener(marker, "click", async () => {
          if (!isMounted.current) return
          openingRef.current = true
          setTimeout(() => { if (isMounted.current) openingRef.current = false }, 200)
          setPopupSummary("")
          setSummaryFailed(false)
          setPopupLoading(true)
          setSimilarApts([])
          setSimilarLoaded(false)
          setAptRankInfo(null)

          // 캐시 히트면 즉시 전체 보여줌 (두번째 클릭 빠름)
          const cachedL = aptDetailCacheRef.current.get(l.apt_id)
          let initialDataForSummaryL = null
          if (cachedL) {
            setPopupApt(cachedL)
            setPopupLoading(false)
            initialDataForSummaryL = cachedL
          } else {
            // 즉시 기본 패널 (리더 마커)
            // keep loading true to show the dedicated loading UI during main fetch for new apts
            const basicL = {
              apt_id: l.apt_id,
              apt_nm: l.apt_nm,
              sigungu: "",
              mode: "neutral",
              oreulji_score: 50,
              risk_score: 50,
              risk_level: "보통",
              expected_loss: 0,
              show_rise: false,
              price: l.price || null,
              build_year: null,
            }
            setPopupApt(basicL)
            setPopupLoading(false)
            initialDataForSummaryL = basicL
          }

          // 병렬 시작 + 즉시 attach similar (main block 제거)
          const similarP = fetch(buildSimilarQuery(l.apt_id)).then(r => r.ok ? r.json() : null).catch(() => null)
          similarP.then((d: SimilarAptResponse | null) => {
            if (!d || !isMounted.current) {
              setSimilarLoaded(true)
              return
            }
            setSimilarMeta({
              purpose: d.purpose_sort || onboardingRef.current?.purpose || "실거주",
              timeline: d.timeline_sort || onboardingRef.current?.timeline || "미정",
              horizon: d.selected_horizon_m || 24,
            })
            if (d.alternatives?.length) setSimilarApts(d.alternatives)
            setSimilarLoaded(true)
          }).catch(() => { if (isMounted.current) setSimilarLoaded(true) })

          const rankP = fetch(`${GATE_URL}/rankings/${l.apt_id}`).then(r => r.ok ? r.json() : null).catch(() => null)
          const subwayP = (l.lat && l.lon ? fetch(`${GATE_URL}/map/nearest-subway?lat=${l.lat}&lon=${l.lon}&limit=2`).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null))

          const mainP = fetch(`${GATE_URL}/apt/${l.apt_id}?horizon=${horizon}`).then(r => r.ok ? r.json() : null).catch(() => null)
          mainP.then(apt => {
            if (!apt || !isMounted.current) return
            prefetchDashboardUtil([apt.sigungu, apt.umd_nm].filter(Boolean).join(" "), apt.apt_nm, apt.sigungu_cd || "")
            setPopupApt(apt)
            // no need to setLoading false here, already done early for fast panel
            aptDetailCacheRef.current.set(apt.apt_id, apt)
          })

          rankP.then(d => { if (d && isMounted.current) setAptRankInfo(d) }).catch(() => {})
          subwayP.then(d => { if (d && isMounted.current) setNearestSubways(d) }).catch(() => {})

          const summaryTimeoutL = setTimeout(() => { if (isMounted.current) setSummaryFailed(true) }, 8000)
          const summaryBodyL = initialDataForSummaryL || { apt_id: l.apt_id, apt_nm: l.apt_nm }
          fetch("/api/apt-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(summaryBodyL),
          })
            .then(r => r.ok ? r.json() : null)
            .then(json => {
              clearTimeout(summaryTimeoutL)
              if (json?.summary && isMounted.current) setPopupSummary(json.summary)
              else if (isMounted.current) setSummaryFailed(true)
            })
            .catch(() => { if (isMounted.current) { clearTimeout(summaryTimeoutL); setSummaryFailed(true) } })
        })

        leaderMarkersRef.current.push(marker)
      }
    } catch (err) {
      console.error("대장 마커 로딩 실패:", err)
    }
  }, [horizon, clearLeaders])

  // ── 지도 초기화 ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return
    if (!window.naver?.maps) return

    isMounted.current = true
    const listeners: any[] = []

    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(37.5665, 126.9780),
      zoom: 12,
      minZoom: 8,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.TOP_RIGHT,
      },
    })
    mapObj.current = map
    console.log("[NaverMap] 지도 초기화 완료")

    // 온보딩에서 설정한 지역으로 먼저 이동 (GPS보다 우선)
    if (initialRegion && initialRegion !== "전국" && initialRegion !== "수도권 전체") {
      fetch(`${GATE_URL}/apt/search?q=${encodeURIComponent(initialRegion)}&limit=1`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.results?.[0]?.lat && d?.results?.[0]?.lon) {
            map.setCenter(new window.naver.maps.LatLng(d.results[0].lat, d.results[0].lon))
            map.setZoom(13)
          }
        })
        .catch(() => {})
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (initialRegion && initialRegion !== "전국") return
          map.setCenter(new window.naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
          map.setZoom(14)
        },
        (err) => {
          console.log("[NaverMap] 위치 권한 거부 또는 오류:", err.message)
        },
      )
    }

    listeners.push(window.naver.maps.Event.addListener(map, "idle", () => {
      console.log("[NaverMap] idle 이벤트 발생")
      if (idleDebounceRef.current) clearTimeout(idleDebounceRef.current)
      idleDebounceRef.current = setTimeout(() => {
        loadMarkers()
        loadLeaders()
        if (showSubwayRef.current) loadSubwayMarkers()
        if (showHospitalRef.current) loadHospitalMarkers()
        if (showAcademyRef.current) loadAcademyMarkers()
        if (showSchoolRef.current) loadSchoolMarkers()
        if (showAuctionRef.current) loadAuctionMarkers()

        const b = map.getBounds()
        if (b && isMounted.current) {
          const sw = b.getSW(), ne = b.getNE()
          fetch(`${GATE_URL}/map/district?lat_min=${sw.lat()}&lat_max=${ne.lat()}&lon_min=${sw.lng()}&lon_max=${ne.lng()}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.found && isMounted.current) setDistrict(d) })
            .catch(() => {})
        }
      }, 600)
    }))

    listeners.push(window.naver.maps.Event.addListener(map, "click", () => {
      if (openingRef.current) {
        openingRef.current = false
        return
      }
      closePopup()
      clearSubwayCircles()
    }))

    listenerRef.current = listeners

    // 공유 링크로 진입 시 해당 아파트 자동 열기
    if (initialAptId) {
      setTimeout(async () => {
        if (!isMounted.current) return
        try {
          const r = await fetch(`${GATE_URL}/apt/${initialAptId}?horizon=${horizon}`)
          if (!r.ok || !isMounted.current) return
          const apt: AptDetail = await r.json()
          if (apt.apt_id && isMounted.current) {
            map.setCenter(new window.naver.maps.LatLng(
              (apt as any).lat ?? 37.5665,
              (apt as any).lon ?? 126.9780,
            ))
            map.setZoom(16)
          }
          setPopupApt(apt)
          aptDetailCacheRef.current.set(apt.apt_id, apt)
          setSimilarApts([])
          setSimilarLoaded(true)
        } catch { /* 공유 링크 아파트 로딩 실패 */ }
      }, 1000)
    }

    // ?focus={auctionId} 로 진입 시 해당 경매물건 자동 열기
    if (focusAuctionId) {
      setTimeout(async () => {
        if (!isMounted.current) return
        try {
          const r = await fetch(`${GATE_URL}/auction/${focusAuctionId}`)
          if (!r.ok || !isMounted.current) return
          const detail = await r.json()
          if (detail.lat != null && detail.lon != null && isMounted.current) {
            map.setCenter(new window.naver.maps.LatLng(detail.lat, detail.lon))
            map.setZoom(16)
          }
          if (isMounted.current) {
            setPopupApt(null)
            setAuctionDetail(detail)
          }
        } catch { /* focus auction 로딩 실패 */ }
      }, 1200)
    }

    console.log("[NaverMap] 초기 마커 로딩 예약 (800ms)")
    const initTimer = setTimeout(() => {
      console.log("[NaverMap] 초기 loadMarkers 호출")
      loadMarkers()
    }, 800)
    const periodicRefreshTimer = setInterval(() => {
      if (!isMounted.current || !mapObj.current) return
      loadMarkers(true)
    }, 60_000)

    return () => {
      isMounted.current = false
      clearTimeout(initTimer)
      clearInterval(periodicRefreshTimer)
      if (idleDebounceRef.current) clearTimeout(idleDebounceRef.current)
      openingRef.current = false
      // map 이벤트 리스너 정리
      listeners.forEach(l => window.naver.maps.Event.removeListener(l))
      // 마커 + 마커 click 리스너 정리
      clearMarkers()
      clearSubwayMarkers()
      clearHospitalMarkers()
      clearAcademyMarkers()
      clearLeaders()
      mapObj.current = null
    }
  }, [loadMarkers, clearMarkers, closePopup, clearSubwayMarkers, clearHospitalMarkers, clearAcademyMarkers, clearLeaders, loadLeaders, focusAuctionId])

  // ── showPresale 토글 시 마커 리로드 ──────────────────────
  useEffect(() => {
    if (!mapObj.current) return
    loadMarkers(true)
  }, [showPresale, loadMarkers])

  // ── showSubway 토글 시 지하철 마커 토글 ───────────────────
  useEffect(() => {
    if (!mapObj.current) return
    if (showSubway) {
      loadSubwayMarkers()
    } else {
      clearSubwayMarkers()
    }
  }, [showSubway, loadSubwayMarkers, clearSubwayMarkers])

  // ── showHospital 토글 시 병원 마커 토글 ───────────────────
  useEffect(() => {
    if (!mapObj.current) return
    if (showHospital) {
      loadHospitalMarkers()
    } else {
      clearHospitalMarkers()
    }
  }, [showHospital, loadHospitalMarkers, clearHospitalMarkers])

  // ── showAcademy 토글 시 학원 마커 토글 ───────────────────
  useEffect(() => {
    if (!mapObj.current) return
    if (showAcademy) {
      loadAcademyMarkers()
    } else {
      clearAcademyMarkers()
    }
  }, [showAcademy, loadAcademyMarkers, clearAcademyMarkers])

  // ── showSchool 토글 시 학교 마커 토글 ───────────────────
  useEffect(() => {
    if (!mapObj.current) return
    if (showSchool) {
      loadSchoolMarkers()
    } else {
      clearSchoolMarkers()
    }
  }, [showSchool, loadSchoolMarkers, clearSchoolMarkers])

  // ── showAuction 토글 시 경매 마커 토글 ───────────────────
  useEffect(() => {
    if (!mapObj.current) return
    if (showAuction) {
      loadAuctionMarkers()
    } else {
      clearAuctionMarkers()
    }
  }, [
    showAuction,
    auctionFilter,
    auctionBudgetEok,
    auctionBudgetDelta,
    auctionHideHighRisk,
    auctionShowAllBudget,
    loadAuctionMarkers,
    clearAuctionMarkers,
  ])

  // ── 분양 단지 바텀 시트 (일반 단지와 동일한 분석 표시) ─────
  function renderPresaleSheet(apt: AptDetail) {
    const score = apt.oreulji_score
    const pInfo = apt.presale_info
    const displayScore = apt.final_score ?? apt.oreulji_score
    const address = [apt.sigungu, apt.umd_nm].filter(Boolean).join(" ")
    const dashboardUrl = buildDashboardUrl({
      aptId: apt.apt_id,
      aptName: apt.apt_nm,
      address,
      lawdCd: apt.sigungu_cd,
      gateScore: apt.oreulji_score,
      finalScore: apt.final_score,
      buildYear: apt.build_year,
      isPresale: true,
    })

    // score 기반 mode
    const derivedMode = displayScore >= 75 ? "safe"
      : displayScore >= 64 ? "good"
      : displayScore >= 56 ? "neutral"
      : displayScore >= 50 ? "caution"
      : "danger"
    const scoreGrad = displayScore >= 75
      ? "linear-gradient(135deg,#27AE60,#16A34A)"
      : displayScore >= 64 ? "linear-gradient(135deg,#2ECC71,#10B981)"
      : displayScore >= 56 ? "linear-gradient(135deg,#F1C40F,#F59E0B)"
      : displayScore >= 50 ? "linear-gradient(135deg,#E67E22,#F59E0B)"
      : "linear-gradient(135deg,#E74C3C,#DC2626)"

    const jeonseColor = apt.jeonse_risk_level === "높음" ? "#DC2626" : apt.jeonse_risk_level === "보통" ? "#D97706" : "#16A34A"
    const riskColor   = apt.risk_level === "높음" ? "#DC2626" : apt.risk_level === "보통" ? "#D97706" : "#16A34A"
    const recommendationContext: RecommendationContext = {
      purpose: similarMeta.purpose === "투자" ? "투자" : "실거주",
      timeline: ["3개월", "6개월", "1년", "미정"].includes(similarMeta.timeline) ? similarMeta.timeline as RecommendationContext["timeline"] : "미정",
      horizon: similarMeta.horizon,
      budget: onboardingRef.current?.budget ?? onboarding?.budget ?? 0,
    }
    const recommendationCopy = getRecommendationCopy(recommendationContext)
    const recommendationBadge = recommendationLabel(recommendationContext)
    const topRecommendation = similarApts[0]
    const topBudgetCopy = getBudgetFitCopy(topRecommendation?.budget_fit)

    const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "#6B7280" }}>{label}</span>
        <span style={{ fontWeight: 600, color: color || "#111827" }}>{value}</span>
      </div>
    )

    return (
      <RightPanel>

        {/* 헤더 (고정) */}
        <div style={{
          padding: "0 16px 10px", display: "flex",
          justifyContent: "space-between", alignItems: "flex-start",
          borderBottom: "1px solid #F3F4F6", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, overflowWrap: "break-word", maxWidth: "calc(100vw - 80px)" }}>
              {apt.apt_nm}
            </div>
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
              {apt.sigungu}{apt.umd_nm ? " " + apt.umd_nm : ""}
            </div>
            <TrustStrip
              updatedAt={apt.updatedAt || apt.lastUpdated}
              lastNewsTime={apt.categories?.global?.rawData?.news?.[0]?.pubDate}
              tradeCount={apt.recent_trades?.length}
              confidence={apt.confidence}
              variant="compact"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={closePopup} aria-label="닫기" style={{
              background: "#F3F4F6", border: "none", borderRadius: 10,
              width: 44, height: 44, fontSize: 20, color: "#6B7280",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>×</button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div style={{ overflowY: "auto", padding: "12px 16px 32px", flex: 1, minHeight: 0 }}>

          {/* ── 비교 담기 CTA (핵심 기능 — 항상 상단 고정) ── */}
          {(() => {
            const inCompare = compareList.some(c => c.apt_id === apt.apt_id)
            const full = compareList.length >= 2
            const other = compareList.find(c => c.apt_id !== apt.apt_id)
            const otherName = other ? other.apt_nm.slice(0, 8) + (other.apt_nm.length > 8 ? "…" : "") : ""
            const label = inCompare
              ? full
                ? "🔍 지금 1:1 비교 보기 →"
                : "✓ 비교함에 담김 · 지도에서 비교할 아파트를 하나 더 고르세요"
              : full
                ? `↔ 비교함이 가득 · 이 아파트로 교체하기`
                : other
                  ? `➕ 비교 담기 — ${otherName} vs 이 아파트`
                  : "➕ 이 아파트 비교함에 담기"
            return (
              <button
                onClick={() => {
                  if (inCompare && full) { setShowCompare(true); return }
                  if (inCompare) { setCompareList(prev => prev.filter(c => c.apt_id !== apt.apt_id)); return }
                  if (full) { setCompareList(prev => [prev[0], apt]); return }
                  setCompareList(prev => [...prev, apt])
                }}
                title={inCompare && !full ? "누르면 담기 해제" : undefined}
                style={{
                  position: "sticky", top: 0, zIndex: 5,
                  display: "block", width: "100%", marginBottom: 12,
                  background: inCompare && full ? "#FFD700" : inCompare ? "#EEF2FF" : "#6366F1",
                  color: inCompare && full ? "#1A2B4A" : inCompare ? "#4338CA" : "#fff",
                  border: inCompare && !full ? "1.5px solid #6366F1" : "none",
                  borderRadius: 12, padding: "13px 16px",
                  fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(99,102,241,0.25)",
                }}
              >
                {label}
              </button>
            )
          })()}

          {/* ── 결론 카드 ── */}
          {(() => {
            const v = getVerdict(apt)
            const reasons = getReasons(apt)
            return (
              <div style={{
                background: v.bg, border: `1.5px solid ${v.border}`,
                borderRadius: 14, padding: "14px 16px", marginBottom: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{v.emoji}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: v.color, lineHeight: 1.2 }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: v.color, opacity: 0.8, marginTop: 2 }}>{v.sub}</div>
                  </div>
                  <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%", background: scoreGrad,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{displayScore}</div>
                      <div style={{ fontSize: 9, opacity: 0.75 }}>/ 100</div>
                    </div>
                    <div style={{ fontSize: 9, color: "#9CA3AF", textAlign: "center" }}>오를지 점수</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: scoreGrad.includes("27AE60") || scoreGrad.includes("2ECC71") ? "#16A34A" : scoreGrad.includes("F1C40F") ? "#D97706" : "#DC2626", textAlign: "center" }}>
                      {derivedMode === "safe" ? "안전" : derivedMode === "good" ? "양호" : derivedMode === "neutral" ? "중립" : derivedMode === "caution" ? "주의" : "위험"}
                    </div>
                    {apt.presale_score_label && (
                      <div style={{ fontSize: 8, color: "#9CA3AF", textAlign: "center", marginTop: 1, maxWidth: 80, lineHeight: 1.2 }}>
                        {apt.presale_score_label}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {reasons.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12 }}>
                      <span style={{ flexShrink: 0, fontWeight: 700, color: r.positive ? "#16A34A" : "#DC2626" }}>
                        {r.positive ? "✓" : "✗"}
                      </span>
                      <span style={{ color: r.positive ? "#166534" : "#991B1B", lineHeight: 1.4 }}>
                        <strong>{r.axis}:</strong> {r.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── 체크리스트 ── */}
          <ChecklistCard apt={apt} />

          {/* ── 점수 구성 breakdown (분양단지) ── */}
          {apt.presale_score_breakdown && (
            <div style={{
              background: "#F0F9FF", borderRadius: 10, padding: "12px 14px",
              marginBottom: 12, border: "1px solid #BAE6FD",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0369A1", marginBottom: 8 }}>
                📊 점수 구성
              </div>
              {(() => {
                const bd = apt.presale_score_breakdown!
                const items = [
                  { label: "시세차익", score: bd.comp_score, weight: bd.comp_weight, color: "#059669" },
                  { label: "입지전망", score: bd.future_score, weight: bd.future_weight, color: "#0284C7" },
                  { label: "단지품질", score: bd.quality_score, weight: bd.quality_weight, color: "#7C3AED" },
                ].filter(it => it.score != null)
                const maxScore = Math.max(...items.map(it => it.score!))
                return items.map((it, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: i < items.length - 1 ? 4 : 0 }}>
                    <span style={{ fontSize: 12, color: "#374151", width: 56, flexShrink: 0, fontWeight: 600 }}>{it.label}</span>
                    <div style={{ flex: 1, height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(it.score! / 100) * 100}%`, height: "100%", background: it.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: it.score === maxScore ? it.color : "#6B7280", width: 32, textAlign: "right" }}>{it.score}</span>
                    <span style={{ fontSize: 10, color: "#94A3B8", width: 30, textAlign: "right" }}>{Math.round((it.weight || 0) * 100)}%</span>
                  </div>
                ))
              })()}
            </div>
          )}

          {/* 분석 정보 */}
          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            {apt.risk_score != null && apt.risk_level != null && (
              <Row label="시장 위험도" value={`${apt.risk_score}점 (${apt.risk_level})`} color={riskColor} />
            )}
            {(() => {
              const trend = calcTrend(apt)
              if (trend.direction === "없음") return null
              const trendColor = trend.direction === "상승" ? "#16A34A" : trend.direction === "하락" ? "#DC2626" : "#6B7280"
              return <Row label="가격 추세 (최근)" value={`${trend.direction}${trend.pct ? " " + trend.pct : ""}`} color={trendColor} />
            })()}
            {apt.jeonse_risk_level && <Row label="전세 위험도" value={apt.jeonse_risk_level} color={jeonseColor} />}
            {apt.school_score != null && (
              <Row
                label="학군 점수"
                value={schoolGradeLabel(apt.school_score)
                  ? `${schoolGradeLabel(apt.school_score)} · ${apt.school_score}점`
                  : `${apt.school_score}점`}
              />
            )}
            {apt.peak_info && (() => {
              const hasDrawdown =
                typeof apt.peak_info?.drawdown_pct === "number" &&
                Number.isFinite(apt.peak_info.drawdown_pct) &&
                typeof apt.peak_info?.drawdown_label === "string" &&
                apt.peak_info.drawdown_label.trim().length > 0

              if (!hasDrawdown) {
                return <Row label="2021년 고점 대비" value="비교 불가 (2021년 이전 거래 없음)" color="#6B7280" />
              }

              return (
                <Row
                  label="2021년 고점 대비"
                  value={`${apt.peak_info.drawdown_pct >= 0 ? "+" : ""}${apt.peak_info.drawdown_pct}% (${apt.peak_info.drawdown_label})`}
                  color={apt.peak_info.drawdown_pct >= 0 ? "#16A34A" : apt.peak_info.drawdown_pct >= -10 ? "#F59E0B" : "#DC2626"}
                />
              )
            })()}
            {apt.short_rank?.signal_valid && apt.short_rank?.regime === 'up'
              ? <Row label="6개월 뒤 전망 순위" value={`상위 ${apt.short_rank.pct}%${apt.short_rank.accuracy?.h6 ? ` (과거 검증: 100번 중 약 ${Math.round(apt.short_rank.accuracy.h6.acc * 100)}번 적중)` : ''}`} />
              : apt.short_rank && !apt.short_rank.signal_valid
              ? <Row label="단기 전망" value={`신호 약함 (${apt.short_rank.regime} 국면)`} />
              : null}
            {apt.apt_rank_national?.national_pct != null &&
              <Row label="24개월 뒤 전망 순위" value={`상위 ${apt.apt_rank_national.national_pct}%${apt.apt_rank_national.accuracy?.h24_up ? ` (과거 검증: 100번 중 약 ${Math.round(apt.apt_rank_national.accuracy.h24_up.acc * 100)}번 적중)` : ''}`} />}
            {apt.kapt_sale_price != null && <Row label="💰 분양가" value={`${apt.kapt_sale_price.toLocaleString("ko-KR")}만원`} />}
            {(() => {
              const feeDisplay = getSeasonalManagementFeeDisplay(apt)
              if (feeDisplay.rows.length === 0) return null
              return (
                <>
                  {feeDisplay.rows.map((row) => (
                    <Row key={row.label} label={row.label} value={row.value} color={row.color} />
                  ))}
                  {feeDisplay.caption && (
                    <div style={{ marginTop: -2, marginBottom: 6, fontSize: 11, color: "#6B7280", textAlign: "right" }}>
                      {feeDisplay.caption}
                    </div>
                  )}
                </>
              )
            })()}
            {apt.kapt_ho_cnt != null && <Row label="세대수" value={`${apt.kapt_ho_cnt.toLocaleString("ko-KR")}세대`} />}
            {apt.turnover?.turnover_rate_pct != null && (
              <Row
                label="거래회전율 (12개월)"
                value={`${apt.turnover.turnover_rate_pct}%`}
                color={apt.turnover.turnover_rate_pct >= 10 ? "#2ECC71" : apt.turnover.turnover_rate_pct >= 5 ? "#F39C12" : "#E74C3C"}
              />
            )}
            {nearestSubways && nearestSubways.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{ color: "#6B7280", flexShrink: 0 }}>🚇 역세권</span>
                <div style={{ textAlign: "right" }}>
                  {nearestSubways.map((s, i) => {
                    const lineColor = LINE_COLORS[s.line_nm] || "#6B7280"
                    const walkMin = Math.round(s.distance_m / 80) // 80m/분 보행 속도
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: i > 0 ? 2 : 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: lineColor, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: "#111827", fontSize: 12 }}>
                          {s.station_nm}
                        </span>
                        <span style={{ color: "#6B7280", fontSize: 11 }}>
                          {s.distance_m < 1000 ? `${s.distance_m}m` : `${(s.distance_m / 1000).toFixed(1)}km`}
                          · 도보 {walkMin}분
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* horizon별 신뢰도 */}
          {apt.confidence_map && (
            <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>예측 신뢰도 (horizon별)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
                {Object.entries(apt.confidence_map).map(([h, conf]) => (
                  <span key={h} style={{ fontSize: 11, color: "#374151", display: "inline-flex", alignItems: "center" }}>
                    {h}개월: <ConfidenceBadge level={conf} />
                  </span>
                ))}
              </div>

              {apt.urgent_sale_signal && (
                <div style={{
                  marginTop: 8, padding: "8px 10px",
                  background: "#FFFBEB", border: "1px solid #FDE68A",
                  borderRadius: 6, fontSize: 11, color: "#92400E",
                  lineHeight: 1.4,
                }}>
                  ⚠️ 최근 {apt.sample_count}건 거래 중 최저가와 평균가 차이가 {apt.dispersion_pct}%로
                  급매물 출회 가능성이 있습니다
                </div>
              )}
              {(() => {
                const note = getSeasonalNote()
                if (!note) return null
                return (
                  <div style={{
                    marginTop: 8, padding: "6px 8px",
                    background: "#F0F9FF", borderRadius: 6,
                    fontSize: 11, color: "#0369A1", lineHeight: 1.4,
                  }}>
                    {note.icon} {note.text}
                  </div>
                )
              })()}
            </div>
          )}

          {/* 행정동 내 순위 — 메인 데이터 도착 즉시 레이아웃 고정해서 "빈 화면" 느낌 제거 */}
          <div style={{
            marginBottom: 12, padding: "8px 10px",
            background: "linear-gradient(135deg, #F0F4FF, #E8F0FE)",
            border: "1px solid #C7D9F7",
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", marginBottom: 5 }}>
              📍 이 동네 순위
            </div>
            {aptRankInfo ? (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>가격</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#F59E0B" }}>
                    {aptRankInfo.price_rank_in_umd}
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>
                      /{aptRankInfo.price_total_in_umd}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>동네 비싼순</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>거래량</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#3B82F6" }}>
                    {aptRankInfo.vol_rank_in_umd}
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>
                      /{aptRankInfo.vol_total_in_umd}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>동네 거래많은순</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#9CA3AF", padding: "2px 0" }}>
                불러오는 중...
              </div>
            )}
          </div>

          {/* 🍼 처음 집 사는 분을 위한 체크리스트 */}
          {(!apt.is_presale) && (
            <div style={{
              marginBottom: 12,
              padding: "12px 14px",
              background: "#FEF3C7",
              border: "1px solid #F59E0B",
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>
                🍼 처음 집 사는 분이라면 먼저 확인하세요
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "#78350F" }}>
                <div>1. <strong>당신 상황 정리</strong> — 생애 첫 집인가요? 신혼 6년 이내인가요? 신용점수 대략 몇 점대인가요?</div>
                <div>2. <strong>실제 필요 현금 계산</strong> — 매매가 + 취득세(1~3%) + 중개수수료(0.3~0.9%) + 기타 비용 = 총 소요액. 준비 현금이 얼마나 되나요?</div>
                <div>3. <strong>대출 플랜 세우기</strong> — 신혼 우대 적용되나요? 시중은행 주담대 평균 연 4.3% 수준(2026년 상반기 신규취급 기준)이니 은행별 금리를 꼭 비교하세요. DSR·LTV 확인했나요?</div>
                <div>4. <strong>청약/특공 자격</strong> — 신혼 특별공급이나 청약통장 납입 기간 확인했나요?</div>
                <div>5. <strong>계약 전 실사</strong> — 실거래가 vs 호가, 관리비, 하자 이력, 학군·편의시설 실제로 확인했나요?</div>
                <div>6. <strong>후회 방지 마지막 체크</strong> — 이 집 vs 다른 후보의 후회 확률 비교하기 (이 앱 핵심!)</div>
              </div>
              <div style={{ fontSize: 10, color: "#92400E", marginTop: 8, fontWeight: 600 }}>
                이 체크를 마치면 이 아파트의 후회 확률을 다른 후보와 비교해보세요 →
              </div>
            </div>
          )}

          {/* 입주 정보 */}
          {pInfo && (
            <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>🏗️ 분양 단지 정보</div>
              {pInfo.move_in_status && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#6B7280" }}>입주</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{pInfo.move_in_status}</span>
                </div>
              )}
              {pInfo.builder && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#6B7280" }}>시공사</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{pInfo.builder}</span>
                </div>
              )}
              {pInfo.total_households != null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#6B7280" }}>세대수</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{pInfo.total_households.toLocaleString()}세대</span>
                </div>
              )}
              {pInfo.parking != null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#6B7280" }}>주차</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{pInfo.parking}대</span>
                </div>
              )}
              {pInfo.heating && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#6B7280" }}>난방</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{pInfo.heating}</span>
                </div>
              )}
              {pInfo.hall && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#6B7280" }}>구조</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{pInfo.hall}</span>
                </div>
              )}
              {pInfo.sale_price && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6, paddingTop: 6, borderTop: "1px solid #E5E7EB" }}>
                  <span style={{ color: "#6B7280" }}>💰 분양가</span>
                  <span style={{ fontWeight: 700, color: "#16A34A" }}>{pInfo.sale_price.toLocaleString("ko-KR")}만원</span>
                </div>
              )}

              {/* ── 분양가 vs 주변 시세 (기회비용) ── */}
              {apt.price_competitiveness && (
                <div style={{
                  marginTop: 10, padding: "10px 12px",
                  background: "#F0FDF4", borderRadius: 8,
                  border: "1px solid #BBF7D0",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 6 }}>
                    💰 분양가 vs 주변 시세
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: "#6B7280" }}>주변 시세 (원당동 평균)</span>
                    <span style={{ fontWeight: 700 }}>{apt.price_competitiveness.avg_market_price.toLocaleString()}만원</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: "#6B7280" }}>이 단지 분양가 (최소형)</span>
                    <span style={{ fontWeight: 700 }}>{apt.price_competitiveness.sale_price.toLocaleString()}만원</span>
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", fontSize: 13,
                    marginTop: 6, paddingTop: 6, borderTop: "1px solid #D1FAE5",
                  }}>
                    <span style={{ color: "#166534", fontWeight: 600 }}>시세차익</span>
                    <span style={{ fontWeight: 900, color: "#059669" }}>
                      {apt.price_competitiveness.gap_vs_avg_pct >= 0
                        ? `🔽 주변보다 ${Math.abs(apt.price_competitiveness.gap_vs_avg_pct)}% 저렴`
                        : `🔼 주변보다 ${Math.abs(apt.price_competitiveness.gap_vs_avg_pct)}% 비쌈`}
                    </span>
                  </div>
                  {apt.price_competitiveness.gap_vs_avg_pct >= 10 && (
                    <div style={{
                      marginTop: 6, fontSize: 11, color: "#166534",
                      background: "#DCFCE7", borderRadius: 6, padding: "6px 8px",
                      lineHeight: 1.4,
                    }}>
                      ✨ 분양가가 주변 시세보다 <strong>{Math.abs(apt.price_competitiveness.gap_vs_avg_pct)}% 저렴</strong>합니다.
                      같은 예산으로 구축을 매수하는 것보다 유리할 수 있습니다.
                    </div>
                  )}
                  {apt.price_competitiveness.gap_vs_avg_pct < 10 && apt.price_competitiveness.gap_vs_avg_pct >= 0 && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "#94A3B8", lineHeight: 1.5 }}>
                      ⚠️ 분양가가 시세와 비슷한 수준입니다.
                      {apt.short_rank?.signal_valid && apt.short_rank?.regime === 'up' && <span> 6개월 뒤 지역 전망 순위: <strong>상위 {Math.round(apt.short_rank.pct)}%</strong></span>}
                    </div>
                  )}
                </div>
              )}

              {/* ── 평형별 분양가 테이블 ── */}
              {apt.supply_units && apt.supply_units.length > 0 && (
                <div style={{
                  marginTop: 10, padding: "8px 10px",
                  background: "#FFFFFF", borderRadius: 8,
                  border: "1px solid #E5E7EB",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                    📐 평형별 분양가
                  </div>
                  <div style={{ fontSize: 11 }}>
                    <div style={{ display: "flex", fontWeight: 700, color: "#6B7280", padding: "4px 0", borderBottom: "1px solid #E5E7EB", marginBottom: 4 }}>
                      <span style={{ width: "28%", flexShrink: 0 }}>주택형</span>
                      <span style={{ width: "24%", flexShrink: 0 }}>전용면적</span>
                      <span style={{ width: "24%", flexShrink: 0, textAlign: "right" }}>분양가</span>
                      <span style={{ width: "24%", flexShrink: 0, textAlign: "right" }}>평당가</span>
                    </div>
                    {apt.supply_units.map((u, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center",
                        padding: "5px 0", borderBottom: i < apt.supply_units!.length - 1 ? "1px solid #F3F4F6" : "none",
                      }}>
                        <span style={{ width: "28%", flexShrink: 0, fontWeight: 600, color: "#111827" }}>
                          {u.type || "—"}
                        </span>
                        <span style={{ width: "24%", flexShrink: 0, color: "#4B5563" }}>
                          {u.area_m2 ? `${u.area_m2}㎡` : "—"}
                        </span>
                        <span style={{ width: "24%", flexShrink: 0, textAlign: "right", fontWeight: 700, color: "#16A34A" }}>
                          {u.price > 0 ? `${(u.price / 10000).toFixed(u.price >= 100000 ? 1 : 2)}억` : "—"}
                        </span>
                        <span style={{ width: "24%", flexShrink: 0, textAlign: "right", color: "#6B7280" }}>
                          {u.price_per_pyeong ? `${u.price_per_pyeong.toLocaleString()}만` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 12개월 예측 (무료) */}
          {(() => {
            const p12 = apt.pred_pcts?.["12"]
            if (p12 == null) return null
            const gain12 = apt.price ? Math.round(apt.price * p12 / 100) : null
            const isUp = p12 >= 0
            const sign = isUp ? "+" : ""
            const color = isUp ? "#16A34A" : "#DC2626"
            const icon = isUp ? "📈" : "📉"
            const conf12 = apt.confidence_map?.["12"]
            return (
              <div style={{ color, fontWeight: 700, fontSize: 13, marginTop: 8 }}>
                {icon} 12개월 후 <span style={{ fontWeight: 800 }}>{sign}{p12}%</span>
                {gain12 != null && ` (약 ${sign}${(gain12 / 10000).toFixed(1)}억)`}
                <span style={{ fontWeight: 400, fontSize: 11, color: "#6B7280", marginLeft: 6 }}>· 무료</span>
                {conf12 && <ConfidenceBadge level={conf12} />}
              </div>
            )
          })()}

          {/* 24개월 예상 상승 (유료) */}
          {apt.expected_gain != null && apt.expected_gain > 0 && (() => {
            const paid = userPlan === "subscription" || purchasedAptIds.includes(apt.apt_id)
            return (
              <div
                onClick={() => { if (!paid) { setPaywallOpen(true); setPaywallTrigger("ml-forecast") } }}
                style={{ color: "#16A34A", fontWeight: 700, fontSize: 13, marginTop: 4, cursor: paid ? "default" : "pointer", opacity: paid ? 1 : 0.5, userSelect: paid ? "auto" : "none" }}
              >
                {paid ? "🔥" : "🔒"} 24개월 AI 방향: 상승 우위 전망
                {!paid && <span style={{ fontWeight: 400, fontSize: 11, color: "#6366F1", marginLeft: 6 }}>구매하기</span>}
              </div>
            )
          })()}

          {/* 예측 점수 설명 */}
          {apt.is_predicted_score && (
            <div style={{
              marginTop: 8, padding: "10px 12px",
              background: "#FFFBEB", border: "1px solid #FDE68A",
              borderRadius: 8, fontSize: 11, color: "#92400E",
              lineHeight: 1.5,
            }}>
              📊 실거래 데이터가 쌓이면 예측 점수는 실제 거래 단지 점수로 대체됩니다.
              분양예정 단지의 예측 점수는 참고용으로만 활용해주세요.
            </div>
          )}

          {/* AI 요약 */}
          <div style={{
            marginTop: 12, padding: "10px 12px",
            background: summaryFailed ? "#FFF7ED" : "#F9FAFB", borderRadius: 8,
            fontSize: 12, color: popupSummary ? "#374151" : "#9CA3AF",
            lineHeight: 1.6, textAlign: popupSummary ? "left" : "center",
          }}>
            {popupSummary
              ? <><span style={{ fontWeight: 600, color: "#6366F1" }}>✨ 오를지 AI 요약</span><br />{popupSummary.replace(/\*\*/g, "")}</>
              : summaryFailed
                ? <span style={{ color: "#D97706" }}>☁️ 오를지 AI 요약을 불러오지 못했습니다</span>
                : <><span style={{ fontWeight: 600, color: "#6366F1" }}>✨ 오를지 AI 요약</span><br />
                  <span style={{display:'inline-flex',alignItems:'center'}}>
                    <span className="spin" style={{display:'inline-block',width:10,height:10,border:'1.5px solid #d1d5db',borderTopColor:'#3b82f6',borderRadius:'50%',marginRight:4,animation:'spin 0.7s linear infinite'}}/>
                    로딩중...
                  </span>
                </>}
          </div>

          {/* 📌 임장 비교 — 5km 생활권 근처 매물 */}
          <div style={{ fontSize: 9, color: "#9CA3AF" }}>5km 이내에서 찾은 아파트</div>
          {!similarLoaded && (
            <div style={{ marginTop: 14, fontSize: 12, color: "#9CA3AF", display:'flex', alignItems:'center' }}>
              <span className="spin" style={{display:'inline-block',width:10,height:10,border:'1.5px solid #d1d5db',borderTopColor:'#3b82f6',borderRadius:'50%',marginRight:4,animation:'spin 0.7s linear infinite'}}/>
              비슷한 매물 추천 불러오는 중...
            </div>
          )}
          {similarLoaded && similarApts.length === 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: "#9CA3AF" }}>
              5km 이내 비슷한 매물이 없습니다.
            </div>
          )}
          {similarApts.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px solid #E5E7EB" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#374151", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{recommendationCopy.headerTitle}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>
                  ({recommendationBadge})
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 10, lineHeight: 1.5 }}>
                {recommendationCopy.headerDescription}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {similarApts.map((s) => {
                const url = buildDashboardUrl({
                  aptId: s.apt_id,
                  aptName: s.apt_nm,
                  address: [s.sigungu_nm, s.umd_nm].filter(Boolean).join(" "),
                  lawdCd: apt.sigungu_cd,
                })
                const priceStr = s.latest_price
                  ? s.latest_price >= 10000
                    ? `${(s.latest_price / 10000).toFixed(1)}억`
                    : `${s.latest_price.toLocaleString()}만`
                  : "-"
                const isSame = s.region_type === "same_sigungu"
                const diffColor = (s.score_diff ?? 0) >= 0 ? "#16A34A" : "#DC2626"
                const diffIcon = (s.score_diff ?? 0) >= 0 ? "↑" : "↓"
                const distVal = s.distance_km != null ? Number(s.distance_km) : null
                const distStr = distVal != null ? `${distVal.toFixed(1)}km` : ""
                const labelText = distVal != null
                  ? (distVal < 2.5 ? "인근" : (isSame ? "같은 구" : "근처"))
                  : (isSame ? "같은 구" : "근처")
                const selectedPrediction = s.predicted_change_selected
                const similarPriceDisplay = getSimilarPriceDisplay({
                  basePrice: apt.price,
                  similar: s,
                  purpose: recommendationContext.purpose === "투자" ? "투자" : "실거주",
                })
                const badgeScore = s.display_score ?? s.oreulji_score ?? 0
                return (
                  <a
                    key={s.apt_id}
                    href={url}
                    target="_blank"
                    onClick={() => {
                      void trackAnalyticsEvent({
                        eventType: "recommendation_click",
                        funnel: "consumer",
                        source: "map-recommendation-list",
                        aptId: s.apt_id,
                        aptName: s.apt_nm,
                        meta: {
                          regionType: s.region_type ?? null,
                        },
                      })
                    }}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", borderRadius: 10,
                      background: isSame ? "#F0FDF4" : "#FFF7ED",
                      border: `1px solid ${isSame ? "#BBF7D0" : "#FED7AA"}`,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: badgeScore >= 75 ? "#16A34A" : badgeScore >= 56 ? "#F59E0B" : "#DC2626",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0,
                      }}>
                        {badgeScore}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.apt_nm}</span>
                          {distStr && (
                            <span style={{ fontSize: 9, color: isSame ? "#15803D" : "#EA580C", background: isSame ? "#BBF7D0" : "#FED7AA", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              {labelText} {distStr}
                            </span>
                          )}
                          {!distStr && isSame && (
                            <span style={{ fontSize: 9, color: "#15803D", background: "#BBF7D0", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              같은 구
                            </span>
                          )}
                          {s.budget_fit === "within" && (
                            <span style={{ fontSize: 9, color: "#1D4ED8", background: "#DBEAFE", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              예산 적합
                            </span>
                          )}
                          {s.budget_fit === "stretch" && (
                            <span style={{ fontSize: 9, color: "#B45309", background: "#FDE68A", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              예산 살짝 초과
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                          {s.sigungu_nm} {s.umd_nm} · {priceStr} · {s.build_year || "-"}년
                        </div>
                        {getRecommendationReasonLine({
                          context: recommendationContext,
                          budgetFit: s.budget_fit,
                          personalizationReason: s.personalization_reason,
                          selectedPrediction,
                        }) && (
                          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
                            {getRecommendationReasonLine({
                              context: recommendationContext,
                              budgetFit: s.budget_fit,
                              personalizationReason: s.personalization_reason,
                              selectedPrediction,
                            })}
                          </div>
                        )}
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#3730A3", marginTop: 5 }}>
                          {getBudgetFitCopy(s.budget_fit).itemAction} →
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: diffColor }}>
                          {(s.score_diff ?? 0) === 0 ? "점수 동급" : `${diffIcon} ${Math.abs(s.score_diff ?? 0)}점`}
                        </div>
                        {(() => {
                          const baseR = popupApt ? (popupApt.downside_regret_prob ?? popupApt.regret_prob ?? null) : (typeof apt !== "undefined" && apt ? (apt.downside_regret_prob ?? apt.regret_prob ?? null) : null)
                          const simR = s.downside_regret_prob ?? s.regret_prob ?? null
                          if (baseR != null && simR != null) {
                            const rd = Math.round((simR - baseR) * 100)
                            const better = rd < 0
                            return (
                              <div style={{ fontSize: 10, fontWeight: 700, color: better ? "#16A34A" : "#DC2626", marginTop: 1 }}>
                                후회 {better ? "" : "+"}{rd}p {better ? "↓" : "↑"}
                              </div>
                            )
                          }
                          return null
                        })()}
                        {similarPriceDisplay.primary && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: similarPriceDisplay.primary.color }}>
                            {similarPriceDisplay.primary.text}
                          </div>
                        )}
                        {similarPriceDisplay.secondary && (
                          <div style={{ fontSize: 9, color: "#9CA3AF" }}>
                            {similarPriceDisplay.secondary}
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                )
              })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <a
              href={dashboardUrl}
              target="_blank"
              style={{
                display: "block", padding: "12px 14px",
                background: "#6366F1", color: "#fff",
                borderRadius: 12, textAlign: "center",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}
            >
              {recommendationCopy.mapPrimaryCta}
            </a>
            {topRecommendation && (
              <button
                onClick={() => openTopRecommendationCompare(apt, topRecommendation)}
                disabled={compareLoadingId === topRecommendation.apt_id}
                style={{
                  display: "block", padding: "11px 14px",
                  background: "#F8FAFF", color: "#3730A3",
                  border: "1px solid #C7D2FE",
                  borderRadius: 12, textAlign: "center",
                  fontSize: 12, fontWeight: 700,
                  cursor: compareLoadingId === topRecommendation.apt_id ? "wait" : "pointer",
                  opacity: compareLoadingId === topRecommendation.apt_id ? 0.7 : 1,
                }}
              >
                {compareLoadingId === topRecommendation.apt_id ? "추천 1위 비교 준비중..." : topBudgetCopy.mapCompareCta}
              </button>
            )}
          </div>
        </div>
      </RightPanel>
    )
  }

  // ── 바텀 시트 렌더링 ─────────────────────────────────────
  function renderBottomSheet() {
    if (!popupApt && !popupLoading) return null

    // popupLoading 명시적일 때는 로딩 UI (맵 클릭 간섭으로 apt가 null 되어도 스피너/이름 유지)
    if (popupLoading) {
      // 클릭 즉시 설정된 기본 정보(apt_nm 등)를 사용해 이름 표시 — 체감 속도 향상
      const basic = popupApt
      return (
        <RightPanel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", overflowWrap: "break-word" }}>
                {basic?.apt_nm || "불러오는 중..."}
                {basic?.oreulji_score != null && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "#6366F1" }}>
                    {basic.oreulji_score}점
                  </span>
                )}
              </div>
              {basic && (basic.sigungu || basic.umd_nm) && (
                <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
                  {[basic.sigungu, basic.umd_nm].filter(Boolean).join(" ")}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#9CA3AF", fontSize: 13, display: 'flex', alignItems: 'center' }}>
                <span className="spin" style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: '2px solid #e5e7eb', borderTopColor: '#3b82f6',
                  borderRadius: '50%', marginRight: 6,
                  animation: 'spin 0.8s linear infinite'
                }} />
                분석중
              </span>
              <button
                onClick={closePopup}
                aria-label="닫기"
                style={{
                  background: "#F3F4F6", border: "none", borderRadius: 10,
                  width: 44, height: 44, fontSize: 20, color: "#6B7280",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            </div>
          </div>
          {/* 간단한 진행 텍스트들 (사용자 요청) — 스피너 아래에 표시 */}
          <div style={{ padding: "0 16px 16px", fontSize: 11, color: "#9CA3AF", lineHeight: 1.6 }}>
            <div>• 아파트 기본 정보 로딩 중...</div>
            <div>• 5km 내 비슷한 매물 검색 중...</div>
            <div>• AI 요약 + 글로벌 뉴스 (FOMC/유가/환율) 분석 중...</div>
          </div>
        </RightPanel>
      )
    }

    const apt = popupApt!
    // 분양 단지 전용 바텀시트
    if (apt.is_presale) {
      return renderPresaleSheet(apt)
    }
    const displayScore = apt.final_score ?? apt.oreulji_score
    const horizon = apt.horizon_m || 24
    const address = [apt.sigungu, apt.umd_nm].filter(Boolean).join(" ")
    const dashboardUrl = buildDashboardUrl({
      aptId: apt.apt_id,
      aptName: apt.apt_nm,
      address,
      lawdCd: apt.sigungu_cd,
      gateScore: apt.oreulji_score,
      finalScore: apt.final_score,
      buildYear: apt.build_year,
      isPresale: !!apt.is_presale,
    })

    const latestPrice = apt.price || (apt.recent_trades?.[0]?.price_man ?? 0)
    const priceStr = latestPrice
      ? `${(latestPrice / 10000).toFixed(1)}억`
      : apt.is_presale ? "분양 단지 — 입주 후 표시" : "실거래 데이터 부족"
    const offerStr = apt.market_offer_mid_low && apt.market_offer_mid_high
      ? `중층 ${(apt.market_offer_mid_low / 10000).toFixed(1)}~${(apt.market_offer_mid_high / 10000).toFixed(1)}억` : "정보없음"
    const lowFloorStr = apt.low_floor_offer_low && apt.low_floor_offer_high
      ? `${(apt.low_floor_offer_low / 10000).toFixed(1)}~${(apt.low_floor_offer_high / 10000).toFixed(1)}억` : ""
    const topFloorStr = apt.top_floor_offer_low && apt.top_floor_offer_high
      ? `${(apt.top_floor_offer_low / 10000).toFixed(1)}~${(apt.top_floor_offer_high / 10000).toFixed(1)}억` : ""

    const jeonseColor = apt.jeonse_risk_level === "높음" ? "#DC2626" : apt.jeonse_risk_level === "보통" ? "#D97706" : "#16A34A"
    const riskColor   = apt.risk_level === "높음" ? "#DC2626" : apt.risk_level === "보통" ? "#D97706" : "#16A34A"
    const recommendationContext: RecommendationContext = {
      purpose: similarMeta.purpose === "투자" ? "투자" : "실거주",
      timeline: ["3개월", "6개월", "1년", "미정"].includes(similarMeta.timeline) ? similarMeta.timeline as RecommendationContext["timeline"] : "미정",
      horizon: similarMeta.horizon,
      budget: onboardingRef.current?.budget ?? onboarding?.budget ?? 0,
    }
    const recommendationCopy = getRecommendationCopy(recommendationContext)
    const recommendationBadge = recommendationLabel(recommendationContext)
    const topRecommendation = similarApts[0]
    const topBudgetCopy = getBudgetFitCopy(topRecommendation?.budget_fit)

    // displayScore 기준으로 mode 재계산 (마커 색과 일관성 유지)
    const derivedMode = displayScore >= 75 ? "safe"
      : displayScore >= 64 ? "good"
      : displayScore >= 56 ? "neutral"
      : displayScore >= 50 ? "caution"
      : "danger"

    const scoreGrad = displayScore >= 75
      ? "linear-gradient(135deg,#27AE60,#16A34A)"
      : displayScore >= 64 ? "linear-gradient(135deg,#2ECC71,#10B981)"
      : displayScore >= 56 ? "linear-gradient(135deg,#F1C40F,#F59E0B)"
      : displayScore >= 50 ? "linear-gradient(135deg,#E67E22,#F59E0B)"
      : "linear-gradient(135deg,#E74C3C,#DC2626)"

    const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "#6B7280" }}>{label}</span>
        <span style={{ fontWeight: 600, color: color || "#111827" }}>{value}</span>
      </div>
    )

    return (
      <RightPanel>

        {/* 헤더 (고정) */}
        <div style={{
          padding: "0 16px 10px", display: "flex",
          justifyContent: "space-between", alignItems: "flex-start",
          borderBottom: "1px solid #F3F4F6", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, overflowWrap: "break-word", maxWidth: "calc(100vw - 80px)" }}>
              {apt.apt_nm}
            </div>
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
              {apt.sigungu}{apt.umd_nm ? " " + apt.umd_nm : ""}
            </div>
            <TrustStrip
              updatedAt={apt.updatedAt || apt.lastUpdated}
              lastNewsTime={apt.categories?.global?.rawData?.news?.[0]?.pubDate}
              tradeCount={apt.recent_trades?.length}
              confidence={apt.confidence}
              variant="compact"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* 공유 버튼 */}
            <button
              onClick={() => {
                const url = buildShareUrl(apt.apt_id)
                navigator.clipboard.writeText(url).then(() => {
                  setShareToast(true)
                  setTimeout(() => setShareToast(false), 2000)
                }).catch(() => {})
              }}
              title="카톡·문자로 공유"
              style={{
                background: "none", border: "none", fontSize: 18,
                cursor: "pointer", padding: "0 4px", lineHeight: 1,
                display: "flex", alignItems: "center", gap: 2,
              }}
            >🔗 <span style={{ fontSize: 11, color: "#6B7280" }}>공유</span></button>
            {/* 비교 추가/제거 버튼 */}
            {(() => {
              const inCompare = compareList.some(c => c.apt_id === apt.apt_id)
              return (
                <button
                  onClick={() => {
                    if (inCompare) {
                      setCompareList(prev => prev.filter(c => c.apt_id !== apt.apt_id))
                    } else if (compareList.length < 2) {
                      setCompareList(prev => [...prev, apt])
                    } else {
                      alert("비교는 최대 2개까지 선택할 수 있습니다")
                    }
                  }}
                  title={inCompare ? "비교 해제" : "비교에 추가"}
                  style={{
                    background: inCompare ? "#6366F1" : "#F3F4F6",
                    border: "none", borderRadius: 6,
                    fontSize: 11, fontWeight: 700,
                    color: inCompare ? "#fff" : "#374151",
                    cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  {inCompare ? "비교 ✓" : "비교"}
                </button>
              )
            })()}
            <button
              onClick={toggleFav}
              disabled={favLoading}
              title={favId ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1, opacity: favLoading ? 0.5 : 1 }}
            >
              {favId ? "⭐" : "☆"}
            </button>
            <button
              onClick={closePopup}
              aria-label="닫기"
              style={{
                background: "#F3F4F6", border: "none", borderRadius: 10,
                width: 44, height: 44, fontSize: 20, color: "#6B7280",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >×</button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div style={{ overflowY: "auto", padding: "12px 16px 32px", flex: 1, minHeight: 0 }}>

          {/* ── 비교 담기 CTA (핵심 기능 — 항상 상단 고정) ── */}
          {(() => {
            const inCompare = compareList.some(c => c.apt_id === apt.apt_id)
            const full = compareList.length >= 2
            const other = compareList.find(c => c.apt_id !== apt.apt_id)
            const otherName = other ? other.apt_nm.slice(0, 8) + (other.apt_nm.length > 8 ? "…" : "") : ""
            const label = inCompare
              ? full
                ? "🔍 지금 1:1 비교 보기 →"
                : "✓ 비교함에 담김 · 지도에서 비교할 아파트를 하나 더 고르세요"
              : full
                ? `↔ 비교함이 가득 · 이 아파트로 교체하기`
                : other
                  ? `➕ 비교 담기 — ${otherName} vs 이 아파트`
                  : "➕ 이 아파트 비교함에 담기"
            return (
              <button
                onClick={() => {
                  if (inCompare && full) { setShowCompare(true); return }
                  if (inCompare) { setCompareList(prev => prev.filter(c => c.apt_id !== apt.apt_id)); return }
                  if (full) { setCompareList(prev => [prev[0], apt]); return }
                  setCompareList(prev => [...prev, apt])
                }}
                title={inCompare && !full ? "누르면 담기 해제" : undefined}
                style={{
                  position: "sticky", top: 0, zIndex: 5,
                  display: "block", width: "100%", marginBottom: 12,
                  background: inCompare && full ? "#FFD700" : inCompare ? "#EEF2FF" : "#6366F1",
                  color: inCompare && full ? "#1A2B4A" : inCompare ? "#4338CA" : "#fff",
                  border: inCompare && !full ? "1.5px solid #6366F1" : "none",
                  borderRadius: 12, padding: "13px 16px",
                  fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(99,102,241,0.25)",
                }}
              >
                {label}
              </button>
            )
          })()}

          {/* ── 결론 카드 ── */}
          {(() => {
            const v = getVerdict(apt)
            const reasons = getReasons(apt)
            return (
              <div style={{
                background: v.bg, border: `1.5px solid ${v.border}`,
                borderRadius: 14, padding: "14px 16px", marginBottom: 14,
              }}>
                {/* 결론 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{v.emoji}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: v.color, lineHeight: 1.2 }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: v.color, opacity: 0.8, marginTop: 2 }}>{v.sub}</div>
                  </div>
                  {/* 점수 보조 뱃지 */}
                  <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%", background: scoreGrad,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{displayScore}</div>
                      <div style={{ fontSize: 9, opacity: 0.75 }}>/ 100</div>
                    </div>
                    <div style={{ fontSize: 9, color: "#9CA3AF", textAlign: "center" }}>오를지 점수</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: scoreGrad.includes("27AE60") || scoreGrad.includes("2ECC71") ? "#16A34A" : scoreGrad.includes("F1C40F") ? "#D97706" : "#DC2626", textAlign: "center" }}>
                      {derivedMode === "safe" ? "안전" : derivedMode === "good" ? "양호" : derivedMode === "neutral" ? "중립" : derivedMode === "caution" ? "주의" : "위험"}
                    </div>
                  </div>
                </div>

                {/* 이유 3줄 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {reasons.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12 }}>
                      <span style={{ flexShrink: 0, fontWeight: 700, color: r.positive ? "#16A34A" : "#DC2626" }}>
                        {r.positive ? "✓" : "✗"}
                      </span>
                      <span style={{ color: r.positive ? "#166534" : "#991B1B", lineHeight: 1.4 }}>{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── 체크리스트 ── */}
          <ChecklistCard apt={apt} />

          <ExplainabilityCard data={apt} variant="compact" />

          {/* 온보딩 맞춤 컨텍스트 */}
          {onboarding && (() => {
            const msgs: string[] = []

            // 예산
            if (onboarding.budget && apt.price) {
              const diff = apt.price - onboarding.budget
              if (diff > 0) {
                msgs.push(`💸 예산 초과 +${(diff / 10000).toFixed(1)}억`)
              } else {
                msgs.push(`✅ 예산 범위 내 (여유 ${(Math.abs(diff) / 10000).toFixed(1)}억)`)
              }
            }

            // 타임라인
            if (onboarding.timeline === "3개월") msgs.push("⏰ 3개월 내 계약 예정 — 후보를 먼저 좁혀보세요")
            else if (onboarding.timeline === "6개월") msgs.push("📅 6개월 내 계약 — 비교 후 결정하세요")
            else if (onboarding.timeline === "1년") msgs.push("📊 충분히 비교해보세요")

            // 목적별 강조
            if (onboarding.purpose === "실거주") {
              if (apt.jeonse_risk_level === "높음") msgs.push("⚠️ 실거주 기준에서는 전세 리스크를 먼저 확인하는 편이 안전합니다")
            } else if (onboarding.purpose === "투자") {
              if (apt.short_rank?.signal_valid && apt.short_rank.regime === 'up') msgs.push(`📈 6개월 뒤 지역 전망 순위 상위 ${Math.round(apt.short_rank.pct)}%`)
              if (apt.expected_gain) msgs.push("💰 투자 관점: AI 방향 상승 우위 전망")
            }

            if (msgs.length === 0) return null
            return (
              <div style={{
                background: "#F8FAFF", border: "1px solid #DBEAFE",
                borderRadius: 8, padding: "7px 12px", marginBottom: 12,
                display: "flex", flexDirection: "column", gap: 3,
              }}>
                {msgs.map((msg, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "#1E40AF" }}>{msg}</div>
                ))}
              </div>
            )
          })()}

          {/* 정보 행 */}
          <Row label="매매가" value={priceStr} />
          {apt.market_offer_mid_low && (
            <Row label="매물 추정가" value={`${offerStr}${lowFloorStr ? ` / 저층 ${lowFloorStr}` : ""}${topFloorStr ? ` / 꼭대기층 ${topFloorStr}` : ""}`} />
          )}
          {apt.offer_note && (
            <div style={{ margin: "4px 0", fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>{apt.offer_note}</div>
          )}
          {apt.risk_score != null && apt.risk_level != null && (
            <Row label="시장 위험도" value={`${apt.risk_score}점 (${apt.risk_level})`} color={riskColor} />
          )}
          {(() => {
            const trend = calcTrend(apt)
            if (trend.direction === "없음") return null
            const trendColor = trend.direction === "상승" ? "#16A34A" : trend.direction === "하락" ? "#DC2626" : "#6B7280"
            return <Row label="가격 추세 (최근)" value={`${trend.direction}${trend.pct ? " " + trend.pct : ""}`} color={trendColor} />
          })()}
          {apt.jeonse_risk_level && <Row label="전세 위험도" value={apt.jeonse_risk_level} color={jeonseColor} />}

          {/* 행정동 내 순위 — 메인 데이터 도착 즉시 레이아웃 고정해서 "빈 화면" 느낌 제거 */}
          <div style={{
            marginTop: 8, padding: "8px 10px",
            background: "linear-gradient(135deg, #F0F4FF, #E8F0FE)",
            border: "1px solid #C7D9F7",
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", marginBottom: 5 }}>
              📍 이 동네 순위
            </div>
            {aptRankInfo ? (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>가격</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#F59E0B" }}>
                    {aptRankInfo.price_rank_in_umd}
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>
                      /{aptRankInfo.price_total_in_umd}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>동네 비싼순</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>거래량</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#3B82F6" }}>
                    {aptRankInfo.vol_rank_in_umd}
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>
                      /{aptRankInfo.vol_total_in_umd}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>동네 거래많은순</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#9CA3AF", padding: "2px 0" }}>
                불러오는 중...
              </div>
            )}
          </div>

          {/* 🍼 처음 구매자 체크리스트 (하단 패널) */}
          {(!apt.is_presale) && (
            <div style={{
              marginBottom: 12,
              padding: "12px 14px",
              background: "#FEF3C7",
              border: "1px solid #F59E0B",
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>
                🍼 처음 집 사는 분이라면 먼저 확인하세요
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.4, color: "#78350F" }}>
                <div style={{ marginBottom: 2 }}>1. <strong>당신 상황 정리</strong> — 생애 첫 집인가요? 신혼 6년 이내인가요? 신용점수 대략 몇 점대인가요?</div>
                <div style={{ marginBottom: 2 }}>2. <strong>실제 필요 현금 계산</strong> — 매매가 + 취득세 + 중개수수료 + 기타 비용 = 총 소요액. 준비 현금이 얼마나 되나요?</div>
                <div style={{ marginBottom: 2 }}>3. <strong>대출 플랜 세우기</strong> — 신혼 우대 적용? 시중은행 주담대 평균 연 4.3% 수준(2026년 상반기 기준), 은행별 비교 필수. DSR·LTV 확인했나요?</div>
                <div style={{ marginBottom: 2 }}>4. <strong>청약/특공 자격</strong> — 신혼 특별공급, 청약통장 납입액 확인</div>
                <div style={{ marginBottom: 2 }}>5. <strong>계약 전 실사</strong> — 실거래가 vs 호가, 관리비, 하자, 학군/편의시설 현장 확인</div>
                <div>6. <strong>후회 방지 마지막 체크</strong> — 이 집 vs 다른 후보의 후회 확률 비교하기 (이 앱 핵심)</div>
              </div>
              <div style={{ fontSize: 10, color: "#92400E", marginTop: 8, fontWeight: 600 }}>
                이 체크를 마치면 이 아파트의 후회 확률을 다른 후보와 비교해보세요 →
              </div>
            </div>
          )}

          {/* school_score는 시군구 단위 명문학군 지표 (등급 병기 — F2) */}
          {apt.school_score != null && (
            <Row
              label="🎓 학군 등급"
              value={schoolGradeLabel(apt.school_score)
                ? `${schoolGradeLabel(apt.school_score)} · ${apt.school_score}점`
                : `${apt.school_score}점`}
            />
          )}
          {apt.kapt_sale_price != null && <Row label="💰 분양가" value={`${apt.kapt_sale_price.toLocaleString("ko-KR")}만원`} />}
          {(() => {
            const feeDisplay = getSeasonalManagementFeeDisplay(apt)
            if (feeDisplay.rows.length === 0) return null
            return (
              <>
                {feeDisplay.rows.map((row) => (
                  <Row key={row.label} label={row.label} value={row.value} color={row.color} />
                ))}
                {feeDisplay.caption && (
                  <div style={{ marginTop: -2, marginBottom: 6, fontSize: 11, color: "#6B7280", textAlign: "right" }}>
                    {feeDisplay.caption}
                  </div>
                )}
              </>
            )
          })()}
          {apt.kapt_ho_cnt && <Row label="세대수" value={`${apt.kapt_ho_cnt.toLocaleString("ko-KR")}세대`} />}
          {apt.turnover?.turnover_rate_pct != null && (
            <Row
              label="거래회전율 (12개월)"
              value={`${apt.turnover.turnover_rate_pct}%`}
              color={apt.turnover.turnover_rate_pct >= 10 ? "#2ECC71" : apt.turnover.turnover_rate_pct >= 5 ? "#F39C12" : "#E74C3C"}
            />
          )}

          {/* 실거래가 차트 */}
          {!apt.no_trade_data && !apt.is_presale && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F3F4F6" }}>
              <PriceChart aptId={apt.apt_id} initialPyeongs={apt.trade_areas} />
            </div>
          )}

          {/* 최근 실거래 */}
          {!apt.no_trade_data && !apt.is_presale && apt.recent_trades && apt.recent_trades.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 5 }}>최근 실거래</div>
              {apt.recent_trades.map((t, i) => {
                const dt = t.dealType || "매매"
                const badgeColor = dt === "전세" ? "#FBBF24" : dt === "월세" ? "#F97316" : "#3B82F6"
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "#9CA3AF" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor, background: `${badgeColor}22`, borderRadius: 4, padding: "1px 6px", marginRight: 4 }}>{dt}</span>
                      {t.ym} · {t.area_m2}㎡({t.pyeong}평형) {t.floor}층
                    </span>
                    <span style={{ fontWeight: 600 }}>{(t.price_man / 10000).toFixed(1)}억</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 12개월 예측 (무료) */}
          {(() => {
            const p12 = apt.pred_pcts?.["12"]
            if (p12 == null) return null
            const gain12 = apt.price ? Math.round(apt.price * p12 / 100) : null
            const isUp = p12 >= 0
            const sign = isUp ? "+" : ""
            const color = isUp ? "#16A34A" : "#DC2626"
            const icon = isUp ? "📈" : "📉"
            const conf12 = apt.confidence_map?.["12"]
            return (
              <div style={{ color, fontWeight: 700, fontSize: 13, marginTop: 8 }}>
                {icon} 12개월 후 <span style={{ fontWeight: 800 }}>{sign}{p12}%</span>
                {gain12 != null && ` (약 ${sign}${(gain12 / 10000).toFixed(1)}억)`}
                <span style={{ fontWeight: 400, fontSize: 11, color: "#6B7280", marginLeft: 6 }}>· 무료</span>
                {conf12 && <ConfidenceBadge level={conf12} />}
              </div>
            )
          })()}

          {/* 24개월 예상 상승 (유료) */}
          {apt.expected_gain != null && apt.expected_gain > 0 && (() => {
            const paid = userPlan === "subscription" || purchasedAptIds.includes(apt.apt_id)
            return (
              <div
                onClick={() => { if (!paid) { setPaywallOpen(true); setPaywallTrigger("ml-forecast") } }}
                style={{ color: "#16A34A", fontWeight: 700, fontSize: 13, marginTop: 4, cursor: paid ? "default" : "pointer", opacity: paid ? 1 : 0.5, userSelect: paid ? "auto" : "none" }}
              >
                {paid ? "🔥" : "🔒"} 24개월 AI 방향: 상승 우위 전망
                {!paid && <span style={{ fontWeight: 400, fontSize: 11, color: "#6366F1", marginLeft: 6 }}>구매하기</span>}
              </div>
            )
          })()}

          {/* AI 요약 */}
          <div style={{
            marginTop: 12, padding: "10px 12px",
            background: summaryFailed ? "#FFF7ED" : "#F9FAFB", borderRadius: 8,
            fontSize: 12, color: popupSummary ? "#374151" : "#9CA3AF",
            lineHeight: 1.6, textAlign: popupSummary ? "left" : "center",
          }}>
            {popupSummary
              ? <><span style={{ fontWeight: 600, color: "#6366F1" }}>✨ 오를지 AI 요약</span><br />{popupSummary.replace(/\*\*/g, "")}</>
              : summaryFailed
                ? <span style={{ color: "#D97706" }}>☁️ 오를지 AI 요약을 불러오지 못했습니다</span>
                : <><span style={{ fontWeight: 600, color: "#6366F1" }}>✨ 오를지 AI 요약</span><br />
                  <span style={{display:'inline-flex',alignItems:'center'}}>
                    <span className="spin" style={{display:'inline-block',width:10,height:10,border:'1.5px solid #d1d5db',borderTopColor:'#3b82f6',borderRadius:'50%',marginRight:4,animation:'spin 0.7s linear infinite'}}/>
                    로딩중...
                  </span>
                </>}
          </div>

          {/* 📌 임장 비교 — 5km 생활권 근처 매물 */}
          <div style={{ fontSize: 9, color: "#9CA3AF" }}>5km 이내에서 찾은 아파트</div>
          {!similarLoaded && (
            <div style={{ marginTop: 14, fontSize: 12, color: "#9CA3AF", display:'flex', alignItems:'center' }}>
              <span className="spin" style={{display:'inline-block',width:10,height:10,border:'1.5px solid #d1d5db',borderTopColor:'#3b82f6',borderRadius:'50%',marginRight:4,animation:'spin 0.7s linear infinite'}}/>
              비슷한 매물 추천 불러오는 중...
            </div>
          )}
          {similarLoaded && similarApts.length === 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: "#9CA3AF" }}>
              5km 이내 비슷한 매물이 없습니다.
            </div>
          )}
          {similarApts.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px solid #E5E7EB" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#374151", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{recommendationCopy.headerTitle}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>
                  ({recommendationBadge})
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 10, lineHeight: 1.5 }}>
                {recommendationCopy.headerDescription}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {similarApts.map((s) => {
                const url = buildDashboardUrl({
                  aptId: s.apt_id,
                  aptName: s.apt_nm,
                  address: [s.sigungu_nm, s.umd_nm].filter(Boolean).join(" "),
                  lawdCd: apt.sigungu_cd,
                })
                const priceStr = s.latest_price
                  ? s.latest_price >= 10000
                    ? `${(s.latest_price / 10000).toFixed(1)}억`
                    : `${s.latest_price.toLocaleString()}만`
                  : "-"
                const isSame = s.region_type === "same_sigungu"
                const diffColor = (s.score_diff ?? 0) >= 0 ? "#16A34A" : "#DC2626"
                const diffIcon = (s.score_diff ?? 0) >= 0 ? "↑" : "↓"
                const distVal = s.distance_km != null ? Number(s.distance_km) : null
                const distStr = distVal != null ? `${distVal.toFixed(1)}km` : ""
                const labelText = distVal != null
                  ? (distVal < 2.5 ? "인근" : (isSame ? "같은 구" : "근처"))
                  : (isSame ? "같은 구" : "근처")
                const selectedPrediction = s.predicted_change_selected
                const similarPriceDisplay = getSimilarPriceDisplay({
                  basePrice: apt.price,
                  similar: s,
                  purpose: recommendationContext.purpose === "투자" ? "투자" : "실거주",
                })
                const badgeScore = s.display_score ?? s.oreulji_score ?? 0
                return (
                  <a
                    key={s.apt_id}
                    href={url}
                    target="_blank"
                    onClick={() => {
                      void trackAnalyticsEvent({
                        eventType: "recommendation_click",
                        funnel: "consumer",
                        source: "map-recommendation-list",
                        aptId: s.apt_id,
                        aptName: s.apt_nm,
                        meta: {
                          regionType: s.region_type ?? null,
                        },
                      })
                    }}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", borderRadius: 10,
                      background: isSame ? "#F0FDF4" : "#FFF7ED",
                      border: `1px solid ${isSame ? "#BBF7D0" : "#FED7AA"}`,
                    }}>
                      {/* 점수 */}
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: badgeScore >= 75 ? "#16A34A" : badgeScore >= 56 ? "#F59E0B" : "#DC2626",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0,
                      }}>
                        {badgeScore}
                      </div>
                      {/* 정보 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.apt_nm}</span>
                          {distStr && (
                            <span style={{ fontSize: 9, color: isSame ? "#15803D" : "#EA580C", background: isSame ? "#BBF7D0" : "#FED7AA", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              {labelText} {distStr}
                            </span>
                          )}
                          {!distStr && isSame && (
                            <span style={{ fontSize: 9, color: "#15803D", background: "#BBF7D0", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              같은 구
                            </span>
                          )}
                          {s.budget_fit === "within" && (
                            <span style={{ fontSize: 9, color: "#1D4ED8", background: "#DBEAFE", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              예산 적합
                            </span>
                          )}
                          {s.budget_fit === "stretch" && (
                            <span style={{ fontSize: 9, color: "#B45309", background: "#FDE68A", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                              예산 살짝 초과
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                          {s.sigungu_nm} {s.umd_nm} · {priceStr} · {s.build_year || "-"}년
                        </div>
                        {getRecommendationReasonLine({
                          context: recommendationContext,
                          budgetFit: s.budget_fit,
                          personalizationReason: s.personalization_reason,
                          selectedPrediction,
                        }) && (
                          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
                            {getRecommendationReasonLine({
                              context: recommendationContext,
                              budgetFit: s.budget_fit,
                              personalizationReason: s.personalization_reason,
                              selectedPrediction,
                            })}
                          </div>
                        )}
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#3730A3", marginTop: 5 }}>
                          {getBudgetFitCopy(s.budget_fit).itemAction} →
                        </div>
                      </div>
                      {/* 점수 차이 + 예상 변동액 */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: diffColor }}>
                          {(s.score_diff ?? 0) === 0 ? "점수 동급" : `${diffIcon} ${Math.abs(s.score_diff ?? 0)}점`}
                        </div>
                        {(() => {
                          const baseR = popupApt ? (popupApt.downside_regret_prob ?? popupApt.regret_prob ?? null) : (typeof apt !== "undefined" && apt ? (apt.downside_regret_prob ?? apt.regret_prob ?? null) : null)
                          const simR = s.downside_regret_prob ?? s.regret_prob ?? null
                          if (baseR != null && simR != null) {
                            const rd = Math.round((simR - baseR) * 100)
                            const better = rd < 0
                            return (
                              <div style={{ fontSize: 10, fontWeight: 700, color: better ? "#16A34A" : "#DC2626", marginTop: 1 }}>
                                후회 {better ? "" : "+"}{rd}p {better ? "↓" : "↑"}
                              </div>
                            )
                          }
                          return null
                        })()}
                        {similarPriceDisplay.primary && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: similarPriceDisplay.primary.color }}>
                            {similarPriceDisplay.primary.text}
                          </div>
                        )}
                        {similarPriceDisplay.secondary && (
                          <div style={{ fontSize: 9, color: "#9CA3AF" }}>
                            {similarPriceDisplay.secondary}
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                )
              })}
              </div>
            </div>
          )}

          {/* 대출 계산기 */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F3F4F6" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 8 }}>🏦 대출 계산기</div>
            <LoanCalculator defaultPrice={apt.price} compact />
          </div>

          {/* 단건 구매 버튼 — 비구독·미구매 시 노출 */}
          {userPlan !== "subscription" && !purchasedAptIds.includes(apt.apt_id) && (
            <button
              onClick={() => { setPaywallTrigger("ml-forecast"); setPaywallOpen(true) }}
              style={{
                display: "block", width: "100%", marginTop: 12, padding: "12px 0",
                background: "linear-gradient(135deg,#16A34A,#15803D)", color: "#fff",
                borderRadius: 10, textAlign: "center",
                fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
              }}
            >
              🔍 이 아파트 심층 분석 구매 — 9,900원
            </button>
          )}
          {/* 이미 구매한 아파트 */}
          {userPlan !== "subscription" && purchasedAptIds.includes(apt.apt_id) && (
            <div style={{
              marginTop: 12, padding: "10px 0", background: "#F0FDF4",
              border: "1px solid #BBF7D0", borderRadius: 10,
              textAlign: "center", fontSize: 13, fontWeight: 700, color: "#16A34A",
            }}>
              ✅ 구매한 아파트 — 심층 분석 이용 가능
            </div>
          )}

          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            <a
              href={dashboardUrl}
              target="_blank"
              style={{
                display: "block", padding: "12px 14px",
                background: "#6366F1", color: "#fff",
                borderRadius: 12, textAlign: "center",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}
            >
              {recommendationCopy.mapPrimaryCta}
            </a>
            {topRecommendation && (
              <button
                onClick={() => openTopRecommendationCompare(apt, topRecommendation)}
                disabled={compareLoadingId === topRecommendation.apt_id}
                style={{
                  display: "block", padding: "11px 14px",
                  background: "#F8FAFF", color: "#3730A3",
                  border: "1px solid #C7D2FE",
                  borderRadius: 12, textAlign: "center",
                  fontSize: 12, fontWeight: 700,
                  cursor: compareLoadingId === topRecommendation.apt_id ? "wait" : "pointer",
                  opacity: compareLoadingId === topRecommendation.apt_id ? 0.7 : 1,
                }}
              >
                {compareLoadingId === topRecommendation.apt_id ? "추천 1위 비교 준비중..." : topBudgetCopy.mapCompareCta}
              </button>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "#9CA3AF", textAlign: "center" }}>
            시도 단위 {horizon}개월 예측 · 오를지 엔진
          </div>
        </div>
      </RightPanel>
    )
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* 단건 결제 모달 */}
      {paywallOpen && popupApt && (
        <PaywallModal
          aptName={popupApt.apt_nm}
          aptId={popupApt.apt_id}
          lawdCd={popupApt.sigungu_cd}
          aptPrice={popupApt.price ?? undefined}
          trigger={paywallTrigger}
          onClose={() => setPaywallOpen(false)}
          onSuccess={({ type }) => {
            setPaywallOpen(false)
            if (type === "once") {
              setPurchasedAptIds(prev => [...prev, popupApt.apt_id])
            } else {
              setUserPlan("subscription")
            }
          }}
        />
      )}

      {/* 검색바 — 상단 중앙 */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
        width: "min(360px, calc(100vw - 24px))", zIndex: 200,
      }}>
        <MapSearchBar onSelect={handleSearchSelect} />
      </div>

      {/* 예산 필터 활성 배지 */}
      {onboarding?.budget && onboarding.budget > 0 && (
        <div style={{
          position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, display: "flex", alignItems: "center", gap: 6,
          background: "rgba(17,24,39,0.88)", backdropFilter: "blur(8px)",
          borderRadius: 20, padding: "5px 10px 5px 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#FCD34D" }}>
            예산 {(onboarding.budget / 10000).toFixed(0)}억 이내 필터 적용 중
          </span>
          <button
            onClick={() => {
              onClearFilter?.()
              setTimeout(() => loadMarkers(), 50)
            }}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: 12, padding: "2px 8px",
              fontSize: 11, fontWeight: 700, color: "#fff",
              cursor: "pointer",
            }}
          >
            해제
          </button>
        </div>
      )}

      <div style={{
        position: "absolute",
        top: 66,
        left: 8,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        maxWidth: "calc(100vw - 24px)",
      }}>
        {/* 구 위험도 HUD — 좌상단 */}
        {district && !hudVisible && (
          <button
            onClick={() => setHudVisible(true)}
            style={{
              background: "rgba(17,24,39,0.88)", backdropFilter: "blur(8px)",
              border: `1.5px solid ${district.color}`, borderRadius: 20,
              padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            📊 지역 점수 보기
          </button>
        )}
        {district && hudVisible && (
          <div style={{
            background: "rgba(17,24,39,0.88)", backdropFilter: "blur(8px)",
            borderRadius: 10, padding: "8px 10px",
            border: `1.5px solid ${district.color}`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            fontFamily: "inherit", maxWidth: "calc(100vw - 80px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: "#6B7280", letterSpacing: "0.05em" }}>
                  📊 {horizon}개월 뒤 위험도
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2 }}>
                  {district.display || `${district.sido_nm} ${district.sigungu_nm}`}
                </div>
              </div>
              <button
                onClick={() => setHudVisible(false)}
                style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{
                background: district.color, color: "#fff",
                borderRadius: 5, padding: "2px 8px", fontSize: 12, fontWeight: 700,
              }}>
                {district.label}
              </span>
              <span style={{ fontSize: 12, color: "#E5E7EB", fontWeight: 600 }}>
                {district.avg_score}점
              </span>
              <span style={{ fontSize: 10, color: "#9CA3AF" }}>
                상위 <span style={{ color: "#60A5FA" }}>{district.top_pct}%</span>
              </span>
            </div>
          </div>
        )}

        {/* ── 레벨별 필터 칩 (좌상단) ── */}
        <div style={{
          display: "flex", gap: 4,
          flexWrap: "wrap",
          maxWidth: "calc(100vw - 96px)",
        }}>
          {(FILTER_LEVELS as readonly string[]).map(level => {
            const active = filterLevels[level]
            const COLOR: Record<string, string> = {
              safe: "#2ECC71", good: "#27AE60", neutral: "#F39C12", caution: "#E67E22", danger: "#E74C3C",
            }
            const LABEL: Record<string, string> = {
              safe: "75+", good: "64+", neutral: "56+", caution: "50+", danger: "50↓",
            }
            return (
              <button
                key={level}
                onClick={() => setFilterLevels(prev => ({ ...prev, [level]: !prev[level] }))}
                style={{
                  background: active ? COLOR[level] : "rgba(107,114,128,0.55)",
                  border: active ? `2px solid ${COLOR[level]}` : "2px solid rgba(107,114,128,0.2)",
                  borderRadius: 14,
                  padding: "4px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  opacity: active ? 1 : 0.35,
                  transition: "all 0.15s ease",
                  lineHeight: 1,
                }}
              >
                {LABEL[level]}
              </button>
            )
          })}
        </div>

        {/* 랭킹 패널 */}
        <RankingPanel onSelectApt={(apt_id, apt_nm, lat, lon, sigungu_cd) => {
          handleSearchSelect({ apt_id, apt_nm, lat, lon, sigungu_cd })
        }} />
      </div>

      {/* 비교 플로팅 버튼 */}
      {compareList.length > 0 && (
        <div style={{
          position: "fixed", bottom: popupApt ? "calc(70vh + 12px)" : 20,
          left: "50%", transform: "translateX(-50%)",
          zIndex: 1100, display: "flex", alignItems: "center", gap: 8,
          background: "#1A2B4A", borderRadius: 24,
          padding: "10px 18px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            비교 {compareList.length}/2
            {compareList.map(c => (
              <span key={c.apt_id} style={{ marginLeft: 4, color: "#FFD700", fontSize: 11 }}>
                {c.apt_nm.slice(0, 6)}{c.apt_nm.length > 6 ? "…" : ""}
              </span>
            ))}
            {compareList.length === 2 && (() => {
              const [x, y] = compareList
              const dx = x.downside_regret_prob ?? x.regret_prob ?? null
              const dy = y.downside_regret_prob ?? y.regret_prob ?? null
              if (dx != null && dy != null) {
                const d = Math.round(Math.abs(dx - dy) * 100)
                const betterFirst = dx <= dy
                return (
                  <span style={{ color: "#67E8F9", fontSize: 10, fontWeight: 600, marginLeft: 6 }}>
                    후회 {betterFirst ? "A" : "B"}가 {d}p 낮음
                  </span>
                )
              }
              return null
            })()}
          </span>
          {compareList.length === 2 && (
            <button
              onClick={() => setShowCompare(true)}
              style={{
                background: "#FFD700", border: "none", borderRadius: 12,
                padding: "5px 12px", fontSize: 12, fontWeight: 800,
                color: "#1A2B4A", cursor: "pointer",
              }}
            >
              비교 보기
            </button>
          )}
          <button
            onClick={() => setCompareList([])}
            style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
          >×</button>
        </div>
      )}

      {/* 공유 토스트 */}
      {shareToast && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          background: "#1A2B4A", color: "#fff",
          padding: "8px 20px", borderRadius: 20,
          fontSize: 13, fontWeight: 600, zIndex: 3000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}>
          🔗 카톡·문자로 공유할 수 있습니다
        </div>
      )}

      {/* 비교 시트 */}
      {showCompare && compareList.length === 2 && (
        <CompareSheet
          apts={compareList as [AptDetail, AptDetail]}
          onClose={() => setShowCompare(false)}
        />
      )}

      {auctionDetail && (
        <AuctionPanel
          detail={auctionDetail}
          onClose={() => setAuctionDetail(null)}
          budgetManwon={
            auctionBudgetEok != null && auctionBudgetEok > 0
              ? eokToManwon(auctionBudgetEok)
              : null
          }
          budgetDelta={auctionBudgetDelta ?? DEFAULT_BUDGET_DELTA}
        />
      )}

      {/* 바텀 시트 */}
      {renderBottomSheet()}
    </div>
  )
}

function ConfidenceBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    "높음": { color: "#065F46", bg: "#D1FAE5", label: "높은 신뢰도" },
    "보통": { color: "#92400E", bg: "#FEF3C7", label: "보통 신뢰도" },
    "낮음": { color: "#9A3412", bg: "#FFEDD5", label: "낮은 신뢰도" },
  }
  const c = config[level] || config["보통"]
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10,
      fontWeight: 600,
      color: c.color,
      background: c.bg,
      padding: "1px 6px",
      borderRadius: 4,
      marginLeft: 6,
      verticalAlign: "middle",
    }}>
      {c.label}
    </span>
  )
}

function getSeasonalNote(): { icon: string; text: string } | null {
  const month = new Date().getMonth() + 1  // 1-12
  if (month >= 2 && month <= 3) {
    return { icon: "📅", text: "현재는 학군 수요 성수기(2-3월)로 계절적 상승 압력이 있습니다" }
  }
  if (month >= 6 && month <= 8) {
    return { icon: "📅", text: "여름 비수기(6-8월)로 거래량이 감소할 수 있습니다" }
  }
  if (month === 12) {
    return { icon: "📅", text: "연말 세금 이슈로 급매물 출회 가능성이 있습니다" }
  }
  return { icon: "📅", text: "AI 모델이 최근 3년 동월 거래 패턴(계절성)을 반영한 점수입니다" }
}
