"use client"

import { useState } from "react"

type BillingProvider = "web" | "google_play" | null

interface SubscriptionInfo {
  status: string
  endAt: string
  billingProvider: BillingProvider
}

interface AgencyInfo {
  status: string
  endAt: string
  billingProvider: BillingProvider
}

interface SubscriptionManagementCardProps {
  plan: string
  subscription: SubscriptionInfo | null
  agencyRole: "owner" | "member" | null
  agency: AgencyInfo | null
  onManage: (target: "subscription" | "agency") => Promise<void>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR")
}

function getProviderLabel(provider: BillingProvider) {
  if (provider === "google_play") return "Google Play"
  if (provider === "web") return "웹 결제"
  return "알 수 없음"
}

export default function SubscriptionManagementCard({
  plan,
  subscription,
  agencyRole,
  agency,
  onManage,
}: SubscriptionManagementCardProps) {
  const [loadingTarget, setLoadingTarget] = useState<"subscription" | "agency" | null>(null)
  const [error, setError] = useState("")

  const isSubscriptionVisible = plan === "subscription" && subscription
  const isAgencyOwnerVisible = plan === "agency" && agencyRole === "owner" && agency
  const isAgencyMemberVisible = plan === "agency" && agencyRole === "member"

  if (!isSubscriptionVisible && !isAgencyOwnerVisible && !isAgencyMemberVisible) {
    return null
  }

  async function handleManage(target: "subscription" | "agency") {
    setLoadingTarget(target)
    setError("")

    try {
      await onManage(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : "구독 관리 중 오류가 발생했습니다")
    } finally {
      setLoadingTarget(null)
    }
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 10 }}>🧾 레거시 정기결제 관리 (Android 앱에서는 신규 판매 없음)</div>

      {isSubscriptionVisible && subscription && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>개인 구독(레거시) — Android 신규 구매 불가</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.7 }}>
            결제 수단: {getProviderLabel(subscription.billingProvider)}<br />
            이용 종료일: {formatDate(subscription.endAt)}<br />
            상태: {subscription.status === "cancelled" ? "해지 예약됨" : "이용 중"}
          </div>
          <button
            onClick={() => handleManage("subscription")}
            disabled={loadingTarget !== null}
            style={{
              marginTop: 10,
              padding: "9px 14px",
              borderRadius: 8,
              border: "none",
              background: loadingTarget ? "#E5E7EB" : "#111827",
              color: loadingTarget ? "#9CA3AF" : "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: loadingTarget ? "not-allowed" : "pointer",
            }}
          >
            {loadingTarget === "subscription"
              ? "처리 중..."
              : subscription.billingProvider === "google_play"
              ? "Google Play에서 관리"
              : subscription.status === "cancelled"
              ? "해지 상태 확인"
              : "웹 구독 해지"}
          </button>
        </div>
      )}

      {isAgencyOwnerVisible && agency && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>중개사 플랜(레거시) — Android 신규 구매 불가</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.7 }}>
            결제 수단: {getProviderLabel(agency.billingProvider)}<br />
            이용 종료일: {formatDate(agency.endAt)}<br />
            상태: {agency.status === "cancelled" ? "해지 예약됨" : "이용 중"}
          </div>
          <button
            onClick={() => handleManage("agency")}
            disabled={loadingTarget !== null}
            style={{
              marginTop: 10,
              padding: "9px 14px",
              borderRadius: 8,
              border: "none",
              background: loadingTarget ? "#E5E7EB" : "#1E3A5F",
              color: loadingTarget ? "#9CA3AF" : "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: loadingTarget ? "not-allowed" : "pointer",
            }}
          >
            {loadingTarget === "agency"
              ? "처리 중..."
              : agency.billingProvider === "google_play"
              ? "Google Play에서 관리"
              : agency.status === "cancelled"
              ? "해지 상태 확인"
              : "중개사 구독 해지"}
          </button>
        </div>
      )}

      {isAgencyMemberVisible && (
        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
          레거시 팀원 계정은 구독 해지를 직접 처리할 수 없습니다. (Android 앱 신규 판매 없음, 관리만 가능) 해지가 필요하면 팀 오너에게 요청해주세요.
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: "#DC2626", marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  )
}
