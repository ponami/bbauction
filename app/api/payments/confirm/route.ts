// POST /api/payments/confirm

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PortOneClient } from "@portone/server-sdk"
import { getSessionUser } from "@/lib/getSessionUser"
import { getBillingSkuConfig } from "@/lib/planLimits"
import { canSellOnlineOnAndroid } from "@/lib/billing/guards"
import {
  verifyGooglePlayPurchase,
  acknowledgeGooglePlayPurchase,
  toGoogleProductId,
} from "@/lib/billing/googlePlay"

const portone = PortOneClient({ secret: process.env.PORTONE_API_SECRET ?? "" })

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const body = await req.json()
  const { paymentId, googlePurchaseToken, googleOrderId, type, sku, aptId, aptName, lawdCd } = body
  const config = getBillingSkuConfig(sku ?? type)
  if (!config) return NextResponse.json({ error: "유효하지 않은 sku" }, { status: 400 })
  if (!canSellOnlineOnAndroid(config)) {
    return NextResponse.json(
      { error: "현재 신규 판매는 Android에서 단건 리포트만 제공합니다. 중개사 플랜은 hello@orulzi.com으로 문의해 주세요." },
      { status: 403 }
    )
  }

  if (googlePurchaseToken) {
    if (!googleOrderId) {
      return NextResponse.json({ error: "googleOrderId 필수" }, { status: 400 })
    }
    console.log(`[GooglePlayConfirm] Verifying token for consumer purchase: ${googleOrderId}`)

    // Google Play Developer API v3 실제 검증 (Play Store 등록 필수)
    const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
    if (serviceAccountJson) {
      try {
        const productId = sku ? toGoogleProductId(sku) : null

        const verification = await verifyGooglePlayPurchase(
          productId || "unknown-once",
          googlePurchaseToken,
          "once",
        )

        if (!verification.verified) {
          console.error(`[GooglePlayConfirm] Verification failed for ${googleOrderId}`)
          return NextResponse.json({ error: "Google Play 영수증이 유효하지 않습니다" }, { status: 400 })
        }

        // 구매 확인 (Acknowledge) — Google 정책상 3일 이내 필수 (Play Store 등록 핵심)
        await acknowledgeGooglePlayPurchase(
          productId || "unknown-once",
          googlePurchaseToken,
          "once",
        )

        console.log(`[GooglePlayConfirm] Google Play verification + acknowledge succeeded: ${googleOrderId}`)
      } catch (err: any) {
        console.error("[GooglePlayConfirm] Verification failed:", err)
        return NextResponse.json({ error: "구글 플레이 영수증 검증에 실패했습니다" }, { status: 400 })
      }
    } else {
      console.warn("[GooglePlayConfirm] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not set — Sandbox mode (dev only)")
    }
  } else {
    // PortOne 결제 검증 (기존 로직 보존)
    if (!paymentId) return NextResponse.json({ error: "paymentId 필수" }, { status: 400 })
    let payment: Awaited<ReturnType<typeof portone.payment.getPayment>>
    try {
      payment = await portone.payment.getPayment({ paymentId })
    } catch {
      return NextResponse.json({ error: "결제 정보를 조회할 수 없습니다" }, { status: 400 })
    }

    if (payment.status !== "PAID") return NextResponse.json({ error: "결제가 완료되지 않았습니다" }, { status: 400 })

    const expectedAmount = config.amount
    if (payment.amount.total !== expectedAmount) return NextResponse.json({ error: "결제 금액이 일치하지 않습니다" }, { status: 400 })
  }

  // 1. 단건 리포트 구매 완료 처리
  if (config.storageType === "once") {
    if (!aptId) return NextResponse.json({ error: "단건 구매에는 aptId 필수" }, { status: 400 })
    
    const existing = await prisma.purchase.findFirst({
      where: {
        OR: [
          googleOrderId ? { googleOrderId } : null,
          paymentId ? { portonePaymentId: paymentId } : null,
        ].filter(Boolean) as any
      }
    })
    if (existing) return NextResponse.json({ success: true, message: "이미 처리된 결제입니다" })

    await prisma.purchase.create({
      data: {
        userId: user.id,
        aptId: Number(aptId),
        aptName: aptName ?? "",
        lawdCd: lawdCd ?? "",
        portonePaymentId: paymentId ?? null,
        googleOrderId: googleOrderId ?? null,
        googlePurchaseToken: googlePurchaseToken ?? null,
        status: "paid"
      },
    })
    return NextResponse.json({ success: true, type: "once", sku: config.sku, entitlementKey: config.entitlementKey, aptId })
  }

  return NextResponse.json({ error: "알 수 없는 결제 유형" }, { status: 400 })
}
