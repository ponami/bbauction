/**
 * lib/billing/types.ts
 * 
 * Billing 관련 공통 타입 정의 (Phase 2 모듈화)
 * 
 * 목적:
 * - payment.ts, googlePlay.ts, guards.ts 간 타입 공유
 * - Android(Google Play) 중심으로 정리
 * - 향후 PortOne(웹) 로직도 여기로 이동 예정
 */

import { BillingSku } from "../planLimits"

export interface PaymentOptions {
  sku: BillingSku
  aptId?: number | null
  aptName?: string | null
  lawdCd?: string | null
  type?: "once" | "subscription" | "agency"
}

export interface PaymentResult {
  success: boolean
  type: "once" | "subscription" | "agency"
  sku: BillingSku
  entitlementKey: string
  aptId?: number | null
  endAt?: string
  message?: string
}

/**
 * Google Play Developer API 검증 결과
 */
export interface GooglePlayVerificationResult {
  verified: boolean
  purchaseState: number
  consumptionState: number
  orderId: string
  productId: string
  purchaseTime: number
  expiryTime?: number
  paymentState?: number
  autoRenewing?: boolean
}
