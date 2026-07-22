import { getBillingSkuConfig, type BillingSku } from "@/lib/planLimits"

export type AnalyticsFunnel = "consumer" | "agent"

export type AnalyticsEventType =
  | "landing_view"
  | "landing_cta_click"
  | "recommendation_click"
  | "compare_entry"
  | "share_click"
  | "share_success"
  | "paywall_view"
  | "product_select"
  | "payment_complete"
  // Phase 1: 워치리스트/결정
  | "watchlist_created"
  | "watchlist_categorized"
  | "decision_recorded"
  // Phase 2: 알림/행동
  | "alert_action_click"
  | "risk_alert_open"
  // Phase 4: 공유 퍼널
  | "share_link_view"
  | "referral_share_sent"
  | "referral_joined"

export type AnalyticsMetaValue = string | number | boolean | null
export type AnalyticsMeta = Record<string, AnalyticsMetaValue>

export interface AnalyticsEventPayload {
  eventType: AnalyticsEventType
  funnel: AnalyticsFunnel
  source: string
  sessionId?: string
  path?: string
  trigger?: string
  sku?: BillingSku
  aptId?: number
  aptName?: string
  meta?: AnalyticsMeta
}

export interface AnalyticsStepSummary {
  key: AnalyticsEventType
  label: string
  events: number
  sessions: number
  conversionRate: number | null
}

export interface AnalyticsTrendPoint {
  date: string
  paywallView: number
  productSelect: number
  paymentComplete: number
}

export interface AnalyticsRecentEvent {
  id: string
  createdAt: string
  funnel: AnalyticsFunnel
  label: string
  source: string
  sku?: BillingSku
}

export interface AnalyticsFunnelSummary {
  funnel: AnalyticsFunnel
  label: string
  totalEvents: number
  uniqueSessions: number
  estimatedRevenue: number
  steps: AnalyticsStepSummary[]
  trend: AnalyticsTrendPoint[]
  topSkus: Array<{ sku: BillingSku; count: number }>
}

export interface AnalyticsSummary {
  rangeDays: number
  generatedAt: string
  recentEvents: AnalyticsRecentEvent[]
  funnels: Record<AnalyticsFunnel, AnalyticsFunnelSummary>
}

export const ANALYTICS_EVENT_ORDER: AnalyticsEventType[] = [
  "landing_view",
  "landing_cta_click",
  "recommendation_click",
  "compare_entry",
  "share_click",
  "share_success",
  "paywall_view",
  "product_select",
  "payment_complete",
  "watchlist_created",
  "watchlist_categorized",
  "decision_recorded",
  "alert_action_click",
  "risk_alert_open",
  "share_link_view",
  "referral_share_sent",
  "referral_joined",
]

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventType, string> = {
  landing_view: "랜딩 노출",
  landing_cta_click: "랜딩 CTA 클릭",
  recommendation_click: "추천 클릭",
  compare_entry: "비교 진입",
  share_click: "공유 클릭",
  share_success: "공유 성공",
  paywall_view: "유료 전환 노출",
  product_select: "상품 선택",
  payment_complete: "결제 완료",
  watchlist_created: "워치리스트 생성",
  watchlist_categorized: "워치리스트 카테고리 지정",
  decision_recorded: "결정 기록",
  alert_action_click: "행동형 알림 클릭",
  risk_alert_open: "리스크 알림 열람",
  share_link_view: "공유 링크 열람",
  referral_share_sent: "추천 공유 전송",
  referral_joined: "추천 가입",
}

const SESSION_KEY = "orulzi_analytics_session_id"

function buildSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") return ""
  const existing = window.localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const next = buildSessionId()
  window.localStorage.setItem(SESSION_KEY, next)
  return next
}

export function resolveAnalyticsFunnelForSku(sku: BillingSku): AnalyticsFunnel {
  const config = getBillingSkuConfig(sku)
  return config?.entitlementKey.startsWith("agent") ? "agent" : "consumer"
}

export async function trackAnalyticsEvent(payload: AnalyticsEventPayload) {
  if (typeof window === "undefined") return

  const body = JSON.stringify({
    ...payload,
    sessionId: payload.sessionId || getAnalyticsSessionId(),
    path: payload.path || window.location.pathname,
  })

  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const ok = navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }))
      if (ok) return
    }

    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
  } catch {
    // 측정 실패는 사용자 흐름을 막지 않는다.
  }
}
