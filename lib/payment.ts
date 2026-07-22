// lib/payment.ts — Web(PortOne) 및 Android(Google Play IAP) 통합 결제 브릿지

import { BillingSku } from "./planLimits"
import { getAndroidPurchaseBlockReason, getPurchaseBlockReason } from "./billing/guards"
import { PaymentOptions, PaymentResult } from "./billing/types"
import { isAndroidConsumerSku } from "./planLimits"

// 타입은 lib/billing/types.ts 에서 import (모듈화)
export type { PaymentOptions, PaymentResult } from "./billing/types"

/**
 * 현재 클라이언트가 Capacitor 안드로이드 네이티브 앱인지 감지
 */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false
  const win = window as any
  return !!(
    win.Capacitor?.isNativePlatform?.() &&
    win.Capacitor?.getPlatform?.() === "android"
  )
}

/**
 * 웹(포트원) 및 안드로이드(구글 플레이) 결제를 공통된 인터페이스로 실행
 */
export async function triggerPayment(options: PaymentOptions): Promise<PaymentResult> {
  const { sku, aptId, aptName, lawdCd, type } = options

  // === Phase 0 추가: 판매 정책 가드 (모듈화된 guards.ts 사용) ===
  const configForGuard = null // 실제 config는 request 단계에서 가져오지만, 여기서는 sku/type 기반 사전 차단
  // Android에서는 비-once 타입을 가장 먼저 차단 (Play 다이얼로그 뜨기 전)
  if (isAndroidApp()) {
    // Play Store 등록: consumer SKU만 허용 (isAndroidConsumerSku로 명시 강화)
    if (!isAndroidConsumerSku(sku)) {
      throw new Error("Android 앱에서는 현재 단건 리포트 상품(single-report, compare-pack, first-home-pack)만 구매할 수 있습니다.")
    }
    // type이 once가 아니면 추가 차단 (기존 가드)
    if (type && type !== "once") {
      const blockReason = getAndroidPurchaseBlockReason({ storageType: type } as any)
      if (blockReason) {
        throw new Error(blockReason)
      }
    }
    console.debug("[Payment] Android native environment detected. Launching Google Play Billing...")
    return triggerGooglePlayPayment(options)
  } else {
    console.debug("[Payment] Web environment detected. Launching PortOne Payment Gateway...")
    return triggerPortOnePayment(options)
  }
}

/**
 * 웹용 포트원 결제 실행
 */
async function triggerPortOnePayment(options: PaymentOptions): Promise<PaymentResult> {
  const { sku, aptId, aptName, lawdCd, type } = options

  // 1. 서버에 결제 요청 정보 생성
  const reqRes = await fetch("/api/payments/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, aptId, aptName, type }),
  })
  if (!reqRes.ok) {
    const errData = await reqRes.json().catch(() => ({}))
    throw new Error(errData.error ?? "결제 요청 생성 실패")
  }
  const reqData = await reqRes.json()

  // 2. 포트원 SDK 로드 및 결제 팝업 실행
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY

  if (!storeId || !channelKey) {
    throw new Error("결제 설정이 완료되지 않았습니다. (PortOne 환경변수 누락)")
  }

  const PortOne = await import(/* webpackIgnore: true */ "https://cdn.portone.io/v2/browser-sdk.es6-esm.js" as any)
  const response = await PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: reqData.paymentId,
    orderName: reqData.orderName,
    totalAmount: reqData.amount,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    customer: {
      fullName: type === "agency" ? "오를지AI 중개사" : "오를지AI 사용자",
    },
  })

  if (response.code) {
    throw new Error(response.message ?? "결제가 취소되었습니다")
  }

  // 3. 서버에 포트원 결제 검증 및 완료 요청
  const confirmRes = await fetch("/api/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId: reqData.paymentId,
      sku,
      type,
      aptId,
      aptName,
      lawdCd,
    }),
  })

  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({}))
    throw new Error(err.error ?? "결제 검증 실패")
  }

  return confirmRes.json()
}

/**
 * Capacitor 네이티브에서 PlayBilling 플러그인 사용 가능 여부 확인
 */
export function isPlayBillingAvailable(): boolean {
  if (typeof window === "undefined") return false
  const win = window as any
  return !!(win.Capacitor?.Plugins?.PlayBilling)
}

/**
 * 안드로이드용 구글 플레이 인앱 결제 실행 (Capacitor Native Plugin)
 */
async function triggerGooglePlayPayment(options: PaymentOptions): Promise<PaymentResult> {
  const { sku, aptId, aptName, lawdCd, type } = options

  // Android 가드 - consumer SKU 명시 강화
  if (!isAndroidConsumerSku(sku)) {
    throw new Error("Android 앱에서는 현재 단건 리포트 상품(single-report, compare-pack, first-home-pack)만 구매할 수 있습니다.")
  }
  const storageTypeForGuard = (type as any) || "once"
  const blockReason = getAndroidPurchaseBlockReason({ storageType: storageTypeForGuard } as any)
  if (blockReason) {
    throw new Error(blockReason)
  }

  // SKU to Google Play productId (hyphen to underscore) — pure, no server dep
  const googleProductId = sku.replace(/-/g, "_")

  try {
    const win = window as any
    const playBilling = win.Capacitor?.Plugins?.PlayBilling

    if (!playBilling) {
      throw new Error("PlayBilling 플러그인을 찾을 수 없습니다. Android 네이티브 환경인지 확인해주세요.")
    }

    console.debug(`[GooglePlay] Purchasing: ${googleProductId} (type=${type})`)

    const result = await playBilling.purchase({
      productId: googleProductId,
      type: type ?? "once",
    })

    const purchaseToken: string = result.purchaseToken
    const orderId: string = result.orderId

    if (!purchaseToken) {
      throw new Error("Google Play에서 구매 토큰을 받아오지 못했습니다")
    }

    console.debug(`[GooglePlay] Purchase complete. orderId=${orderId}`)

    // 실제 검증/acknowledge는 서버 confirm에서 googlePlay.ts 모듈이 담당
    const confirmRes = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googlePurchaseToken: purchaseToken,
        googleOrderId: orderId,
        sku,
        type,
        aptId,
        aptName,
        lawdCd,
      }),
    })

    if (!confirmRes.ok) {
      const err = await confirmRes.json().catch(() => ({}))
      throw new Error(err.error ?? "구글 플레이 결제 검증 실패")
    }

    return confirmRes.json()
  } catch (err: any) {
    throw new Error(err.message || "구글 결제 진행 중 오류가 발생했습니다")
  }
}
