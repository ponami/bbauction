"use client"

import type { PersonaSheet } from "@/lib/reportPersonaSheets"

interface PersonaSheetCardProps {
  sheet: PersonaSheet
  hideHeader?: boolean
  embedded?: boolean
}

export default function PersonaSheetCard({ sheet, hideHeader = false, embedded = false }: PersonaSheetCardProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: embedded ? 0 : 12,
        border: embedded ? "none" : "1px solid #E5E7EB",
        overflow: "hidden",
      }}
    >
      {!hideHeader && (
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{sheet.title}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>{sheet.summary}</div>
        </div>
      )}

      <div style={{ padding: hideHeader ? "14px 16px 16px" : "14px 16px", display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          {sheet.metrics.map((metric) => (
            <div key={`${sheet.id}-${metric.label}`} style={{ background: "#F9FAFB", borderRadius: 10, border: "1px solid #E5E7EB", padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{metric.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", lineHeight: 1.4 }}>{metric.value}</div>
              {metric.note && <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>{metric.note}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {sheet.sections.map((section) => (
            <div key={`${sheet.id}-${section.title}`} style={{ background: "#F9FAFB", borderRadius: 10, border: "1px solid #E5E7EB", padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 8 }}>{section.title}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {section.items.map((item) => (
                  <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#16A34A", fontWeight: 800, flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.65 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {sheet.footnote && (
          <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>{sheet.footnote}</div>
        )}
      </div>
    </div>
  )
}
