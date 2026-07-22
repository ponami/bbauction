// GET /api/payments/status

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserPlan } from "@/lib/userTier"
import { getSessionUser } from "@/lib/getSessionUser"
import { resolveUserEntitlements } from "@/lib/entitlements"
import { resolveBillingProvider } from "@/lib/paymentManagement"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({
        plan: "free",
        entitlements: { reports: 0, hasUnlimited: false },
        subscription: null,
        purchases: [],
      })
    }

    const plan = await getUserPlan(user.id)
    const entitlements = await resolveUserEntitlements(user.id)
    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } })
    const purchases = await prisma.purchase.findMany({
      where: { userId: user.id, status: "paid" },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      plan,
      entitlements,
      subscription: subscription ? {
        status: subscription.status,
        startAt: subscription.startAt,
        endAt: subscription.endAt,
        billingProvider: resolveBillingProvider(subscription),
      } : null,
      purchases: purchases.map((p) => ({ aptId: p.aptId, aptName: p.aptName, lawdCd: p.lawdCd, purchasedAt: p.createdAt })),
    })
  } catch (e) {
    console.error("[/api/payments/status] error, returning safe default:", e)
    return NextResponse.json({
      plan: "free",
      entitlements: { reports: 0, hasUnlimited: false },
      subscription: null,
      purchases: [],
    })
  }
}
