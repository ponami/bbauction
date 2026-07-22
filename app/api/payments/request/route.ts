// POST /api/payments/request

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/getSessionUser"
import { randomUUID } from "crypto"
import { getBillingSkuConfig } from "@/lib/planLimits"
import { canSellOnlineOnAndroid } from "@/lib/billing/guards"

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const body = await req.json()
  const { type, sku, aptId, aptName } = body
  const config = getBillingSkuConfig(sku ?? type)
  if (!config) {
    return NextResponse.json({ error: "유효한 sku가 필요합니다" }, { status: 400 })
  }
  if (!canSellOnlineOnAndroid(config)) {
    return NextResponse.json(
      { error: "현재 신규 판매는 Android에서 단건 리포트만 제공합니다. 중개사 플랜은 hello@orulzi.com으로 문의해 주세요." },
      { status: 403 }
    )
  }
  if (!config.availableOnline) {
    return NextResponse.json({ error: "현재 온라인 결제가 열려 있지 않은 상품입니다" }, { status: 403 })
  }
  if (config.requiresApt && (!aptId || !aptName)) {
    return NextResponse.json({ error: "현재 단지 기준 결제라서 aptId, aptName이 필요합니다" }, { status: 400 })
  }

  const orderName = config.requiresApt && aptName
    ? `[${config.title}] ${aptName}`
    : config.title

  return NextResponse.json({
    paymentId: `once-${randomUUID()}`,
    orderName,
    amount: config.amount,
    type: config.storageType,
    sku: config.sku,
    entitlementKey: config.entitlementKey,
    aptId: aptId ?? null,
    aptName: aptName ?? null,
  })
}
