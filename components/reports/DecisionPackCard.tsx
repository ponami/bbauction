"use client"

import type { DecisionSignal } from "@/lib/reportProducts"

const TONE_STYLE = {
  good: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", badge: "#16A34A" },
  warn: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", badge: "#EA580C" },
  info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A8A", badge: "#2563EB" },
} as const

export default function DecisionPackCard({
  title,
  subtitle,
  signals,
}: {
  title: string
  subtitle?: string
  signals: DecisionSignal[]
}) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
        {signals.map((signal) => {
          const tone = TONE_STYLE[signal.tone]
          return (
            <div
              key={signal.label}
              style={{
                background: tone.bg,
                border: `1px solid ${tone.border}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: tone.badge }}>{signal.label}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: tone.text, marginBottom: 4 }}>{signal.headline}</div>
              <div style={{ fontSize: 12, color: tone.text, opacity: 0.9, lineHeight: 1.6 }}>{signal.detail}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
