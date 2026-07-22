import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/getSessionUser"
import {
  buildGooglePlayManageUrl,
  getGooglePlayProductId,
  isRecurringAccessActive,
  resolveBillingProvider,
} from "@/lib/paymentManagement"

function serializeSubscription(subscription: {
  status: string
  startAt: Date
  endAt: Date
  googlePurchaseToken?: string | null
  portonePaymentId?: string | null
}) {
  return {
    status: subscription.status,
    startAt: subscription.startAt,
    endAt: subscription.endAt,
    billingProvider: resolveBillingProvider(subscription),
  }
}

function serializeAgencyTeam(team: {
  status: string
  startAt: Date
  endAt: Date
  googlePurchaseToken?: string | null
  portonePaymentId?: string | null
}) {
  return {
    status: team.status,
    startAt: team.startAt,
    endAt: team.endAt,
    billingProvider: resolveBillingProvider(team),
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const target = body?.target as "subscription" | "agency" | undefined

  if (target !== "subscription" && target !== "agency") {
    return NextResponse.json({ error: "유효한 취소 대상이 필요합니다" }, { status: 400 })
  }

  if (target === "subscription") {
    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } })
    if (!subscription || !isRecurringAccessActive(subscription.status, subscription.endAt)) {
      return NextResponse.json({ error: "활성 구독이 없습니다" }, { status: 404 })
    }

    const provider = resolveBillingProvider(subscription)
    if (provider === "google_play") {
      return NextResponse.json({
        success: true,
        provider,
        managementUrl: buildGooglePlayManageUrl(getGooglePlayProductId("subscription")),
        subscription: serializeSubscription(subscription),
      })
    }

    if (provider !== "web") {
      return NextResponse.json({ error: "구독 결제 수단을 확인할 수 없습니다" }, { status: 400 })
    }

    const updated = subscription.status === "cancelled"
      ? subscription
      : await prisma.subscription.update({
          where: { userId: user.id },
          data: { status: "cancelled" },
        })

    return NextResponse.json({
      success: true,
      provider,
      subscription: serializeSubscription(updated),
    })
  }

  const team = await prisma.agencyTeam.findUnique({ where: { ownerId: user.id } })
  if (!team || !isRecurringAccessActive(team.status, team.endAt)) {
    return NextResponse.json({ error: "활성 중개사 구독이 없습니다" }, { status: 404 })
  }

  const provider = resolveBillingProvider(team)
  if (provider === "google_play") {
    return NextResponse.json({
      success: true,
      provider,
      managementUrl: buildGooglePlayManageUrl(getGooglePlayProductId("agency")),
      agencyTeam: serializeAgencyTeam(team),
    })
  }

  if (provider !== "web") {
    return NextResponse.json({ error: "중개사 결제 수단을 확인할 수 없습니다" }, { status: 400 })
  }

  const updated = team.status === "cancelled"
    ? team
    : await prisma.agencyTeam.update({
        where: { ownerId: user.id },
        data: { status: "cancelled" },
      })

  return NextResponse.json({
    success: true,
    provider,
    agencyTeam: serializeAgencyTeam(updated),
  })
}
