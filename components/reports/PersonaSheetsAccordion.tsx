"use client"

import { useEffect, useMemo, useState } from "react"

import PersonaSheetCard from "@/components/reports/PersonaSheetCard"
import type { PersonaSheet } from "@/lib/reportPersonaSheets"

const BADGE_STYLE: Record<PersonaSheet["persona"], { color: string; background: string }> = {
  "first-home": { color: "#166534", background: "#DCFCE7" },
  agent: { color: "#1D4ED8", background: "#DBEAFE" },
  investor: { color: "#7C3AED", background: "#EDE9FE" },
}

export default function PersonaSheetsAccordion({ sheets }: { sheets: PersonaSheet[] }) {
  const defaultOpenId = useMemo(
    () => sheets.find((sheet) => sheet.defaultOpen)?.id ?? sheets[0]?.id ?? "",
    [sheets]
  )
  const [openSheetId, setOpenSheetId] = useState(defaultOpenId)

  useEffect(() => {
    setOpenSheetId(defaultOpenId)
  }, [defaultOpenId])

  if (sheets.length === 0) return null

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {sheets.map((sheet) => {
        const isOpen = openSheetId === sheet.id
        const badgeStyle = BADGE_STYLE[sheet.persona]

        return (
          <div
            key={sheet.id}
            style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}
          >
            <button
              type="button"
              onClick={() => setOpenSheetId((current) => (current === sheet.id ? "" : sheet.id))}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                border: "none",
                background: "#FFFFFF",
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: badgeStyle.color,
                      background: badgeStyle.background,
                      borderRadius: 9999,
                      padding: "3px 8px",
                    }}
                  >
                    {sheet.audienceLabel}
                  </span>
                  {sheet.defaultOpen && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#166534",
                        background: "#F0FDF4",
                        borderRadius: 9999,
                        padding: "3px 8px",
                      }}
                    >
                      기본으로 먼저 열림
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{sheet.title}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>{sheet.summary}</div>
              </div>

              <span
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#6B7280",
                  paddingTop: 4,
                }}
              >
                {isOpen ? "접기 ▲" : "열기 ▼"}
              </span>
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid #F3F4F6" }}>
                <PersonaSheetCard sheet={sheet} hideHeader embedded />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
