"use client"

import type { AgentModeState } from "@/lib/agentMode"

export default function AgentProfileForm({
  value,
  saved,
  onChange,
  onSave,
}: {
  value: AgentModeState
  saved: boolean
  onChange: (next: AgentModeState) => void
  onSave: () => void
}) {
  const update = <K extends keyof AgentModeState>(key: K, next: AgentModeState[K]) => {
    onChange({ ...value, [key]: next })
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
            📇 중개사 모드
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
            고객에게 보내는 링크에 중개사 정보, 고객 호칭, 리포트 목적을 함께 넣을 수 있습니다.
          </div>
        </div>
        <button
          onClick={() => update("enabled", !value.enabled)}
          style={{
            border: "none",
            borderRadius: 9999,
            padding: "7px 12px",
            background: value.enabled ? "#16A34A" : "#E5E7EB",
            color: value.enabled ? "#fff" : "#4B5563",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {value.enabled ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: value.enabled ? 1 : 0.65 }}>
        <input
          value={value.office}
          onChange={(e) => update("office", e.target.value)}
          placeholder="상호 (예: 서초부동산)"
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 8,
            border: "1px solid #E5E7EB", fontSize: 13, outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="담당자 이름"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none" }}
          />
          <input
            value={value.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="연락처"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={value.defaultLeadName}
            onChange={(e) => update("defaultLeadName", e.target.value)}
            placeholder="기본 고객 호칭 (예: 김수지 고객님)"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none" }}
          />
          <input
            value={value.defaultReportPurpose}
            onChange={(e) => update("defaultReportPurpose", e.target.value)}
            placeholder="기본 리포트 목적 (예: 신혼부부 첫 매수 상담)"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none" }}
          />
        </div>
        <textarea
          value={value.intro}
          onChange={(e) => update("intro", e.target.value)}
          placeholder="공유 페이지 하단 소개 문구 (예: 현장 답사 전 체크포인트까지 같이 정리해드립니다.)"
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8,
            border: "1px solid #E5E7EB", fontSize: 13, outline: "none", boxSizing: "border-box",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onSave}
            style={{
              padding: "9px 16px", borderRadius: 8, border: "none",
              background: "#16A34A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            저장
          </button>
          {saved && <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700 }}>저장되었습니다</span>}
          <span style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.6 }}>
            공유 시 표시: {value.enabled ? [value.office, value.name, value.phone].filter(Boolean).join(" · ") || "프로필 미입력" : "중개사 모드 OFF"}
          </span>
        </div>
      </div>
    </div>
  )
}
