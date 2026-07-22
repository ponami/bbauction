"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { appendAgentShareParams, getAgentContactHref } from "@/lib/agentMode"
import ChecklistBlock from "@/components/reports/ChecklistBlock"
import DecisionPackCard from "@/components/reports/DecisionPackCard"
import { getAdvisoryVerdict, getThreeAxisReasons } from "@/lib/advisoryCopy"
import {
  appendRecommendationParams,
  getBudgetFitCopy,
  getRecommendationCopy,
  normalizeRecommendationContext,
  inferBudgetFit,
  recommendationLabel,
  type RecommendationContext,
} from "@/lib/recommendationCopy"
import { getChecklistPack, getDecisionPack, type ReportPersona } from "@/lib/reportProducts"
import type { ReportProofPreview } from "@/lib/reportProofPreview"
import { getShareIntentCopy, type ShareAudience } from "@/lib/shareIntentCopy"
import { buildShareCard } from "@/lib/shareCardBuilder"
import ShareConclusionCard from "@/components/share/ShareConclusionCard"
import { trackAnalyticsEvent } from "@/lib/analytics"

type AptData = {
  apt_id: number
  apt_nm: string
  sigungu_nm?: string
  umd_nm?: string
  sigungu_cd?: string
  oreulji_score: number
  final_score?: number
  mode?: string
  jeonse_risk_level?: string
  risk_level?: string
  show_rise?: boolean
  rise_prob?: number
  expected_gain?: number
  pred_pct_24m?: number
  expected_loss?: number
  recent_trades?: unknown[]
  build_year?: number
  price?: number
  apt_pred_pct?: number
  apt_forecast_factors?: { label: string; value: number; impact: string; detail: string }[]
  apt_forecast_summary?: string
}

function scoreGradient(score: number) {
  if (score >= 75) return "linear-gradient(135deg,#27AE60,#16A34A)"
  if (score >= 64) return "linear-gradient(135deg,#2ECC71,#10B981)"
  if (score >= 56) return "linear-gradient(135deg,#F1C40F,#F59E0B)"
  if (score >= 50) return "linear-gradient(135deg,#E67E22,#F59E0B)"
  return "linear-gradient(135deg,#E74C3C,#DC2626)"
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

export default function SharePageClient({ apt, aptId, isLoggedIn }: { apt: AptData | null; aptId: string; isLoggedIn?: boolean }) {
  const [fetchedApt, setFetchedApt] = useState<AptData | null>(apt)
  const [loading, setLoading] = useState(!apt)
  const [fetchError, setFetchError] = useState(false)
  const [proofPreview, setProofPreview] = useState<ReportProofPreview | null>(null)
  const sp = useSearchParams()
  const agentName  = sp.get("agent")
  const agentPhone = sp.get("phone")
  const agentOffice = sp.get("office")
  const leadName = sp.get("lead")
  const leadId = sp.get("leadId")
  const reportPurpose = sp.get("report")
  const agentIntro = sp.get("intro")
  const recommendationContext: RecommendationContext = {
    purpose: sp.get("purpose") === "투자" ? "투자" : sp.get("purpose") === "실거주" ? "실거주" : "",
    timeline: sp.get("timeline") === "3개월" || sp.get("timeline") === "6개월" || sp.get("timeline") === "1년" || sp.get("timeline") === "미정"
      ? sp.get("timeline") as RecommendationContext["timeline"]
      : "",
    budget: sp.get("budget") ? Number(sp.get("budget")) || 0 : 0,
  }

  // SSR에서 데이터가 없으면 클라이언트에서 fetch
  useEffect(() => {
    if (apt) return
    const controller = new AbortController()
    setLoading(true)
    setFetchError(false)
    fetch(`${GATE_URL}/apt/${aptId}?horizon=24`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setFetchedApt(data)
        else setFetchError(true)
      })
      .catch(() => { if (!controller.signal.aborted) setFetchError(true) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [apt, aptId])

  const currentApt = fetchedApt ?? apt
  const address = [currentApt?.sigungu_nm, currentApt?.umd_nm].filter(Boolean).join(" ")

  useEffect(() => {
    if (!leadId || !currentApt) return
    fetch("/api/lead-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        type: "share_view",
        aptId: currentApt.apt_id,
        aptName: currentApt.apt_nm,
        address,
        reportPurpose,
      }),
    }).catch(() => {})
  }, [leadId, currentApt, address, reportPurpose])

  // 공유 링크 열람 로깅 (비로그인 포함)
  useEffect(() => {
    if (!currentApt) return
    void trackAnalyticsEvent({
      eventType: "share_link_view",
      funnel: "consumer",
      source: "shared-report",
      aptId: currentApt.apt_id,
      aptName: currentApt.apt_nm,
      meta: { isLoggedIn: !!isLoggedIn },
    })
  }, [currentApt, isLoggedIn])

  // proof-preview는 API로 fetch (민감 재무 계산 번들 제거)
  useEffect(() => {
    const targetPrice = currentApt?.price ?? null
    if (!targetPrice) { setProofPreview(null); return }
    const search = sp
    const purpose = search?.get("purpose") === "투자" ? "투자" : search?.get("purpose") === "실거주" ? "실거주" : ""
    const persona = (search?.get("reportMode") === "agent" || agentOffice || agentName)
      ? "agent" as const
      : purpose === "투자"
      ? "investor" as const
      : purpose === "실거주"
      ? "first-home" as const
      : "general" as const
    fetch("/api/proof-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona,
        purpose,
        targetPrice,
        budget: recommendationContext.budget ?? null,
      }),
    }).then(r => r.json()).then(json => {
      if (json.data) setProofPreview(json.data)
    }).catch(() => setProofPreview(null))
  }, [currentApt?.price, agentOffice, agentName])

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F4F6F9", padding: 24, fontFamily: "sans-serif" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #E5E7EB", borderTopColor: "#16A34A", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ fontSize: 14, color: "#6B7280" }}>아파트 분석 데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (!currentApt) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F4F6F9", padding: 24, fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>아파트 정보를 불러올 수 없습니다</div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 24 }}>링크가 만료되었거나 잘못된 주소입니다</div>
        <Link href="/map" style={{ padding: "12px 28px", borderRadius: 12, background: "#16A34A", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          지도에서 찾아보기
        </Link>
      </div>
    )
  }

  const score = currentApt.final_score ?? currentApt.oreulji_score ?? 0
  const isFinalScore = currentApt.final_score != null
  const verdict = getAdvisoryVerdict(currentApt)
  const reasons = getThreeAxisReasons(currentApt)
  const priceStr = currentApt.price
    ? currentApt.price >= 10000 ? `${(currentApt.price / 10000).toFixed(1)}억` : `${currentApt.price.toLocaleString()}만`
    : null

  // 24개월 예상 가격 — apt_pred_pct(아파트 보정) 우선, 없으면 sido pred_pct 사용
  const hasAptForecast = currentApt.apt_pred_pct != null && currentApt.price != null
  const hasUp = currentApt.expected_gain != null && currentApt.price != null && currentApt.expected_gain !== 0
  const hasDown = currentApt.expected_loss != null && currentApt.price != null && currentApt.expected_loss > 0
  const hasForecast = hasAptForecast || hasUp || hasDown
  // apt 보정 예측 변화액
  const aptChange = hasAptForecast ? Math.round(currentApt.price! * currentApt.apt_pred_pct! / 100) : null
  const isUp = aptChange != null
    ? aptChange > 0
    : (hasUp && (!hasDown || (currentApt.expected_gain ?? 0) > (currentApt.expected_loss ?? 0)))
  const recommendationCopy = getRecommendationCopy(recommendationContext)
  const recommendationBadge = recommendationLabel(recommendationContext)
  const budgetFit = inferBudgetFit(currentApt.price ?? null, recommendationContext.budget ?? 0)
  const budgetFitCopy = getBudgetFitCopy(budgetFit)
  const shareAudience: ShareAudience = agentOffice || agentName ? "client" : "family"
  const shareIntentCopy = getShareIntentCopy(shareAudience)
  const agentContactHref = getAgentContactHref(agentPhone ?? undefined)
  const normalizedContext = normalizeRecommendationContext(recommendationContext)
  const reportPersona: ReportPersona = agentOffice || agentName
    ? "agent"
    : normalizedContext.purpose === "투자"
    ? "investor"
    : normalizedContext.purpose === "실거주"
    ? "first-home"
    : "general"
  const productId = reportPersona === "first-home" ? "first-home-pack" : "single-report"
  const decisionPack = getDecisionPack({ context: recommendationContext, budgetFit, buildYear: currentApt.build_year, persona: reportPersona, productId })
  const checklistPack = getChecklistPack({ productId, context: recommendationContext, persona: reportPersona })

  const dashboardParams = new URLSearchParams({
    apt: currentApt.apt_nm,
    address,
    lawdCd: currentApt.sigungu_cd ?? "",
    gateScore: String(currentApt.oreulji_score ?? ""),
    dbFinalScore: String(currentApt.final_score ?? ""),
    buildYear: String(currentApt.build_year ?? ""),
    aptId: String(currentApt.apt_id),
  })
  appendRecommendationParams(dashboardParams, recommendationContext)
  appendAgentShareParams(dashboardParams, {
    office: agentOffice ?? undefined,
    name: agentName ?? undefined,
    phone: agentPhone ?? undefined,
    leadName: leadName ?? undefined,
    reportPurpose: reportPurpose ?? undefined,
    intro: agentIntro ?? undefined,
  })
  if (leadId) dashboardParams.set("leadId", leadId)
  const dashboardUrl = `/dashboard?${dashboardParams.toString()}`

  // 공유 결론 카드 데이터
  const shareCardData = buildShareCard({
    ...currentApt,
    apt_nm: currentApt.apt_nm,
    address,
    price: currentApt.price ?? undefined,
  })

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px 48px" }}>

      {/* 헤더 */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <img src="/logo.png" alt="오를지AI" style={{ height: 24, objectFit: "contain" }} />
        <span style={{ fontSize: 13, color: "#6B7280" }}>AI 아파트 분석</span>
      </div>

      {(leadName || reportPurpose) && (
        <div style={{ width: "100%", maxWidth: 480, background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#4338CA", marginBottom: 4 }}>
            {leadName ? `${leadName}님용 공유 리포트` : "상담용 공유 리포트"}
          </div>
          <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>
            {reportPurpose || "현재 검토 중인 목적에 맞춰 비교 포인트를 다시 정리한 링크입니다."}
          </div>
        </div>
      )}

      {/* 공유 결론 카드 (항상 표시) */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 14 }}>
        <ShareConclusionCard card={shareCardData} />
      </div>

      {/* 공유 버튼 */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
              .then(() => { alert("링크가 복사되었습니다") })
              .catch(() => { prompt("이 링크를 복사하세요:", window.location.href) })
          }}
          style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #E5E7EB",
            background: "#fff", fontSize: 13, fontWeight: 700, color: "#374151",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          🔗 링크 복사
        </button>
        <button
          onClick={() => {
            const text = `🏠 ${currentApt.apt_nm} — 오를지AI 분석 리포트\n\n📊 종합점수: ${score}점\n📈 24개월 전망: ${hasForecast ? (isUp ? "상승 우위" : "하락 주의") : "데이터 준비중"}\n🔗 ${window.location.href}`
            navigator.clipboard.writeText(text)
              .then(() => { alert("카카오톡에 붙여넣기 하세요! 텍스트가 복사되었습니다 📋") })
              .catch(() => { prompt("아래 텍스트를 복사해 카카오톡에 붙여넣으세요:", text) })
          }}
          style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "none",
            background: "#FEE500", fontSize: 13, fontWeight: 700, color: "#191919",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          💛 카톡으로 공유
        </button>
      </div>

      {isLoggedIn ? (
        <>
          {/* 단지 정보 */}
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, padding: "24px 22px", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>
          {address}{priceStr ? ` · ${priceStr}` : ""}
          {currentApt.risk_level ? ` · 리스크 ${currentApt.risk_level}` : ""}
          {currentApt.jeonse_risk_level ? ` · 전세 ${currentApt.jeonse_risk_level}` : ""}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginBottom: 18 }}>{currentApt.apt_nm}</div>

        {/* 24개월 방향 전망 — 수치 비노출 (레드팀 V3 판정, 2026-07-18) */}
        {hasForecast && (
          <div style={{
            background: isUp ? "linear-gradient(135deg, #059669, #16A34A)" : "linear-gradient(135deg, #DC2626, #EA580C)",
            borderRadius: 16, padding: "18px 20px", marginBottom: 16, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500, marginBottom: 6 }}>
              24개월 AI 방향 전망
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>
              {isUp ? "상승 우위" : "하락 주의"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
              오를지 엔진 기준 참고 방향{priceStr ? ` · 현재가 ${priceStr}` : ""}
            </div>
          </div>
        )}

        {/* 24개월 전망 분석 근거 — 아파트별 보정 factor 표시 */}
        {currentApt.apt_forecast_factors && currentApt.apt_forecast_factors.length > 0 && (
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 8 }}>24개월 전망 분석 근거</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {currentApt.apt_forecast_factors.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: f.impact === "positive" ? "#16A34A" : f.impact === "negative" ? "#DC2626" : "#9CA3AF",
                  }} />
                  <span style={{ fontWeight: 600, color: "#374151", minWidth: 70 }}>{f.label}</span>
                  <span style={{ color: f.impact === "positive" ? "#16A34A" : f.impact === "negative" ? "#DC2626" : "#6B7280", fontWeight: 700 }}>
                    {f.impact === "positive" ? "긍정" : f.impact === "negative" ? "부정" : "중립"}
                  </span>
                  <span style={{ color: "#6B7280" }}>{f.detail}</span>
                </div>
              ))}
            </div>
            {currentApt.apt_forecast_summary && (
              <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.6, padding: 10, background: "#EEF2FF", borderRadius: 8, borderLeft: "3px solid #6366F1" }}>
                {currentApt.apt_forecast_summary}
              </div>
            )}
          </div>
        )}

        {/* 결론 + 점수 */}
        <div style={{
          background: verdict.bg, border: `1.5px solid ${verdict.border}`,
          borderRadius: 16, padding: "16px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, marginBottom: 6, lineHeight: 1 }}>{verdict.emoji}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: verdict.color, lineHeight: 1.3 }}>{verdict.label}</div>
            <div style={{ fontSize: 12, color: verdict.color, opacity: 0.82, marginTop: 4, lineHeight: 1.5 }}>{verdict.sub}</div>
          </div>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: scoreGradient(score),
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              color: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 9, opacity: 0.75 }}>/ 100</div>
            </div>
            <div style={{ fontSize: 9, color: "#9CA3AF" }}>{isFinalScore ? "종합점수" : "오를지 점수"}</div>
          </div>
        </div>

        {/* 3축 상담 요약 */}
        {reasons.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reasons.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14 }}>
                <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 15, color: r.positive ? "#16A34A" : "#DC2626", marginTop: 1 }}>
                  {r.positive ? "✓" : "✗"}
                </span>
                <span style={{ color: r.positive ? "#166534" : "#991B1B", lineHeight: 1.5 }}>
                  <strong>{r.axis}:</strong> {r.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 최근 실거래 내역 */}
      {Array.isArray(currentApt.recent_trades) && currentApt.recent_trades.length > 0 && (
        <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 10 }}>최근 실거래 내역</div>
          <div style={{ display: "grid", gap: 6 }}>
            {currentApt.recent_trades.slice(0, 5).map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>
                  {t.ym}{t.pyeong ? ` · ${t.pyeong}평` : ""}{t.floor ? ` · ${t.floor}층` : ""}
                </span>
                <span style={{ fontWeight: 700, color: "#111827" }}>
                  {t.price_man?.toLocaleString()}만
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 6 }}>{recommendationBadge}</div>
        <div style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.6, marginBottom: 12 }}>
          {recommendationCopy.shareNote}
        </div>
        <div style={{ fontSize: 12, color: "#3730A3", fontWeight: 700, lineHeight: 1.5, marginBottom: 12 }}>
          {budgetFitCopy.shareNote}
        </div>
        <div style={{ fontSize: 12, color: "#166534", fontWeight: 700, lineHeight: 1.5, marginBottom: 12 }}>
          {shareIntentCopy.sharePageHint}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href={dashboardUrl} style={{
            display: "block", width: "100%", padding: "16px", borderRadius: 14, textAlign: "center",
            background: "#16A34A", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none",
            boxSizing: "border-box",
          }}>
            {budgetFitCopy.sharePrimaryCta}
          </Link>
          <Link href="/map" style={{
            display: "block", width: "100%", padding: "14px", borderRadius: 14, textAlign: "center",
            background: "#F8FAFC", color: "#374151", fontSize: 14, fontWeight: 600, textDecoration: "none",
            border: "1px solid #E5E7EB", boxSizing: "border-box",
          }}>
            {budgetFitCopy.shareSecondaryCta}
          </Link>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 480, display: "grid", gap: 14, marginBottom: 14 }}>
        <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#3730A3", marginBottom: 6 }}>
            공통 리포트 뒤에 관점 3개가 따로 열리는 링크
          </div>
          <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>
            신혼부부 총주거비 판단서가 먼저 열리고, 아래에서 중개사 비교/방어 브리프와 투자자 세후 손익표를 각각 펼쳐 볼 수 있는 공유용 링크입니다.
          </div>
          {proofPreview && (
            <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
              {proofPreview.lines.slice(0, 3).map((item) => (
                <div key={item} style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>
                  • {item}
                </div>
              ))}
            </div>
          )}
        </div>
        <DecisionPackCard
          title={shareAudience === "client" ? decisionPack.title : "배우자·가족과 바로 공유할 결론"}
          subtitle={shareAudience === "client" ? decisionPack.subtitle : "같이 의사결정할 사람에게 보여주기 쉬운 형태로 정리했습니다."}
          signals={decisionPack.signals}
        />
        <ChecklistBlock title={checklistPack.title} items={checklistPack.items} />
      </div>

      {/* 중개사 정보 */}
      {(agentName || agentOffice) && (
        <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8, fontWeight: 600 }}>상담 중개사</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #1B4FBB, #0A2463)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 16, fontWeight: 700, flexShrink: 0,
            }}>
              {(agentName || agentOffice || "중")[0]}
            </div>
            <div>
              {agentOffice && <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{agentOffice}</div>}
              {agentName && <div style={{ fontSize: 12, color: "#6B7280" }}>{agentName}{agentPhone ? ` · ${agentPhone}` : ""}</div>}
            </div>
          </div>
          {(reportPurpose || leadName || agentIntro) && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F3F4F6", display: "grid", gap: 6 }}>
              {reportPurpose && <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}><strong>리포트 목적:</strong> {reportPurpose}</div>}
              {leadName && <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}><strong>공유 대상:</strong> {leadName}</div>}
              {agentIntro && <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.7 }}>{agentIntro}</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 480, fontSize: 12, color: "#9CA3AF", textAlign: "center", marginBottom: shareAudience === "client" ? 120 : 20, lineHeight: 1.6 }}>
        {agentOffice
          ? `본 분석은 ${agentOffice}${agentName ? `(${agentName})` : ""}이(가) 제공하는 AI 참고 자료입니다.`
          : "오를지AI는 상담 보조용 참고 자료를 제공합니다."}
        <br />
        <span style={{ color: "#6366F1", fontWeight: 700 }}>{recommendationBadge}</span> · {recommendationCopy.shareNote}
      </div>

      {shareAudience === "client" && (
        <div style={{
          position: "sticky",
          bottom: 0,
          width: "100%",
          maxWidth: 520,
          padding: "12px 12px calc(12px + env(safe-area-inset-bottom))",
          marginTop: "auto",
        }}>
          <div style={{
            background: "rgba(17,24,39,0.96)",
            borderRadius: 18,
            padding: "14px 14px 12px",
            boxShadow: "0 12px 30px rgba(15,23,42,0.28)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#BFDBFE", marginBottom: 4 }}>{shareIntentCopy.stickyTitle}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, marginBottom: 12 }}>
              {leadName ? `${leadName}님 기준으로 ` : ""}{reportPurpose || shareIntentCopy.stickyDescription}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: agentContactHref ? "1fr 1fr" : "1fr", gap: 8 }}>
              {agentContactHref && (
                <a
                  href={agentContactHref}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    textAlign: "center",
                    padding: "12px",
                    borderRadius: 12,
                    background: "#16A34A",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {shareIntentCopy.contactButtonLabel}
                </a>
              )}
              <Link
                href={dashboardUrl}
                style={{
                  display: "block",
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "12px",
                  borderRadius: 12,
                  background: "#F8FAFC",
                  color: "#111827",
                  fontSize: 13,
                  fontWeight: 800,
                  border: "1px solid #E5E7EB",
                }}
              >
                {shareIntentCopy.secondaryButtonLabel}
              </Link>
            </div>
          </div>
        </div>
      )}

        </>
      ) : (
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "28px 24px", textAlign: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 14,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
              전체 분석 리포트 보기
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 18 }}>
              로그인하면 3축 리스크 분석, 예상 가격 시나리오,<br />
              체크리스트 등 전체 리포트를 볼 수 있습니다
            </div>
            <Link href={`/login?redirect=/share/${aptId}`} style={{
              display: "block", width: "100%", padding: "14px", borderRadius: 12,
              background: "#16A34A", color: "#fff", fontSize: 14, fontWeight: 700,
              textDecoration: "none", marginBottom: 8, boxSizing: "border-box",
            }}>
              로그인하고 전체 보기
            </Link>
            <Link href="/map" style={{
              display: "block", width: "100%", padding: "12px", borderRadius: 12,
              background: "#F8FAFC", color: "#374151", fontSize: 13, fontWeight: 600,
              textDecoration: "none", border: "1px solid #E5E7EB", boxSizing: "border-box",
            }}>
              지도에서 찾아보기
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}
