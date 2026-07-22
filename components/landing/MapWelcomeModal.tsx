"use client"

import Link from "next/link"

interface MapWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MapWelcomeModal({ isOpen, onClose }: MapWelcomeModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
          animation: "welcomeFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          border: "1px solid #E5E7EB",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes welcomeFadeIn {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* TOP TITLE */}
        <div
          style={{
            padding: "24px 24px 16px",
            textAlign: "center",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🧭</div>
          <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.5px" }}>
            오를지AI에 오신 것을 환영합니다!
          </h2>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "6px", margin: 0, lineHeight: 1.4 }}>
            아파트 계약 전, 3초 만에 핵심 기능을 파악해보세요.
          </p>
        </div>

        {/* EXPLANATIONS */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Item 1 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#ECFDF5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "18px",
              }}
            >
              🎯
            </div>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1F2937", margin: "0 0 3px 0" }}>
                어떤 서비스인가요?
              </h4>
              <p style={{ fontSize: "12.5px", color: "#4B5563", margin: 0, lineHeight: 1.5 }}>
                20년 치 국토교통부 실거래 데이터, 금리, 지역 공급 지표를 오를지 고유 분석 엔진과 AI 기술로 연동하여 <strong>이 아파트를 매수하고 후회할 확률</strong>을 과학적으로 계산한 서비스입니다.
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#FEF3C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "18px",
              }}
            >
              🎨
            </div>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1F2937", margin: "0 0 3px 0" }}>
                지도 마커 색상의 리스크 판단
              </h4>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "11.5px" }}>
                <span style={{ color: "#16A34A", fontWeight: 700 }}>🟢 안전 (75점+)</span>
                <span style={{ color: "#D97706", fontWeight: 700 }}>🟡 보합/주의 (50점+)</span>
                <span style={{ color: "#DC2626", fontWeight: 700 }}>🔴 위험 (49점 이하)</span>
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#EFF6FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "18px",
              }}
            >
              🏥
            </div>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1F2937", margin: "0 0 3px 0" }}>
                주변 병원·학교·학원 입지 토글
              </h4>
              <p style={{ fontSize: "12.5px", color: "#4B5563", margin: 0, lineHeight: 1.5 }}>
                상단 필터에서 ‘🏥 병원’, ‘🏫 학교’, ‘🎓 학원’ 필터를 켜면, 지도 위에 마커가 즉시 오버레이되어 주변 입지를 한눈에 대조할 수 있습니다.
              </p>
            </div>
          </div>

          {/* Item 4 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#F3E8FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "18px",
              }}
            >
              🔍
            </div>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1F2937", margin: "0 0 3px 0" }}>
                상세 정보 및 1:1 비교
              </h4>
              <p style={{ fontSize: "12.5px", color: "#4B5563", margin: 0, lineHeight: 1.5 }}>
                원하는 아파트 마커를 클릭하여 상세 패널을 열면 20년치 실거래 공공데이터와 오를지 독자 엔진 지표, AI 분석이 결합된 종합 리스크 리포트가 열리며, 하단 ‘비교’ 탭을 통해 두 매물을 1:1로 비교 분석할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM BUTTONS */}
        <div
          style={{
            padding: "16px 24px 24px",
            borderTop: "1px solid #F3F4F6",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: "100%",
              height: "48px",
              background: "#16A34A",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "12px",
              fontSize: "14.5px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#15803D")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#16A34A")}
          >
            이해했어요, 오를지 지도 시작하기
          </button>
          
          <Link
            href="/how-it-works"
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#6B7280",
              textDecoration: "none",
              fontWeight: 600,
              padding: "6px 0",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#16A34A")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#6B7280")}
          >
            엔진의 상세 알고리즘 알아보기 →
          </Link>
        </div>
      </div>
    </div>
  )
}
