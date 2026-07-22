"use client"

import { getEntitlementLabel, type EntitlementKey } from "@/lib/planLimits"

interface ComparisonRow {
  label: string
  values: Record<EntitlementKey, string>
}

export default function PlanComparison({
  rows,
  columns,
}: {
  rows: ComparisonRow[]
  columns: EntitlementKey[]
}) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1E293B" }}>
      <div style={{ display: "grid", gridTemplateColumns: `1.4fr repeat(${columns.length}, 1fr)`, background: "#1E293B", padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: "#64748B" }} />
        {columns.map((column) => (
          <div key={column} style={{ fontSize: 12, fontWeight: 700, color: column === "agent_pro" ? "#FFD700" : "#94A3B8", textAlign: "center" }}>
            {getEntitlementLabel(column)}
          </div>
        ))}
      </div>
      {rows.map((row, index) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: `1.4fr repeat(${columns.length}, 1fr)`,
            background: index % 2 === 0 ? "#0F172A" : "#131F30",
            padding: "10px 12px",
            borderTop: "1px solid #1E293B",
          }}
        >
          <div style={{ fontSize: 12, color: "#94A3B8" }}>{row.label}</div>
          {columns.map((column) => (
            <div
              key={`${row.label}-${column}`}
              style={{
                fontSize: 12,
                fontWeight: column === "agent_pro" ? 700 : 600,
                color: column === "agent_pro" ? "#FFD700" : "#CBD5E1",
                textAlign: "center",
              }}
            >
              {row.values[column]}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
