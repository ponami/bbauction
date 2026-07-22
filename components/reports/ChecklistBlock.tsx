"use client"

export default function ChecklistBlock({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6", fontSize: 14, fontWeight: 800, color: "#111827" }}>
        {title}
      </div>
      <div style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
        {items.map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: "#16A34A", fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.65 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
