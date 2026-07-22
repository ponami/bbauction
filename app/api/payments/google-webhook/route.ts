// POST /api/payments/google-webhook
// Google Play Real-Time Developer Notifications (RTDN) 수신
// Google Cloud Pub/Sub Push Subscription → 이 엔드포인트로 전달
//
// 설정 방법:
// 1. Google Cloud Console → Pub/Sub → 주제 생성
// 2. 구독 생성 → Push 방식 → https://yourdomain.com/api/payments/google-webhook?token=VERIFICATION_TOKEN
// 3. Google Play Console → Developer API → Real-Time Developer Notifications → Pub/Sub 주제 연결

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const VERIFICATION_TOKEN = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN ?? ""

interface PubSubMessage {
  message: {
    data: string // base64-encoded JSON
    messageId: string
    publishTime: string
    attributes: Record<string, string>
  }
  subscription: string
}

interface GooglePlayNotification {
  version: string
  packageName: string
  eventTimeMillis: string
  testNotification?: {
    version: string
  }
  subscriptionNotification?: {
    version: string
    notificationType: number
    purchaseToken: string
    subscriptionId: string
  }
  voidedPurchaseNotification?: {
    voidType: number
    purchaseToken: string
    orderId: string
    voidTimeMillis: string
  }
}

export async function POST(req: NextRequest) {
  // URL 쿼리 파라미터로 전달된 검증 토큰 확인
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (VERIFICATION_TOKEN && token !== VERIFICATION_TOKEN) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 401 })
  }

  let body: PubSubMessage
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Pub/Sub 메시지 구조 확인
  if (!body.message?.data) {
    return NextResponse.json({ error: "Missing message data" }, { status: 400 })
  }

  // Base64 디코딩
  let decoded: string
  try {
    decoded = Buffer.from(body.message.data, "base64").toString("utf-8")
  } catch {
    return NextResponse.json({ error: "Invalid base64 encoding" }, { status: 400 })
  }

  // Google Play 알림 파싱
  let notification: GooglePlayNotification
  try {
    notification = JSON.parse(decoded)
  } catch {
    return NextResponse.json({ error: "Invalid JSON in message data" }, { status: 400 })
  }

  // 패키지명 확인
  if (notification.packageName !== (process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "com.orulzi.app")) {
    return NextResponse.json({ error: "Invalid package name" }, { status: 400 })
  }

  // Test notification — Google Play Console에서 설정 테스트용
  if (notification.testNotification) {
    console.log("[GoogleWebhook] Test notification received — ok")
    return NextResponse.json({ ok: true })
  }

  // 구독 알림 처리
  if (notification.subscriptionNotification) {
    const subNotif = notification.subscriptionNotification
    const { notificationType, purchaseToken, subscriptionId } = subNotif

    console.log(`[GoogleWebhook] Subscription notification: type=${notificationType}, subId=${subscriptionId}`)

    // purchaseToken으로 Subscription 레코드 찾기
    const subscription = await prisma.subscription.findFirst({
      where: { googlePurchaseToken: purchaseToken },
    })

    if (!subscription) {
      console.warn(`[GoogleWebhook] No subscription found for purchaseToken: ${purchaseToken}`)
      // Purchase 테이블에서도 검색 (agency 플랜 케이스)
      const agencyTeam = await prisma.agencyTeam.findFirst({
        where: { googlePurchaseToken: purchaseToken },
      })
      if (!agencyTeam) {
        return NextResponse.json({ ok: true }) // 알 수 없는 토큰이지만 ack 반환
      }
      return handleAgencyNotification(notificationType, agencyTeam)
    }

    await handleSubscriptionNotification(notificationType, subscription.id, subscription.userId)
  }

  // 환불(Voided purchase) 알림 처리
  if (notification.voidedPurchaseNotification) {
    const voidNotif = notification.voidedPurchaseNotification
    const { purchaseToken } = voidNotif

    console.log(`[GoogleWebhook] Voided purchase: purchaseToken=${purchaseToken}`)

    // Purchase 테이블 검색
    const purchase = await prisma.purchase.findFirst({
      where: { googlePurchaseToken: purchaseToken },
    })
    if (purchase) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "refunded" },
      })
      console.log(`[GoogleWebhook] Purchase refunded: id=${purchase.id}`)
    }

    // Subscription 테이블 검색
    const subscription = await prisma.subscription.findFirst({
      where: { googlePurchaseToken: purchaseToken },
    })
    if (subscription) {
      const endedAt = new Date()
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "cancelled", endAt: endedAt },
        }),
        prisma.user.update({
          where: { id: subscription.userId },
          data: { plan: "free" },
        }),
      ])
      console.log(`[GoogleWebhook] Subscription cancelled (voided): id=${subscription.id}`)
    }

    // AgencyTeam 검색
    const agencyTeam = await prisma.agencyTeam.findFirst({
      where: { googlePurchaseToken: purchaseToken },
      include: { members: true },
    })
    if (agencyTeam) {
      await handleVoidedAgency(agencyTeam)
    }
  }

  return NextResponse.json({ ok: true })
}

// ── Subscription Notification Handlers ─────────────────

/**
 * 구독 알림 타입별 처리
 *
 * notificationType:
 *   1 = SUBSCRIPTION_RENEWED   — 갱신됨 (endAt 연장)
 *   2 = SUBSCRIPTION_ON_HOLD   — 일시 중지
 *   3 = SUBSCRIPTION_EXPIRED   — 만료됨
 *   4 = SUBSCRIPTION_PURCHASED — 신규 구매
 *   5 = SUBSCRIPTION_REVOKED   — 환불/취소
 *   7 = SUBSCRIPTION_CANCELLED — 취소 (현재 기간 종료 시 만료)
 *   8 = SUBSCRIPTION_RESTARTED — 재시작
 *  13 = SUBSCRIPTION_DEFERRED  — 갱신 연기
 *  20 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED — 일시 중지 일정 변경
 */
async function handleSubscriptionNotification(
  notificationType: number,
  subscriptionId: string,
  userId: string,
) {
  const endedAt = new Date()

  switch (notificationType) {
    case 1: // SUBSCRIPTION_RENEWED
    case 8: // SUBSCRIPTION_RESTARTED
      // endAt을 1개월 연장
      const existing = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
      if (!existing) return

      const now = new Date()
      const baseDate = existing.endAt > now ? existing.endAt : now
      const newEndAt = new Date(baseDate)
      newEndAt.setMonth(newEndAt.getMonth() + 1)

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: "active", endAt: newEndAt },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { plan: "subscription" },
        }),
      ])
      console.log(`[GoogleWebhook] Subscription renewed: id=${subscriptionId}, endAt=${newEndAt.toISOString()}`)
      break

    case 3: // SUBSCRIPTION_EXPIRED
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: "expired" },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { plan: "free" },
        }),
      ])
      console.log(`[GoogleWebhook] Subscription expired: id=${subscriptionId}`)
      break

    case 5: // SUBSCRIPTION_REVOKED (환불)
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: "cancelled", endAt: endedAt },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { plan: "free" },
        }),
      ])
      console.log(`[GoogleWebhook] Subscription revoked: id=${subscriptionId}`)
      break

    case 7: // SUBSCRIPTION_CANCELLED (현재 기간 종료 후 만료 예정)
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: "cancelled" },
      })
      console.log(`[GoogleWebhook] Subscription cancelled (end of period): id=${subscriptionId}`)
      break

    case 2: // SUBSCRIPTION_ON_HOLD
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: "cancelled", endAt: endedAt },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { plan: "free" },
        }),
      ])
      console.log(`[GoogleWebhook] Subscription on hold: id=${subscriptionId}`)
      break

    // 4(PURCHASED)는 /api/payments/confirm에서 이미 처리됨
    case 4:
    case 13:
    case 20:
    default:
      console.log(`[GoogleWebhook] Unhandled notification type: ${notificationType} (id=${subscriptionId})`)
      break
  }
}

// ── Agency Notification Handlers ─────────────────

async function handleAgencyNotification(
  notificationType: number,
  agencyTeam: { id: string; ownerId: string },
) {
  switch (notificationType) {
    case 5: // REVOKED
    case 3: // EXPIRED
      await handleVoidedAgency(agencyTeam)
      break
    default:
      console.log(`[GoogleWebhook] Agency notification type=${notificationType} ignored (id=${agencyTeam.id})`)
      break
  }
}

async function handleVoidedAgency(agencyTeam: {
  id: string
  ownerId: string
}): Promise<void> {
  const team = await prisma.agencyTeam.findUnique({
    where: { id: agencyTeam.id },
    include: { members: true },
  })
  if (!team) return

  const endedAt = new Date()
  await prisma.$transaction([
    prisma.agencyTeam.update({
      where: { id: team.id },
      data: { status: "cancelled", endAt: endedAt },
    }),
    prisma.user.update({
      where: { id: team.ownerId },
      data: { plan: "free" },
    }),
    ...team.members.map((m) =>
      prisma.user.update({
        where: { id: m.userId },
        data: { plan: "free" },
      }),
    ),
  ])
  console.log(`[GoogleWebhook] Agency voided: id=${team.id}`)
}
