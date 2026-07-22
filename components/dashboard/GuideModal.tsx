"use client"

import { useState } from "react"

interface GuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<"story" | "logic" | "categories">("story")

  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      {/* MODAL WRAPPER */}
      <div
        style={{
          background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "560px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
          animation: "modalFadeIn 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CSS KEYFRAMES */}
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* HEADER */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "22px" }}>🧭</span>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                오를지AI 서비스 가이드
              </h3>
              <p style={{ fontSize: "11px", color: "#94A3B8", margin: "2px 0 0 0" }}>
                처음 오신 분들을 위한 부동산 종합 리스크 분석 설명서
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#94A3B8",
              fontSize: "18px",
              cursor: "pointer",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            ✕
          </button>
        </div>

        {/* TAB BUTTONS */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.2)",
            padding: "4px",
            margin: "12px 24px 0",
            borderRadius: "10px",
            gap: "4px",
          }}
        >
          {[
            { id: "story", label: "🌱 탄생 배경" },
            { id: "logic", label: "⚖️ 분석 알고리즘" },
            { id: "categories", label: "📊 8대 핵심 지표" },
          ].map((tab) => {
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  fontSize: "12px",
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? "#FFFFFF" : "#94A3B8",
                  background: isSelected ? "linear-gradient(90deg, #10B981 0%, #059669 100%)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", color: "#E2E8F0", fontSize: "13px", lineHeight: 1.6 }}>
          
          {/* TAB 1: 탄생 배경 */}
          {activeTab === "story" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: "rgba(22, 101, 52, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  padding: "14px",
                  borderRadius: "12px",
                  color: "#A7F3D0",
                  fontSize: "12.5px",
                }}
              >
                <strong>⚠️ &quot;2년 전으로 돌아갈 수만 있다면...&quot;</strong>
                <p style={{ margin: "6px 0 0 0" }}>
                  오를지는 개발자의 뼈아픈 실제 경험에서 출발했습니다. 분양가 3억 3천의 신축 청약 기회를 포기하고, 언론의 선동과 일부 공인중개사의 말만 믿어 &quot;인테리어만 하면 동일 컨디션&quot;이라는 계산으로 2억짜리 구축 아파트를 매수했습니다.
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  그 결과 구축 매수가격은 그대로인 채 엄청난 기회비용과 심적 고통을 안게 되었습니다. 데이터에 기반하지 않은 군중 심리식 부동산 선택이 얼마나 위험한지 뼈저리게 느낀 후, <strong>&quot;나와 같은 후회를 남들이 반복하지 않게 하자&quot;</strong>는 목적으로 이 솔루션을 구축했습니다.
                </p>
              </div>

              <div>
                <h4 style={{ color: "#FFFFFF", fontWeight: 700, margin: "0 0 6px 0", fontSize: "14px" }}>
                  🎯 오를지가 돕고자 하는 목표
                </h4>
                <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>귀동냥과 감성적인 추천에 휩쓸려 충동 매수하는 행동을 억제합니다.</li>
                  <li>입지·경제 지표·실거주 만족도를 수치화하여 냉정한 통계를 바탕으로 비교합니다.</li>
                  <li>향후 24개월 내 내가 이 선택을 <strong>&quot;후회할 확률(regret probability)&quot;</strong>을 예측해 줍니다.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: 분석 알고리즘 */}
          {activeTab === "logic" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ margin: 0 }}>
                오를지AI는 단순 호가 중심의 부동산 중개 사이트가 아닙니다. 공공기관 및 포털의 데이터 소스를 가공하여 종합 분석 점수를 산출합니다.
              </p>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <h4 style={{ color: "#FFFFFF", margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700 }}>
                  🛠️ 데이터 및 점수 도출 프로세스
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                  <div>
                    <strong style={{ color: "#10B981" }}>1. 원시 데이터 융합</strong>
                    <div style={{ color: "#94A3B8" }}>국토부 실거래 기록, 한국은행 기준금리, 실시간 원달러 환율, 카카오 인프라 위치 데이터, 네이버 뉴스 데이터를 매시간 실시간으로 크롤링 및 정형화합니다.</div>
                  </div>
                  <div>
                    <strong style={{ color: "#10B981" }}>2. AI 정밀 분석 (LLM)</strong>
                    <div style={{ color: "#94A3B8" }}>수집된 지표를 바탕으로 최신 AI(Gemini 2.5)가 호재와 악재의 비중을 다각도로 평가합니다. 단순 텍스트가 아닌 수치를 직접 적용한 신뢰도 높은 한 줄 요약과 리포트를 도출합니다.</div>
                  </div>
                  <div>
                    <strong style={{ color: "#10B981" }}>3. 종합 평점 및 후회 리스크 산출</strong>
                    <div style={{ color: "#94A3B8" }}>전국 단위 실거래 변동 계수(오를지 엔진)와 AI 점수를 하이브리드로 융합하여 종합 등급(A~C+)을 부여합니다. 점수가 낮을수록 2년 후 후회할 확률이 기하급수적으로 올라갑니다.</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#F59E0B", display: "flex", gap: "6px", alignItems: "flex-start" }}>
                <span>💡</span>
                <span>종합점수 <strong>75점 이상(A 등급)</strong>은 리스크가 매우 낮음을, <strong>50점 이하</strong>는 심도 깊은 주의가 필요함을 의미합니다.</span>
              </div>
            </div>
          )}

          {/* TAB 3: 8대 지표 */}
          {activeTab === "categories" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ margin: "0 0 4px 0" }}>
                대시보드 하단의 리스크 분석 영역은 부동산의 가치를 결정하는 8대 축을 집중 조명합니다.
              </p>
              
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  fontSize: "12px",
                }}
              >
                {[
                  { icon: "🚇", name: "교통 호재", desc: "GTX, 지하철 연장, 광역버스 계획 반영" },
                  { icon: "📋", name: "부동산 정책", desc: "DSR 대출 규제, 취득·양도세 제한 분석" },
                  { icon: "🏛", name: "정치 상황", desc: "지역 국회의원 공약 및 행정구역 개발안" },
                  { icon: "🌐", name: "세계 경제", desc: "FOMC·환율(원달러)·유가(OPEC·WTI)·중국/글로벌 경기 영향" },
                  { icon: "📊", name: "부동산 시장", desc: "국토부 실거래 기록 및 입주 물량 분석" },
                  { icon: "📍", name: "지정학·입지", desc: "서울 접근성 및 교통망 연결 입지 강점" },
                  { icon: "🏫", name: "초품아·학군", desc: "초등학교 도보 거리 및 주변 학원 밀집도" },
                  { icon: "💬", name: "실거주 수요", desc: "소아과·마트·공원 등 맘카페 선호 환경" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#FFFFFF", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "11px", lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#FFFFFF",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          >
            이해했습니다
          </button>
        </div>
      </div>
    </div>
  )
}
