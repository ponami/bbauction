export type BillingProvider = "web" | "google_play" | null

export function resolveBillingProvider(record: {
  googlePurchaseToken?: string | null
  portonePaymentId?: string | null
}): BillingProvider {
  if (record.googlePurchaseToken) return "google_play"
  if (record.portonePaymentId) return "web"
  return null
}

export function isRecurringAccessActive(status: string, endAt: Date, now = new Date()) {
  return (status === "active" || status === "cancelled") && endAt > now
}

export function buildGooglePlayManageUrl(productId: string) {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "com.orulzi.app"
  const params = new URLSearchParams({
    sku: productId,
    package: packageName,
  })

  return `https://play.google.com/store/account/subscriptions?${params.toString()}`
}

export function getGooglePlayProductId(target: "subscription" | "agency") {
  return target === "subscription" ? "legacy_subscription" : "agent_pro"
}
