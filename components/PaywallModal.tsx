"use client"

import { useEffect, useState } from "react"
import DecisionPackCard from "@/components/reports/DecisionPackCard"
import ChecklistBlock from "@/components/reports/ChecklistBlock"
import { FREE_PAID_BOUNDARY } from "@/lib/pricingCopy"
import { BILLING_SKUS, getBillingSkuConfig, type BillingSku } from "@/lib/planLimits"
import { trackAnalyticsEvent } from "@/lib/analytics"
import { triggerPayment } from "@/lib/payment"
import { canSellOnlineOnAndroid } from "@/lib/billing/guards"
import {
  CONSUMER_REPORT_PRODUCTS,
  getChecklistPack,
  getDecisionPack,
  type ConsumerReportProductId,
  type ReportPersona,
} from "@/lib/reportProducts"
import type { ReportProofPreview } from "@/lib/reportProofPreview"

type Trigger = "scenario" | "ml-forecast"

const TRIGGER_COPY: Record<Trigger, {
  title: string
  desc: string
  onceLabel: string
  onceSub: string
  urgency: string
}> = {
  "scenario": {
    title: "집 사기 전 판단 리포트",
    desc: "무료로는 후보를 찾고,\n유료 리포트에서는 결론·비교·체크포인트까지 확인하세요.",
    onceLabel: "단일 단지 심층 리포트 열기",
    onceSub: "9,900원 · 후보 1개 · 결론·비교 근거 확인",
    urgency: "📋 계약 전에 데이터로 한 번 더 확인해보세요",
  },
  "ml-forecast": {
    title: "24개월 판단 리포트",
    desc: "무료 탐색에서 보던 점수를 넘어서,\n유료 리포트에서 가격 흐름과 계약 전 체크포인트를 같이 확인하세요.",
    onceLabel: "단일 단지 심층 리포트 열기",
    onceSub: "9,900원 · 후보 1개 · 24개월 참고 흐름 포함",
    urgency: "📋 매수 전 데이터로 리스크를 확인해보세요",
  },
}

interface Props {
  aptName?: string
  aptId?: number
  lawdCd?: string
  aptPrice?: number | null   // 만원 단위 (gate API price 필드)
  trigger?: Trigger
  onClose: () => void
  onSuccess?: (result: {
    type: "once"
    sku: BillingSku
  }) => void
}

const PRODUCT_SKU: Record<ConsumerReportProductId, BillingSku> = {
  "single-report": "single-report",
  "compare-pack": "compare-pack",
  "first-home-pack": "first-home-pack",
}

export default function PaywallModal({ aptName, aptId, lawdCd, aptPrice, trigger = "scenario", onClose, onSuccess }: Props) {
  // 아파트 가격 대비 비율 계산 (9,900원 기준)
  const roiLabel = (() => {
    if (!aptPrice || aptPrice <= 0) return null
    const aptWon = aptPrice * 10000          // 만원 → 원
    const ratio = (9900 / aptWon * 100).toFixed(3)
    const aptEok = (aptPrice / 10000).toFixed(1)
    return `${aptEok}억 매수 결정에 단 9,900원 — 집값의 ${ratio}%`
  })()
  const [loading, setLoading] = useState<BillingSku | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<BillingSku | null>(null)
  const [proofPreview, setProofPreview] = useState<ReportProofPreview | null>(null)
  const featuredProductId: ConsumerReportProductId = trigger === "ml-forecast" ? "first-home-pack" : "single-report"
  const featuredProduct = CONSUMER_REPORT_PRODUCTS.find((product) => product.id === featuredProductId) ?? CONSUMER_REPORT_PRODUCTS[0]
  const decisionPack = getDecisionPack({ productId: featuredProductId })
  const checklistPack = getChecklistPack({ productId: featuredProductId })
  const successConfig = success ? getBillingSkuConfig(success) : null

  useEffect(() => {
    void trackAnalyticsEvent({
      eventType: "paywall_view",
      funnel: "consumer",
      source: "paywall-modal",
      trigger,
      sku: PRODUCT_SKU[featuredProductId],
      aptId,
      aptName,
    })
  }, [aptId, aptName, featuredProductId, trigger])

  useEffect(() => {
    if (aptPrice == null || aptPrice <= 0) { setProofPreview(null); return }
    const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
    const purpose = search?.get("purpose") === "투자" ? "투자" : search?.get("purpose") === "실거주" ? "실거주" : ""
    const persona: ReportPersona = search?.get("reportMode") === "agent"
      ? "agent"
      : purpose === "투자"
      ? "investor"
      : featuredProductId === "first-home-pack"
      ? "first-home"
      : "general"
    fetch("/api/proof-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona,
        purpose,
        targetPrice: aptPrice ?? null,
        budget: search?.get("budget") ? Number(search.get("budget")) || 0 : null,
        cashOnHand: search?.get("cash") ? Number(search.get("cash")) || 0 : search?.get("cashOnHand") ? Number(search.get("cashOnHand")) || 0 : null,
        loanAmount: search?.get("loanAmount") ? Number(search.get("loanAmount")) || 0 : null,
        ltvPct: search?.get("ltvPct") ? Number(search.get("ltvPct")) || 0 : null,
        interestRate: search?.get("interestRate") ? Number(search.get("interestRate")) || 0 : null,
        loanYears: search?.get("loanYears") ? Number(search.get("loanYears")) || 0 : null,
        homesOwned: search?.get("homesOwned") ? Number(search.get("homesOwned")) || 0 : null,
        moveCost: search?.get("moveCost") ? Number(search.get("moveCost")) || 0 : null,
        interiorCost: search?.get("interiorCost") ? Number(search.get("interiorCost")) || 0 : null,
        monthlyFixedCost: search?.get("monthlyFixedCost") ? Number(search.get("monthlyFixedCost")) || 0 : null,
      }),
    }).then(r => r.json()).then(json => {
      if (json.data) setProofPreview(json.data)
    }).catch(() => setProofPreview(null))
  }, [aptPrice, featuredProductId])

  async function handlePayment(sku: BillingSku) {
    const config = getBillingSkuConfig(sku)
    if (!config) return
    setLoading(sku)
    setError("")
    void trackAnalyticsEvent({
      eventType: "product_select",
      funnel: "consumer",
      source: "paywall-modal",
      trigger,
      sku,
      aptId,
      aptName,
    })
    try {
      // Play Store 등록(Google Play Billing) 방어
      // Android에서는 consumer "once" 상품만 판매 (단건 리포트 등).
      // guards.ts에서 Android non-once 차단. PaywallModal은 consumer SKU만 노출하지만
      // 명시적 가드 + config.storageType 확인으로 안전성 확보 (Play Store 정책 준수).
      if (typeof window !== "undefined") {
        const win = window as any
        if (win.Capacitor?.getPlatform?.() === "android") {
          // consumer config만 여기 도달하므로 대부분 통과, 하지만 중앙 정책 준수
          if (!canSellOnlineOnAndroid(config)) {
            throw new Error("Android 앱에서는 현재 단건 리포트만 구매할 수 있습니다.")
          }
        }
      }

      const confirmData = await triggerPayment({
        sku,
        aptId,
        aptName,
        lawdCd,
        type: config.storageType,
      })

      setSuccess(sku)
      void trackAnalyticsEvent({
        eventType: "payment_complete",
        funnel: "consumer",
        source: "paywall-modal",
        trigger,
        sku: confirmData.sku ?? sku,
        aptId,
        aptName,
      })
      onSuccess?.({ type: "once", sku })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "결제 중 오류가 발생했습니다")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1300,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "100%", maxWidth: 480,
        maxHeight: "92vh", overflowY: "auto",
        background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "28px 24px 40px",
        fontFamily: "'Pretendard', sans-serif",
      }}>
        {/* 핸들 */}
        <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 20px" }} />

        {/* 결제 성공 화면 */}
        {success && (
            <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
                {successConfig?.successTitle || "결제가 완료됐습니다!"}
              </div>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, lineHeight: 1.6 }}>
                {successConfig?.successDescription || "아래 버튼을 눌러 바로 확인하세요."}
              </div>
              <button onClick={onClose} style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: "#16A34A", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}>
                리포트 바로 보기 →
              </button>
            </div>
          )}

        {!success && (
          <>
            {aptName && (
              <div style={{ fontSize: 12, color: "#6366F1", fontWeight: 600, marginBottom: 6 }}>
                📍 {aptName}
              </div>
            )}
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
              {TRIGGER_COPY[trigger].title}
            </h2>
            {roiLabel && (
              <div style={{
                background: "#FEF9C3", border: "1px solid #FDE047",
                borderRadius: 8, padding: "7px 12px", marginBottom: 10,
                fontSize: 12, fontWeight: 700, color: "#92400E",
              }}>
                💰 {roiLabel}
              </div>
            )}
            <div style={{ background: "#FEF2F2", borderRadius: 7, padding: "6px 12px", marginBottom: 10, fontSize: 12, fontWeight: 700, color: "#DC2626" }}>
              {TRIGGER_COPY[trigger].urgency}
            </div>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16, lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {TRIGGER_COPY[trigger].desc}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[FREE_PAID_BOUNDARY.free, FREE_PAID_BOUNDARY.paid].map((item, idx) => (
                <div key={item} style={{
                  background: idx === 0 ? "#F8FAFC" : "#EFF6FF",
                  border: `1px solid ${idx === 0 ? "#E5E7EB" : "#BFDBFE"}`,
                  borderRadius: 10,
                  padding: "10px 8px",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: idx === 0 ? "#475569" : "#1D4ED8",
                }}>
                  {item}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
              {CONSUMER_REPORT_PRODUCTS.map((product) => {
                const featured = product.id === featuredProductId
                return (
                  <div
                    key={product.id}
                    style={{
                      background: featured ? "#F0FDF4" : "#F9FAFB",
                      border: featured ? "1px solid #86EFAC" : "1px solid #E5E7EB",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{product.title}</div>
                        {featured && (
                          <span style={{ background: "#16A34A", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 9999, padding: "2px 6px" }}>
                            지금 추천
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: featured ? "#16A34A" : "#6366F1", whiteSpace: "nowrap" }}>{product.price}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, marginBottom: 6 }}>{product.summary}</div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {product.included.map((item) => (
                        <div key={item} style={{ fontSize: 11, color: "#374151", lineHeight: 1.5 }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
              <DecisionPackCard
                title={`${featuredProduct.title}에서 바로 정리되는 결론`}
                subtitle={decisionPack.subtitle}
                signals={decisionPack.signals}
              />
              <ChecklistBlock title={checklistPack.title} items={checklistPack.items} />
              <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                  결제 후 추가로 열리는 공통 리포트 + 관점별 시트
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  {(featuredProductId === "first-home-pack"
                    ? [
                        "공통 판단 리포트 뒤에 신혼부부 총주거비 판단서가 먼저 열림",
                        "아래에서 중개사 비교/방어 브리프와 투자자 세후 손익표를 따로 펼쳐 확인",
                        "예산·대안·출구 전략을 한 문서 안에서 관점별로 분리해 읽는 구조",
                      ]
                    : featuredProductId === "single-report"
                    ? [
                        "공통 판단 리포트 뒤에 신혼부부·중개사·투자자 관점 3개가 각각 열림",
                        "기본은 신혼부부 판단서부터 보고, 필요할 때 상담/투자 시트를 추가 확인",
                        "총주거비·상담 방어·세후 손익을 한 번에 비교 가능한 유료 구조",
                      ]
                    : [
                        "공통 리포트 + 관점별 3개 시트를 한 링크 안에서 함께 확인",
                        "배우자/가족 공유용 판단서와 전문가용 브리프가 분리되어 열림",
                        "계약 전 체크리스트와 비교표까지 같은 흐름으로 제공",
                      ]).map((item) => (
                    <div key={item} style={{ fontSize: 12, color: "#374151", lineHeight: 1.55 }}>
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
              {proofPreview && (
                <div style={{ background: "#EEF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1D4ED8", marginBottom: 6 }}>
                    {proofPreview.title}
                  </div>
                  <div style={{ display: "grid", gap: 5 }}>
                    {proofPreview.lines.map((item) => (
                      <div key={item} style={{ fontSize: 12, color: "#334155", lineHeight: 1.55 }}>
                        • {item}
                      </div>
                    ))}
                  </div>
                  {proofPreview.note && (
                    <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.6, marginTop: 8 }}>
                      {proofPreview.note}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 신뢰 지표 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { icon: "🏠", stat: "12,400+", label: "분석 아파트" },
                { icon: "📊", stat: "실거래",   label: "데이터 기반" },
                { icon: "🔒", stat: "암호화",   label: "안전 저장" },
              ].map(({ icon, stat, label }) => (
                <div key={label} style={{
                  flex: 1, textAlign: "center", background: "#F9FAFB",
                  borderRadius: 10, padding: "8px 6px", border: "1px solid #E5E7EB",
                }}>
                  <div style={{ fontSize: 14 }}>{icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginTop: 2 }}>{stat}</div>
                  <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <a href="/sample" target="_blank" style={{ fontSize: 12, color: "#6366F1", textDecoration: "underline" }}>
                샘플 분석 미리보기 →
              </a>
            </div>

            {/* 포함 항목 체크리스트 */}
            <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#15803D", marginBottom: 8 }}>리포트에 포함된 항목</div>
              {[
                "결론형 계산표 / 비교표",
                "페르소나별 판단 시트 또는 상담 브리프",
                "24개월 오를지 엔진 예측 + 출구 전략 분석",
                "같은 예산 대안 단지 비교",
                "리포트 저장 및 공유용 요약",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", marginBottom: 4 }}>
                  <span style={{ color: "#16A34A", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>

            {/* 면책 고지 — 결제 버튼 바로 위 */}
            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 11, color: "#6B7280", lineHeight: 1.7 }}>
              본 분석은 공공 실거래 데이터 기반 AI 참고 정보이며, 특정 부동산의 매수·매도를 권유하지 않습니다. 투자 결과에 대한 책임은 이용자 본인에게 있으며, 최종 결정 전 공인중개사 등 전문가와 반드시 상담하세요.{" "}
              <a href="/terms" target="_blank" style={{ color: "#6366F1", textDecoration: "underline" }}>이용약관</a>{" "}·{" "}
              <a href="/privacy" target="_blank" style={{ color: "#6366F1", textDecoration: "underline" }}>개인정보처리방침</a>{" "}·{" "}
              <a href="/refund" target="_blank" style={{ color: "#6366F1", textDecoration: "underline" }}>환불정책</a>
            </div>

            {error && (
              <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {CONSUMER_REPORT_PRODUCTS.map((product) => {
                const sku = PRODUCT_SKU[product.id]
                const config = BILLING_SKUS[sku]
                const featured = product.id === featuredProductId
                return (
                  <button
                    key={sku}
                    onClick={() => handlePayment(sku)}
                    disabled={loading !== null}
                    style={{
                      width: "100%",
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: loading === sku ? "#9CA3AF" : featured ? "#16A34A" : "#1B4FBB",
                      border: "none",
                      cursor: loading !== null ? "not-allowed" : "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
                        {loading === sku ? "결제 진행 중..." : product.title}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
                        {product.summary}
                      </div>
                    </div>
                    <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>
                      {config.amount.toLocaleString("ko-KR")}원
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", marginBottom: 20, fontSize: 11, color: "#6B7280", lineHeight: 1.7 }}>
              개인 월 구독은 신규 판매를 닫고, 소비자 결제는 단일/비교/첫 매수 판단팩 중심으로 정리했습니다.
            </div>

             <button
               onClick={onClose}
              style={{ width: "100%", padding: "12px", background: "none", border: "none", color: "#9CA3AF", fontSize: 14, cursor: "pointer" }}
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
