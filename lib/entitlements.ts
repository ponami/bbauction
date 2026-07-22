import { prisma } from "@/lib/prisma"
import { ENTITLEMENT_LIMITS, getEntitlementLabel, type EntitlementKey } from "@/lib/planLimits"
import { isRecurringAccessActive } from "@/lib/paymentManagement"

export interface ResolvedEntitlements {
  key: EntitlementKey
  label: string
  rawPlan: string
  source: "none" | "purchase" | "legacy_subscription" | "agent"
  limits: typeof ENTITLEMENT_LIMITS[EntitlementKey]
  features: {
    canAccessConsumerReports: boolean
    canAccessAgentCrm: boolean
    canUsePushAlerts: boolean
    deepAnalysisMode: "none" | "single_purchase" | "unlimited"
  }
}

export async function resolveUserEntitlements(userId: string): Promise<ResolvedEntitlements> {
  const now = new Date()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      purchases: {
        where: { status: "paid" },
        take: 1,
      },
      agencyOwner: true,
      agencyMembership: {
        include: { team: true },
      },
    },
  })

  if (!user) {
    return buildEntitlements("free", "free", "none", "none")
  }

  const activeAgencyTeam = user.agencyOwner && isRecurringAccessActive(user.agencyOwner.status, user.agencyOwner.endAt, now)
    ? user.agencyOwner
    : user.agencyMembership?.team && isRecurringAccessActive(user.agencyMembership.team.status, user.agencyMembership.team.endAt, now)
    ? user.agencyMembership.team
    : null

  if (activeAgencyTeam) {
    return buildEntitlements("agent_pro", user.plan, "agent", "unlimited")
  }

  if (user.plan === "subscription" && user.subscription && isRecurringAccessActive(user.subscription.status, user.subscription.endAt, now)) {
    return buildEntitlements("consumer_once", user.plan, "legacy_subscription", "unlimited")
  }

  if (user.purchases.length > 0) {
    return buildEntitlements("consumer_once", user.plan, "purchase", "single_purchase")
  }

  return buildEntitlements("free", user.plan, "none", "none")
}

function buildEntitlements(
  key: EntitlementKey,
  rawPlan: string,
  source: ResolvedEntitlements["source"],
  deepAnalysisMode: ResolvedEntitlements["features"]["deepAnalysisMode"],
): ResolvedEntitlements {
  const baseLimits = ENTITLEMENT_LIMITS[key]
  const limits = source === "legacy_subscription"
    ? { ...baseLimits, maxFavorites: 100, maxSavedReports: 100, monthlyDeepAnalysis: null, pushAlerts: true }
    : baseLimits
  return {
    key,
    label: getEntitlementLabel(key),
    rawPlan,
    source,
    limits,
    features: {
      canAccessConsumerReports: key !== "free",
      canAccessAgentCrm: key === "agent_solo" || key === "agent_pro" || key === "agent_office",
      canUsePushAlerts: limits.pushAlerts || source === "legacy_subscription",
      deepAnalysisMode,
    },
  }
}
