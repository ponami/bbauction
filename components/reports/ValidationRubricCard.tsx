"use client"

import type { ValidationRubric } from "@/lib/reportValidationRubric"

export default function ValidationRubricCard({ rubric }: { rubric: ValidationRubric }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{rubric.title}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>{rubric.summary}</div>
      </div>
      <div style={{ padding: "14px 16px", display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#3730A3", marginBottom: 8 }}>검수 질문</div>
          <div style={{ display: "grid", gap: 6 }}>
            {rubric.questions.map((question) => (
              <div key={question} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#4F46E5", fontWeight: 800, flexShrink: 0 }}>?</span>
                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.65 }}>{question}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#15803D", marginBottom: 8 }}>통과 기준</div>
          <div style={{ display: "grid", gap: 6 }}>
            {rubric.passCriteria.map((criterion) => (
              <div key={criterion} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#16A34A", fontWeight: 800, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.65 }}>{criterion}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#B45309", marginBottom: 8 }}>숫자 체크</div>
          <div style={{ display: "grid", gap: 6 }}>
            {rubric.numericChecks.map((criterion) => (
              <div key={criterion} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#D97706", fontWeight: 800, flexShrink: 0 }}>#</span>
                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.65 }}>{criterion}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
