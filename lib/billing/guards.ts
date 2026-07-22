/**
 * lib/billing/guards.ts
 * 
 * 결제 판매 정책 중앙화 모듈 (Phase 0부터 시작)
 * 
 * 목적:
 * - 현재 제품 전략("신규 온라인 판매 = 단건 리포트 only")을 한 곳에서 관리
 * - Android 네이티브(Google Play)와 웹(PortOne)에서 동일한 규칙 적용
 * - 레거시(agency/subscription)는 관리용으로만 유지
 * 
 * 향후: Phase 3에서 googlePlay.ts, portone.ts 등으로 확장 예정
 */

import { BillingSkuConfig, isAndroidConsumerSku } from "../planLimits";

export type PurchaseType = "once" | "subscription" | "agency";

/**
 * 현재 온라인에서 신규 구매가 허용되는 storageType인지 확인
 */
export function isOnlinePurchaseAllowed(storageType: string | undefined | null): boolean {
  return storageType === "once";
}

/**
 * 구매를 시도하기 전에 클라이언트/서버에서 공통으로 호출할 수 있는 가드
 * 허용되지 않으면 에러 메시지를 반환 (null이면 허용)
 */
export function getPurchaseBlockReason(
  config: BillingSkuConfig | null,
  isAndroid: boolean
): string | null {
  if (!config) {
    return "유효하지 않은 상품입니다.";
  }

  if (!isOnlinePurchaseAllowed(config.storageType)) {
    return "Android 앱에서는 단건 리포트 상품(single-report, compare-pack, first-home-pack)만 구매 가능합니다. 중개사 플랜(Solo/Pro/Office)은 hello@orulzi.com으로 문의해 주세요.";
  }

  if (!config.availableOnline) {
    return "현재 온라인 결제가 열려 있지 않은 상품입니다. (Android 앱에서는 consumer once SKU만 판매) 중개사 도입은 문의해 주세요.";
  }

  return null;
}

/**
 * Android 네이티브 환경에서만 호출되는 추가 가드
 * (PlayBillingPlugin이 "agency" 등을 지원하더라도 여기서 차단)
 */
export function getAndroidPurchaseBlockReason(
  config: BillingSkuConfig | null
): string | null {
  if (!config) return "유효하지 않은 상품입니다.";

  const block = getPurchaseBlockReason(config, true);
  if (block) return block;

  // Play Store 등록 전략: consumer SKU만 명시적으로 허용
  if (!isAndroidConsumerSku(config.sku)) {
    return "Android 앱에서는 현재 단건 리포트 상품(single-report, compare-pack, first-home-pack)만 구매할 수 있습니다.";
  }

  return null;
}

/**
 * 서버(API)용 가드 — 클라이언트 가드와 동일 정책을 적용
 * request/confirm 라우트에서 중복 로직 제거용
 */
export function assertCanSellOnlineOnAndroid(config: BillingSkuConfig | null): void {
  const reason = getAndroidPurchaseBlockReason(config);
  if (reason) {
    throw new Error(reason);
  }
}

/**
 * 서버용 간단 체크 (throw 대신 boolean)
 */
export function canSellOnlineOnAndroid(config: BillingSkuConfig | null): boolean {
  return getAndroidPurchaseBlockReason(config) === null;
}
