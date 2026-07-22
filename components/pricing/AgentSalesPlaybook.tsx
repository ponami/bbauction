"use client"

const DEMO_STEPS = [
  {
    title: "1. 고객 페르소나를 먼저 선언",
    body: "예: 신혼부부 첫 매수, 구축 vs 신축 고민, 계약금은 마련했지만 의사결정이 느린 고객.",
  },
  {
    title: "2. 지도에서 후보를 찾고 바로 비교",
    body: "무료 탐색으로 관심 단지를 찾고, 추천 1위 비교와 리스크 비교 분석으로 상담 흐름을 만든다.",
  },
  {
    title: "3. 공유 링크와 CRM으로 후속 상담 연결",
    body: "고객에게 링크를 보내고, 누가 열람했고 무엇을 비교했는지 CRM에서 이어서 본다.",
  },
]

const SALES_POINTS = [
  "무료 탐색 → 유료 결론 구조라 고객에게 보여주기 쉽습니다",
  "중개사 이름·사무소·전화번호가 들어간 브랜딩 공유 링크를 바로 보낼 수 있습니다",
  "마이페이지에서 고객별 메모, 상태, 최근 조회/비교 이력을 한 번에 관리합니다",
]

export default function AgentSalesPlaybook() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ background: "#111827", borderRadius: 18, border: "1px solid #334155", padding: "18px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#60A5FA", marginBottom: 6 }}>세일즈 운영 가이드</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 8 }}>15분 데모 시나리오</div>
        <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}>
          고객 한 명에게 어떤 화면을 보여주고, 언제 결제와 상담으로 연결할지 바로 설명할 수 있도록 구성했습니다.
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {DEMO_STEPS.map((step, index) => (
          <div key={step.title} style={{ background: "#1E293B", borderRadius: 16, border: "1px solid #334155", padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#93C5FD", marginBottom: 6 }}>STEP {index + 1}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{step.title}</div>
            <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.7 }}>{step.body}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0F172A", borderRadius: 18, border: "1px solid #334155", padding: "18px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#FDE68A", marginBottom: 10 }}>상담에서 바로 쓰는 포인트</div>
        <div style={{ display: "grid", gap: 8 }}>
          {SALES_POINTS.map((item) => (
            <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#CBD5E1", lineHeight: 1.7 }}>
              <span style={{ color: "#FDE68A", fontWeight: 800, flexShrink: 0 }}>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
