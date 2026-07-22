export type EntitlementKey = "free" | "consumer_once" | "agent_solo" | "agent_pro" | "agent_office"
export type BillingSku =
  | "single-report"
  | "compare-pack"
  | "first-home-pack"
  | "agent-solo"
  | "agent-pro"
  | "agent-office"
  | "legacy-subscription"

export interface EntitlementLimits {
  maxFavorites: number
  maxSavedReports: number
  maxClients: number
  monthlyDeepAnalysis: number | null
  shareLinks: "none" | "limited" | "unlimited"
  pushAlerts: boolean
}

export interface BillingSkuConfig {
  sku: BillingSku
  title: string
  amount: number
  billingKind: "consumer" | "agent" | "legacy"
  storageType: "once" | "agency" | "subscription"
  entitlementKey: EntitlementKey
  availableOnline: boolean
  requiresApt: boolean
  successTitle: string
  successDescription: string
}

export const ENTITLEMENT_LIMITS: Record<EntitlementKey, EntitlementLimits> = {
  free: {
    maxFavorites: 7,
    maxSavedReports: 0,
    maxClients: 0,
    monthlyDeepAnalysis: 0,
    shareLinks: "limited",
    pushAlerts: false,
  },
  consumer_once: {
    maxFavorites: 20,
    maxSavedReports: 5,
    maxClients: 0,
    monthlyDeepAnalysis: 0,
    shareLinks: "limited",
    pushAlerts: false,
  },
  agent_solo: {
    maxFavorites: 100,
    maxSavedReports: 50,
    maxClients: 20,
    monthlyDeepAnalysis: null,
    shareLinks: "unlimited",
    pushAlerts: true,
  },
  agent_pro: {
    maxFavorites: 500,
    maxSavedReports: 200,
    maxClients: 200,
    monthlyDeepAnalysis: null,
    shareLinks: "unlimited",
    pushAlerts: true,
  },
  agent_office: {
    maxFavorites: 1000,
    maxSavedReports: 1000,
    maxClients: 1000,
    monthlyDeepAnalysis: null,
    shareLinks: "unlimited",
    pushAlerts: true,
  },
}

export const BILLING_SKUS: Record<BillingSku, BillingSkuConfig> = {
  "single-report": {
    sku: "single-report",
    title: "단일 단지 심층 리포트",
    amount: parseInt(process.env.PRICE_SINGLE_REPORT ?? process.env.PRICE_ONCE ?? "9900"),
    billingKind: "consumer",
    storageType: "once",
    entitlementKey: "consumer_once",
    availableOnline: true,
    requiresApt: true,
    successTitle: "단일 단지 리포트가 열렸습니다!",
    successDescription: "현재 보고 있는 단지 기준으로 결론형 리포트를 바로 확인할 수 있습니다.",
  },
  "compare-pack": {
    sku: "compare-pack",
    title: "비교 리포트",
    amount: parseInt(process.env.PRICE_COMPARE_PACK ?? "19900"),
    billingKind: "consumer",
    storageType: "once",
    entitlementKey: "consumer_once",
    availableOnline: true,
    requiresApt: true,
    successTitle: "비교 리포트가 열렸습니다!",
    successDescription: "현재 단지를 기준으로 비교팩 접근 권한이 열렸습니다.",
  },
  "first-home-pack": {
    sku: "first-home-pack",
    title: "신혼부부·생애첫매수 판단팩",
    amount: parseInt(process.env.PRICE_FIRST_HOME_PACK ?? "29000"),
    billingKind: "consumer",
    storageType: "once",
    entitlementKey: "consumer_once",
    availableOnline: true,
    requiresApt: true,
    successTitle: "첫 매수 판단팩이 열렸습니다!",
    successDescription: "신축/구축, 예산, 실거주 기준을 현재 단지에 맞춰 바로 확인할 수 있습니다.",
  },
  "agent-solo": {
    sku: "agent-solo",
    title: "Agent Solo",
    amount: parseInt(process.env.PRICE_AGENT_SOLO ?? "39000"),
    billingKind: "agent",
    storageType: "agency",
    entitlementKey: "agent_solo",
    availableOnline: false,
    requiresApt: false,
    successTitle: "Agent Solo가 시작됐습니다!",
    successDescription: "1인 중개사용 기본 CRM과 상담 공유 기능을 바로 사용할 수 있습니다.",
  },
  "agent-pro": {
    sku: "agent-pro",
    title: "Agent Pro",
    amount: parseInt(process.env.PRICE_AGENT_PRO ?? process.env.PRICE_AGENCY ?? "69000"),
    billingKind: "agent",
    storageType: "agency",
    entitlementKey: "agent_pro",
    availableOnline: false,
    requiresApt: false,
    successTitle: "Agent Pro가 시작됐습니다!",
    successDescription: "고객 CRM, 팀 사용, 공유 링크 기능을 바로 사용할 수 있습니다.",
  },
  "agent-office": {
    sku: "agent-office",
    title: "Agent Office",
    amount: parseInt(process.env.PRICE_AGENT_OFFICE ?? "149000"),
    billingKind: "agent",
    storageType: "agency",
    entitlementKey: "agent_office",
    availableOnline: false,
    requiresApt: false,
    successTitle: "Agent Office가 시작됐습니다!",
    successDescription: "사무소 단위 운영용 권한과 더 큰 고객 한도가 준비되었습니다.",
  },
  "legacy-subscription": {
    sku: "legacy-subscription",
    title: "개인 무제한 탐색",
    amount: parseInt(process.env.PRICE_SUBSCRIPTION ?? "29900"),
    billingKind: "legacy",
    storageType: "subscription",
    entitlementKey: "consumer_once",
    availableOnline: false,
    requiresApt: false,
    successTitle: "개인 무제한 탐색이 시작됐습니다!",
    successDescription: "기존 개인 구독 사용자는 그대로 무제한 탐색 권한을 유지합니다.",
  },
}

export function normalizeBillingSku(value: string | null | undefined): BillingSku | null {
  if (!value) return null
  if (value === "once") return "single-report"
  if (value === "subscription") return "legacy-subscription"
  if (value === "agency") return "agent-pro"
  return value in BILLING_SKUS ? (value as BillingSku) : null
}

export function getBillingSkuConfig(value: string | null | undefined): BillingSkuConfig | null {
  const sku = normalizeBillingSku(value)
  return sku ? BILLING_SKUS[sku] : null
}

export function getEntitlementLabel(key: EntitlementKey) {
  switch (key) {
    case "consumer_once":
      return "소비자 1회 결제"
    case "agent_solo":
      return "Agent Solo"
    case "agent_pro":
      return "Agent Pro"
    case "agent_office":
      return "Agent Office"
    default:
      return "무료"
  }
}

// Play Store 등록 전략: consumer once 상품만 Android에서 판매
// agency/subscription은 legacy 문의형 (availableOnline: false)
export const CONSUMER_ONLY_ANDROID = true

/**
 * Play Store 등록용 명시적 Consumer SKU 목록
 * - Android에서는 이 SKU들만 Google Play Billing으로 판매
 * - agent-* 와 legacy-* 는 availableOnline: false 로 이미 차단
 * - 신규로 추가할 consumer 상품은 여기 + BILLING_SKUS에만 추가
 */
export const CONSUMER_SKUS = [
  "single-report",
  "compare-pack",
  "first-home-pack",
] as const

export type ConsumerSku = (typeof CONSUMER_SKUS)[number]

export function isConsumerSku(value: string | null | undefined): value is ConsumerSku {
  if (!value) return false
  const normalized = normalizeBillingSku(value)
  return normalized ? CONSUMER_SKUS.includes(normalized as ConsumerSku) : false
}

/**
 * Android에서 현재 판매 가능한 consumer SKU인지 (Play Store 정책)
 */
export function isAndroidConsumerSku(value: string | null | undefined): boolean {
  return isConsumerSku(value)
}
