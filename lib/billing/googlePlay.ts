/**
 * lib/billing/googlePlay.ts
 * 
 * Google Play Billing 전용 로직 (Phase 2 모듈화)
 * 
 * 기존 googlePlayVerification.ts 내용을 이동 + Android 중심으로 정리.
 * 
 * 포함 기능:
 * - 영수증 검증 (verifyGooglePlayPurchase)
 * - 구매 확인 (acknowledgeGooglePlayPurchase)
 * - productId 매핑 (하이픈 → 언더스코어)
 * 
 * 주의: 이 모듈은 Android Play Store 등록용 consumer once 상품에 최적화되어 있음.
 * agency/subscription은 legacy 관리용으로만 남겨둠.
 */

// This file must ONLY be imported from server code (API routes, server actions).
// It uses googleapis which requires Node.js builtins (fs, net, etc).
// Client code must never import it (use /api/payments/* instead).

import { google } from "googleapis"
import { GooglePlayVerificationResult } from "./types"

function getAuth() {
  const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!saJson) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured")

  const sa = JSON.parse(saJson)
  return new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  })
}

const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "com.orulzi.app"

/**
 * Google Play Developer API를 통해 구매 영수증을 검증합니다.
 */
export async function verifyGooglePlayPurchase(
  productId: string,
  purchaseToken: string,
  type: "once" | "subscription" | "agency",
): Promise<GooglePlayVerificationResult> {
  const auth = getAuth()
  const publisher = google.androidpublisher({ version: "v3", auth })

  try {
    if (type === "subscription") {
      const res = await publisher.purchases.subscriptions.get({
        packageName: PACKAGE_NAME,
        subscriptionId: productId,
        token: purchaseToken,
      })

      const data = res.data
      const paymentState = data.paymentState ?? 0
      return {
        verified: paymentState === 1,
        purchaseState: paymentState === 1 ? 0 : paymentState === 2 ? 2 : -1,
        consumptionState: 0,
        orderId: data.orderId ?? "",
        productId,
        purchaseTime: data.startTimeMillis ? Number(data.startTimeMillis) : 0,
        expiryTime: data.expiryTimeMillis ? Number(data.expiryTimeMillis) : undefined,
        paymentState,
        autoRenewing: data.autoRenewing ?? false,
      }
    } else {
      const res = await publisher.purchases.products.get({
        packageName: PACKAGE_NAME,
        productId,
        token: purchaseToken,
      })

      const data = res.data
      return {
        verified: data.purchaseState === 0,
        purchaseState: data.purchaseState ?? -1,
        consumptionState: data.consumptionState ?? -1,
        orderId: data.orderId ?? "",
        productId: data.productId ?? productId,
        purchaseTime: data.purchaseTimeMillis ? Number(data.purchaseTimeMillis) : 0,
      }
    }
  } catch (err: any) {
    console.error("[googlePlay] API error:", err.message)
    throw new Error(`Google Play 영수증 검증 실패: ${err.message}`)
  }
}

/**
 * Google Play Developer API를 통해 구매를 확인(acknowledge)합니다.
 * 3일 이내 acknowledge 필수 (Play Store 정책).
 */
export async function acknowledgeGooglePlayPurchase(
  productId: string,
  purchaseToken: string,
  type: "once" | "subscription" | "agency",
): Promise<void> {
  const auth = getAuth()
  const publisher = google.androidpublisher({ version: "v3", auth })

  try {
    if (type === "subscription") {
      await publisher.purchases.subscriptions.acknowledge({
        packageName: PACKAGE_NAME,
        subscriptionId: productId,
        token: purchaseToken,
        requestBody: { developerPayload: "" },
      })
    } else {
      await publisher.purchases.products.acknowledge({
        packageName: PACKAGE_NAME,
        productId,
        token: purchaseToken,
        requestBody: { developerPayload: "" },
      })
    }
    console.log(`[googlePlay] Acknowledged: ${productId}`)
  } catch (err: any) {
    if (err.code === 409) {
      console.log(`[googlePlay] Already acknowledged: ${productId}`)
      return
    }
    console.error("[googlePlay] Acknowledge error:", err.message)
    throw new Error(`Google Play 구매 확인 실패: ${err.message}`)
  }
}

/**
 * SKU 하이픈을 Google Play product ID용 언더스코어로 변환
 * 예: first-home-pack → first_home_pack
 */
export function toGoogleProductId(sku: string): string {
  return sku.replace(/-/g, "_")
}
