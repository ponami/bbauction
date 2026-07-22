"use client"

import { useEffect, useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics"

interface ReferralData {
  code: string
  totalReferred: number
  credits: {
    active: number
    used: number
  }
}

export default function ReferralBanner() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [claimCode, setClaimCode] = useState("")
  const [claimStatus, setClaimStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [claimError, setClaimError] = useState("")

  useEffect(() => {
    fetch("/api/referral")
      .then(async res => {
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (json.success) setData(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
        불러오는 중...
      </div>
    )
  }

  if (!data) return null

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${data.code}`
    : ""

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      void trackAnalyticsEvent({
        eventType: "referral_share_sent",
        funnel: "consumer",
        source: "referral-banner",
        meta: { method: "copy-link" },
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleClaim = async () => {
    if (!claimCode.trim()) return
    setClaimStatus("loading")
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: claimCode.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setClaimStatus("success")
        setClaimCode("")
        // 데이터 새로고침
        const refetch = await fetch("/api/referral")
        const refJson = await refetch.json()
        if (refJson.success) setData(refJson.data)
      } else {
        setClaimStatus("error")
        setClaimError(json.error || "오류가 발생했습니다")
      }
    } catch {
      setClaimStatus("error")
      setClaimError("네트워크 오류")
    }
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #0A2463, #1B4FBB)",
      borderRadius: 14, padding: "18px 20px", color: "#fff",
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
        🎁 친구 초대하고 혜택 받기
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 14, lineHeight: 1.6 }}>
        친구가 내 추천 코드로 가입하면<br />
        나와 친구 모두 리포트 할인 크레딧을 받아요
      </div>

      {/* 내 추천 코드 */}
      <div style={{
        background: "rgba(255,255,255,0.12)", borderRadius: 10,
        padding: "12px 14px", marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4, fontWeight: 600 }}>
          내 추천 코드
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 8,
            padding: "8px 12px", fontSize: 20, fontWeight: 900,
            letterSpacing: 4, textAlign: "center", fontFamily: "monospace",
          }}>
            {data.code}
          </div>
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: copied ? "#16A34A" : "#fff",
              color: copied ? "#fff" : "#0A2463",
              fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {copied ? "✓ 복사됨" : "복사"}
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 8,
          padding: "10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{data.totalReferred}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>초대한 사람</div>
        </div>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 8,
          padding: "10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{data.credits.active}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>사용 가능 크레딧</div>
        </div>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 8,
          padding: "10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{data.credits.used}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>사용한 크레딧</div>
        </div>
      </div>

      {/* 추천 코드 등록 */}
      <div style={{
        background: "rgba(255,255,255,0.06)", borderRadius: 10,
        padding: "12px 14px", border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 6, fontWeight: 600 }}>
          추천 코드 입력하기
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={claimCode}
            onChange={e => { setClaimCode(e.target.value.toUpperCase()); setClaimStatus("idle") }}
            placeholder="코드 입력"
            maxLength={10}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14,
              fontWeight: 700, letterSpacing: 2, fontFamily: "monospace",
              outline: "none",
            }}
          />
          <button
            onClick={handleClaim}
            disabled={claimStatus === "loading" || !claimCode.trim()}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: claimStatus === "loading" ? "#9CA3AF" : "#16A34A",
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: claimCode.trim() ? 1 : 0.5,
            }}
          >
            {claimStatus === "loading" ? "..." : "등록"}
          </button>
        </div>
        {claimStatus === "success" && (
          <div style={{ fontSize: 11, color: "#34D399", marginTop: 6, fontWeight: 600 }}>
            ✅ 크레딧이 지급되었습니다!
          </div>
        )}
        {claimStatus === "error" && (
          <div style={{ fontSize: 11, color: "#F87171", marginTop: 6, fontWeight: 600 }}>
            {claimError === "already_has_code" ? "이미 추천 코드를 등록했습니다" :
             claimError === "self_referral" ? "자기 자신을 추천할 수 없습니다" :
             claimError === "invalid_code" ? "유효하지 않은 코드입니다" :
             claimError === "already_referred" ? "이미 등록된 추천인입니다" :
             `오류: ${claimError}`}
          </div>
        )}
      </div>
    </div>
  )
}
