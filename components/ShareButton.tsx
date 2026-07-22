"use client"

import { useState } from "react"
import { appendAgentShareParams, readAgentMode, getAgentShareDetails } from "@/lib/agentMode"
import {
  appendRecommendationParams,
  getRecommendationCopy,
  type RecommendationContext,
} from "@/lib/recommendationCopy"
import {
  getShareAudience,
  getShareIntentCopy,
  markShareReward,
  readAgentProfile,
} from "@/lib/shareIntentCopy"
import { trackAnalyticsEvent } from "@/lib/analytics"

interface ShareButtonProps {
  aptName: string
  address?: string
  score?: number
  aptId?: number
  recommendationContext?: RecommendationContext
  label?: string
  style?: React.CSSProperties
  size?: "sm" | "md"
  rewardKey?: string
  onShared?: () => void
  summary?: { strength: string; risk: string; conclusion: string } | null
}

export default function ShareButton({ aptName, address, score, aptId, recommendationContext, label, style, size = "md", rewardKey, onShared, summary }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const params = new URLSearchParams()
    if (address) params.set("address", address)
    if (aptName)  params.set("apt", aptName)
    appendRecommendationParams(params, recommendationContext)

    const agentProfile = readAgentProfile()
    const agentMode = readAgentMode()
    const agentShareDetails = getAgentShareDetails(agentMode)
    appendAgentShareParams(params, agentShareDetails)
    const audience = getShareAudience(agentProfile)
    const shareIntentCopy = getShareIntentCopy(audience)
    const copy = getRecommendationCopy(recommendationContext)
    const funnel = agentShareDetails ? "agent" : "consumer"
    const source = typeof window !== "undefined"
      ? window.location.pathname.startsWith("/dashboard")
        ? "dashboard-share"
        : window.location.pathname.startsWith("/share")
        ? "shared-report"
        : window.location.pathname.startsWith("/map")
        ? "map-share"
        : "app-share"
      : "app-share"
    let leadId = ""

    if (agentShareDetails) {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: agentShareDetails.leadName,
            phone: agentShareDetails.phone,
            reportPurpose: agentShareDetails.reportPurpose,
            aptId,
            aptName,
            address,
          }),
        })
        if (res.ok) {
          const json = await res.json()
          leadId = json?.data?.id ?? ""
        }
      } catch {
        leadId = ""
      }
    }

    if (leadId) {
      params.set("leadId", leadId)
    }

    // 중개사 전용 공유 페이지 URL
    const sharePageUrl = aptId && agentProfile
      ? `${window.location.origin}/share/${aptId}?${params.toString()}`
      : null

    const appUrl = typeof window !== "undefined"
      ? `${window.location.origin}/dashboard?${params.toString()}`
      : ""

    const text = sharePageUrl
      ? [`🏠 ${aptName} AI 분석 결과 (중개사 제공)`,
         agentProfile?.leadName ? `👤 대상: ${agentProfile.leadName}` : "",
         agentProfile?.reportPurpose ? `🧾 목적: ${agentProfile.reportPurpose}` : "",
          `📌 ${shareIntentCopy.shareLead}`,
          `📊 ${copy.shareButtonLine}`,
          `👉 ${sharePageUrl}`,
        ].filter(Boolean).join("\n")
      : [
          `🏠 ${aptName} AI 분석 결과`,
          shareIntentCopy.shareLead,
          score !== undefined ? `종합 점수 ${score}점 · ${score >= 70 ? "설명 여유 있는 구간" : score >= 50 ? "추가 확인이 필요한 구간" : "보수적으로 볼 구간"}` : "",
          summary ? `✅ ${summary.strength}\n⚠️ ${summary.risk}\n💡 ${summary.conclusion}` : "",
          shareIntentCopy.shareDescription,
          copy.shareButtonLine,
          `나도 내 집 분석해봐! 👉 ${appUrl}`,
        ].filter(Boolean).join("\n")

    void trackAnalyticsEvent({
      eventType: "share_click",
      funnel,
      source,
      aptId,
      aptName,
      meta: {
        audience,
        agentMode: Boolean(agentShareDetails),
      },
    })

    if (navigator.share) {
      try {
        await navigator.share({ title: `${aptName} AI 분석`, text, url: sharePageUrl || appUrl })
        if (rewardKey) markShareReward(rewardKey, audience)
        void trackAnalyticsEvent({
          eventType: "share_success",
          funnel,
          source,
          aptId,
          aptName,
          meta: { audience, method: "native-share" },
        })
        void trackAnalyticsEvent({
          eventType: "referral_share_sent",
          funnel,
          source,
          aptId,
          aptName,
          meta: { audience },
        })
        onShared?.()
        return
      } catch { /* 취소 시 무시 */ }
    }

    // 폴백: 링크 복사
    try {
      await navigator.clipboard.writeText(text)
      if (rewardKey) markShareReward(rewardKey, audience)
      setCopied(true)
      void trackAnalyticsEvent({
        eventType: "share_success",
        funnel,
        source,
        aptId,
        aptName,
        meta: { audience, method: "clipboard" },
      })
      void trackAnalyticsEvent({
        eventType: "referral_share_sent",
        funnel,
        source,
        aptId,
        aptName,
        meta: { audience, method: "clipboard" },
      })
      onShared?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 공유 페이지 링크 우선 복사
      const fallbackUrl = sharePageUrl || appUrl
      prompt("아래 링크를 복사하세요", fallbackUrl)
    }
  }

  const sm = size === "sm"

  return (
    <button
      onClick={handleShare}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sm ? 4 : 6,
        padding: sm ? "6px 12px" : "10px 18px",
        borderRadius: sm ? 8 : 10,
        border: "1px solid #E5E7EB",
        background: copied ? "#F0FDF4" : "#FFFFFF",
        color: copied ? "#16A34A" : "#374151",
        fontSize: sm ? 11 : 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ fontSize: sm ? 13 : 15 }}>{copied ? "✓" : "🔗"}</span>
      {copied ? "링크 준비됐어요!" : label || getShareIntentCopy(getShareAudience(readAgentProfile())).primaryButtonLabel}
    </button>
  )
}
