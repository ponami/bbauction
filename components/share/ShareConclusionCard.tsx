"use client"

import { useRef, useState } from "react"
import type { ShareCardData } from "@/lib/shareCardBuilder"

const METRIC_COLORS: Record<string, { bg: string; text: string }> = {
  green:  { bg: "#D1FAE5", text: "#059669" },
  amber:  { bg: "#FEF3C7", text: "#D97706" },
  red:    { bg: "#FEE2E2", text: "#DC2626" },
  neutral: { bg: "#F3F4F6", text: "#6B7280" },
}

function gradient(score: number): string {
  if (score >= 75) return "linear-gradient(135deg,#27AE60,#16A34A)"
  if (score >= 64) return "linear-gradient(135deg,#2ECC71,#10B981)"
  if (score >= 56) return "linear-gradient(135deg,#F1C40F,#F59E0B)"
  if (score >= 50) return "linear-gradient(135deg,#E67E22,#F59E0B)"
  return "linear-gradient(135deg,#E74C3C,#DC2626)"
}

/**
 * 공유 결론 카드
 * - 3줄 요약 (강점/리스크/결론)
 * - 핵심 수치 4개
 * - 점수 뱃지
 * - 화면에 렌더링되는 UI 컴포넌트
 */
export default function ShareConclusionCard({ card }: { card: ShareCardData }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  async function handleSaveImage() {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement("a")
      link.download = `orulzi-${card.aptName.replace(/\s/g, "")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (e) {
      console.error("이미지 저장 실패", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {/* ── 카드 본체 ── */}
      <div ref={cardRef} style={{
        background: "#fff",
        borderRadius: 20,
        padding: "22px 20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
        fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
        maxWidth: 480,
      }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#111827", lineHeight: 1.3 }}>{card.aptName}</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{card.address}</div>
        </div>
        {/* 점수 원형 뱃지 */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: gradient(card.score),
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{card.score}</span>
          <span style={{ fontSize: 8, opacity: 0.75 }}>/100</span>
        </div>
      </div>

      {/* 3줄 요약 */}
      <div style={{
        padding: "12px 14px", borderRadius: 12,
        background: "#F8FAFC", border: "1px solid #E2E8F0",
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 8 }}>오를지AI 요약</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <SummaryLine icon="✅" text={card.summary.strength} color="#059669" />
          <SummaryLine icon="⚠️" text={card.summary.risk} color="#D97706" />
          <SummaryLine icon="💡" text={card.summary.conclusion} color="#6366F1" />
        </div>
      </div>

      {/* 핵심 수치 4개 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {card.metrics.map((m, i) => {
          const c = METRIC_COLORS[m.color] ?? METRIC_COLORS.neutral
          return (
            <div key={i} style={{
              padding: "10px 12px", borderRadius: 10,
              background: c.bg, textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: c.text, opacity: 0.7, marginBottom: 2, fontWeight: 600 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: c.text }}>
                {m.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* 결론 라벨 */}
      <div style={{
        padding: "8px 12px", borderRadius: 8,
        background: gradient(card.score),
        color: "#fff", fontSize: 11, fontWeight: 600,
        textAlign: "center", lineHeight: 1.5,
      }}>
        {card.scoreLabel}
      </div>

      {/* ── 저장 버튼 ── */}
      <div style={{ marginTop: 10, textAlign: "center" }}>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            background: saving ? "#F3F4F6" : "#fff",
            fontSize: 13,
            fontWeight: 700,
            color: saving ? "#9CA3AF" : "#374151",
            cursor: saving ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
          }}
        >
          {saving ? "⏳ 저장 중..." : "💾 이미지로 저장"}
        </button>
      </div>
      </div>
    </div>
  )
}

function SummaryLine({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 12, color, lineHeight: 1.5, fontWeight: 500 }}>{text}</span>
    </div>
  )
}
