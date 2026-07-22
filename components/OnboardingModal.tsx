"use client"

import { useState } from "react"

export type OnboardingData = {
  budget: number        // 만원 단위 (예: 60000 = 6억)
  targetRegion: string  // "서울 마포구" 등 자유 입력
  timeline: "3개월" | "6개월" | "1년" | "미정"
  purpose: "실거주" | "투자"
}

const STORAGE_KEY = "orulji_onboarding"

export function getOnboarding(): OnboardingData | null {
  if (typeof window === "undefined") return null
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export function setOnboarding(data: OnboardingData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearOnboarding() {
  localStorage.removeItem(STORAGE_KEY)
}

export function skipOnboarding() {
  // 건너뛴 상태도 저장해서 다음 방문 시 다시 안 뜨게
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ skipped: true }))
}

interface Props {
  onDone: (data: OnboardingData) => void
  onSkip: () => void
}

export default function OnboardingModal({ onDone, onSkip }: Props) {
  const [step, setStep] = useState(0)
  const [budget, setBudget]           = useState("")
  const [targetRegion, setTargetRegion] = useState("")
  const [timeline, setTimeline]       = useState<OnboardingData["timeline"] | "">("")
  const [purpose, setPurpose]         = useState<OnboardingData["purpose"] | "">("")

  function handleDone() {
    const data: OnboardingData = {
      budget:       parseInt(budget.replace(/,/g, "")) || 0,
      targetRegion: targetRegion.trim(),
      timeline:     (timeline || "미정") as OnboardingData["timeline"],
      purpose:      (purpose || "실거주") as OnboardingData["purpose"],
    }
    setOnboarding(data)
    onDone(data)
  }

  const steps = [
    {
      title: "예산이 어느 정도인가요?",
      sub: "대출 포함 총 매수 가능 금액 기준으로 입력해주세요",
      content: (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              value={budget}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, "")
                setBudget(v ? Number(v).toLocaleString() : "")
              }}
              placeholder="예: 65,000"
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB",
                fontSize: 16, fontWeight: 600, outline: "none",
              }}
            />
            <span style={{ fontSize: 14, color: "#6B7280", flexShrink: 0 }}>만원</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["40,000", "50,000", "60,000", "70,000", "80,000", "100,000"].map(v => (
              <button key={v} onClick={() => setBudget(v)} style={{
                padding: "7px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 600,
                background: budget === v ? "#16A34A" : "#F3F4F6",
                color: budget === v ? "#fff" : "#374151",
                border: "none", cursor: "pointer",
              }}>
                {(parseInt(v.replace(/,/g, "")) / 10000).toFixed(0)}억
              </button>
            ))}
          </div>
        </div>
      ),
      canNext: budget.length > 0,
    },
    {
      title: "어느 지역을 보고 계세요?",
      sub: "시/구 단위로 입력해주세요 (복수 가능)",
      content: (
        <div>
          <input
            type="text"
            value={targetRegion}
            onChange={e => setTargetRegion(e.target.value)}
            placeholder="예: 경기 김포시, 서울 강서구"
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: "1.5px solid #E5E7EB", fontSize: 15, outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["서울 전체", "경기 남부", "경기 북부", "인천", "수도권 전체"].map(v => (
              <button key={v} onClick={() => setTargetRegion(v)} style={{
                padding: "6px 12px", borderRadius: 9999, fontSize: 12,
                background: targetRegion === v ? "#16A34A" : "#F3F4F6",
                color: targetRegion === v ? "#fff" : "#374151",
                border: "none", cursor: "pointer",
              }}>{v}</button>
            ))}
          </div>
        </div>
      ),
      canNext: true, // 지역은 선택 사항
    },
    {
      title: "언제쯤 계약하실 예정인가요?",
      sub: "타이밍에 맞는 분석을 더 강조해서 보여드릴게요",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["3개월", "6개월", "1년", "미정"] as const).map(t => (
            <button key={t} onClick={() => setTimeline(t)} style={{
              padding: "14px 20px", borderRadius: 12, textAlign: "left",
              background: timeline === t ? "#F0FDF4" : "#F9FAFB",
              border: timeline === t ? "1.5px solid #16A34A" : "1.5px solid #E5E7EB",
              cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: timeline === t ? "#16A34A" : "#111827" }}>
                {t === "3개월" ? "3개월 이내" : t === "6개월" ? "6개월 이내" : t === "1년" ? "1년 이내" : "아직 미정"}
              </span>
              {timeline === t && <span style={{ color: "#16A34A", fontSize: 16 }}>✓</span>}
            </button>
          ))}
        </div>
      ),
      canNext: timeline !== "",
    },
    {
      title: "매수 목적은 무엇인가요?",
      sub: "실거주와 투자는 봐야 할 지표가 달라요",
      content: (
        <div style={{ display: "flex", gap: 12 }}>
          {(["실거주", "투자"] as const).map(p => (
            <button key={p} onClick={() => setPurpose(p)} style={{
              flex: 1, padding: "20px 16px", borderRadius: 14, textAlign: "center",
              background: purpose === p ? "#F0FDF4" : "#F9FAFB",
              border: purpose === p ? "1.5px solid #16A34A" : "1.5px solid #E5E7EB",
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{p === "실거주" ? "🏠" : "📈"}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: purpose === p ? "#16A34A" : "#111827" }}>{p}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                {p === "실거주" ? "학군·교통·입지 중심" : "시세 방향·수익률 중심"}
              </div>
            </button>
          ))}
        </div>
      ),
      canNext: purpose !== "",
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "28px 24px 40px",
        fontFamily: "'Pretendard', sans-serif",
      }}>
        {/* 핸들 + 진행 바 */}
        <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 9999,
              background: i <= step ? "#16A34A" : "#E5E7EB",
              transition: "background .3s",
            }} />
          ))}
        </div>

        {/* 스텝 카운트 */}
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
          {step + 1} / {steps.length}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
          {current.title}
        </h2>
        <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 20, lineHeight: 1.6 }}>
          {current.sub}
        </p>

        {current.content}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={onSkip}
            style={{
              padding: "12px 20px", borderRadius: 10, border: "1px solid #E5E7EB",
              background: "#fff", color: "#9CA3AF", fontSize: 13, cursor: "pointer",
            }}
          >
            건너뛰기
          </button>
          <button
            onClick={() => {
              if (isLast) handleDone()
              else setStep(s => s + 1)
            }}
            disabled={!current.canNext}
            style={{
              flex: 1, padding: "12px 20px", borderRadius: 10, border: "none",
              background: current.canNext ? "#16A34A" : "#D1D5DB",
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: current.canNext ? "pointer" : "not-allowed",
            }}
          >
            {isLast ? "완료 →" : "다음 →"}
          </button>
        </div>
      </div>
    </div>
  )
}
