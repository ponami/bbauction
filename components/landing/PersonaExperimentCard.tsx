"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { FREE_PAID_BOUNDARY } from "@/lib/pricingCopy"
import { trackAnalyticsEvent } from "@/lib/analytics"
import {
  LANDING_PERSONAS,
  LANDING_VARIANTS,
  normalizeLandingPersona,
  normalizeLandingVariant,
  type LandingPersonaId,
  type LandingVariant,
} from "@/lib/landingExperiment"

const VARIANT_KEY = "orulzi_landing_variant"

function assignStoredVariant(forcedVariant?: LandingVariant | null) {
  if (forcedVariant) return forcedVariant
  if (typeof window === "undefined") return "proof" as LandingVariant

  const stored = window.localStorage.getItem(VARIANT_KEY)
  if (stored === "proof" || stored === "decision") return stored

  const next: LandingVariant = Math.random() > 0.5 ? "proof" : "decision"
  window.localStorage.setItem(VARIANT_KEY, next)
  return next
}

export default function PersonaExperimentCard({ onStart }: { onStart: (dontShowAgain: boolean) => void }) {
  const [persona, setPersona] = useState<LandingPersonaId>("newlywed")
  const [variant, setVariant] = useState<LandingVariant>("proof")
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const trackedKeyRef = useRef("")

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const nextPersona = normalizeLandingPersona(searchParams.get("persona"))
    const forcedVariant = searchParams.get("variant")
    const nextVariant = assignStoredVariant(forcedVariant ? normalizeLandingVariant(forcedVariant) : null)
    setPersona(nextPersona)
    setVariant(nextVariant)
  }, [])

  useEffect(() => {
    const key = `${persona}:${variant}`
    if (trackedKeyRef.current === key) return
    trackedKeyRef.current = key

    void trackAnalyticsEvent({
      eventType: "landing_view",
      funnel: "consumer",
      source: "home",
      meta: { persona, variant },
    })
  }, [persona, variant])

  const copy = LANDING_PERSONAS[persona]
  const variantCopy = LANDING_VARIANTS[variant]
  const heroLine = useMemo(
    () =>
      variant === "proof"
        ? "전국 순위·후회 신호의 과거 검증 적중률을 숫자 그대로 함께 표기합니다"
        : "후보 2개를 나란히 — 계약 직전 마지막 판단을 1:1 비교로 정리합니다",
    [variant],
  )

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, #059669, #16A34A)",
          borderRadius: 16,
          padding: "20px 20px",
          marginBottom: 16,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {Object.values(LANDING_PERSONAS).map((item) => (
            <button
              key={item.id}
              onClick={() => setPersona(item.id)}
              style={{
                border: "none",
                borderRadius: 9999,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: item.id === persona ? "#FFFFFF" : "rgba(255,255,255,0.16)",
                color: item.id === persona ? "#15803D" : "#FFFFFF",
              }}
            >
              {item.tab}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.18)",
            color: "#FFFFFF",
            borderRadius: 9999,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          {copy.badge}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.45, marginBottom: 10 }}>
          {copy.headline}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.7, marginBottom: 8 }}>
          {copy.summary}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{heroLine}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[FREE_PAID_BOUNDARY.free, FREE_PAID_BOUNDARY.paid].map((item, idx) => (
          <div
            key={item}
            style={{
              flex: 1,
              background: idx === 0 ? "#F8FAFC" : "#EFF6FF",
              color: idx === 0 ? "#475569" : "#1D4ED8",
              border: `1px solid ${idx === 0 ? "#E5E7EB" : "#BFDBFE"}`,
              borderRadius: 12,
              padding: "10px 8px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        {copy.stats.map((item) => (
          <div key={item.label} style={{ background: "#F0FDF4", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#16A34A", marginBottom: 2 }}>{item.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#1D4ED8", marginBottom: 6 }}>랜딩 실험 메시지</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{variantCopy.title}</div>
        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>{variantCopy.body}</div>
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {copy.bullets.map((item) => (
          <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
            <span style={{ color: "#16A34A", fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="landing-checkbox-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B7280", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{
                accentColor: "#16A34A",
                width: 16, height: 16,
                cursor: "pointer",
              }}
            />
            <span>다음부터 이 화면 보지 않기</span>
          </label>
          <Link
            href="/how-it-works"
            style={{
              fontSize: 12,
              color: "#16A34A",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            엔진 더 알아보기 →
          </Link>
        </div>

        <button
          onClick={() => {
            void trackAnalyticsEvent({
              eventType: "landing_cta_click",
              funnel: "consumer",
              source: "home",
              meta: { persona, variant },
            })
            onStart(dontShowAgain)
          }}
          style={{
            width: "100%",
            height: 54,
            background: "#16A34A",
            color: "#fff",
            border: "none",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "-0.3px",
          }}
        >
          {copy.cta}
        </button>
      </div>
      <style>{`
        @media (max-width: 480px) {
          .landing-checkbox-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .landing-checkbox-row a {
            padding-left: 4px !important;
          }
        }
      `}</style>
    </>
  )
}
