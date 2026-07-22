// POST /api/payments/webhook
// PortOne 웹훅 수신 - 결제 상태 변경 이벤트 처리
// PortOne 콘솔에서 웹훅 URL: https://yourdomain.com/api/payments/webhook

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Webhook } from "@portone/server-sdk"

const WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET ?? ""

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const headers = Object.fromEntries(req.headers)

  // 웹훅 서명 검증 (PORTONE_WEBHOOK_SECRET 필수)
  if (!WEBHOOK_SECRET) {
    console.error("[webhook] PORTONE_WEBHOOK_SECRET 미설정 — 웹훅 처리 불가")
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 })
  }
  try {
    await Webhook.verify(WEBHOOK_SECRET, rawBody, headers)
  } catch {
    return NextResponse.json({ error: "잘못된 웹훅 서명" }, { status: 401 })
  }

  let event: ReturnType<typeof JSON.parse>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "웹훅 파싱 실패" }, { status: 400 })
  }

  const eventType: string = event?.type ?? ""
  const paymentId: string | undefined = event?.data?.paymentId

  // 결제 취소/환불 이벤트
  if (
    (eventType === "Transaction.Cancelled" || eventType === "Transaction.Failed") &&
    paymentId
  ) {
    // 단건 구매 취소
    const purchase = await prisma.purchase.findFirst({
      where: { portonePaymentId: paymentId },
    })
    if (purchase) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "refunded" },
      })
    }

    // 구독 취소
    const subscription = await prisma.subscription.findFirst({
      where: { portonePaymentId: paymentId },
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
    }

    // 중개사 Pro 플랜 취소 (소유자 + 모든 팀 멤버 plan 리셋)
    const agencyTeam = await prisma.agencyTeam.findFirst({
      where: { portonePaymentId: paymentId },
      include: { members: true },
    })
    if (agencyTeam) {
      const endedAt = new Date()
      await prisma.$transaction([
        prisma.agencyTeam.update({
          where: { id: agencyTeam.id },
          data: { status: "cancelled", endAt: endedAt },
        }),
        prisma.user.update({
          where: { id: agencyTeam.ownerId },
          data: { plan: "free" },
        }),
        ...agencyTeam.members.map((m) =>
          prisma.user.update({
            where: { id: m.userId },
            data: { plan: "free" },
          }),
        ),
      ])
    }
  }

  return NextResponse.json({ ok: true })
}
