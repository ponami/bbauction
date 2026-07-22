import { Metadata } from "next"
import Link from "next/link"
import { DynamicPeriod } from "@/components/DynamicPeriod"

export const metadata: Metadata = {
  title: "오를지 엔진 소개 — 아파트 사기 전, 마지막 리스크 확인 | 오를지AI",
  description: "오를지AI가 아파트 리스크를 어떻게 분석하는지 설명합니다. 실거래 데이터, 지역 흐름, 단지 특성, AI 지역 이슈를 합쳐 점수를 만드는 방식입니다.",
}

export default function HowItWorksPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#F4F6F9",
      fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
      padding: "32px 16px 80px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/compare" style={{ fontSize: 13, color: "#6B7280", textDecoration: "none" }}>← 비교 홈으로 돌아가기</Link>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 8 }}>오를지 엔진이란?</h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24, lineHeight: 1.8 }}>
          &ldquo;이 아파트, 사기 전에 리스크부터&rdquo; — 오를지AI는 이 질문에 데이터로 답합니다.<br />
          실거래 데이터, 지역 흐름, 단지 특성, 지역 이슈를 합쳐 <strong>0~100점</strong>으로 정리합니다.
          <span style={{ display: "block", fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
            현재 서비스 표시 기준: 지역 흐름 + 단지 특성 보정 · 실거래 매일 갱신 · 순위·AI 점수 주간 갱신
          </span>
        </p>

        {/* 메인 신뢰 수치 */}
        <div style={{
          background: "linear-gradient(135deg, #059669, #16A34A)",
          borderRadius: 20, padding: "28px 24px", marginBottom: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 14, lineHeight: 1.9, fontWeight: 500 }}>
            <span style={{ fontWeight: 800, color: "#fff" }}>20년+ 실거래 흐름</span>과 지역 이슈를 함께 읽고<br />
            <span style={{ fontWeight: 800, color: "#fff" }}>지역 흐름 + 단지 특성</span> 기준으로 점수와 전국 순위를 만듭니다
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
            공공데이터 기반 · 점수는 참고용 · 실제 계약 전 현장 확인 필요
          </div>
        </div>

        {/* 세부 수치 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
          {[
            { icon: "📅", num: "20년+", label: <>학습 데이터<br /><DynamicPeriod /></> },
            { icon: "🗺️", num: "전국", label: <>지역 단위<br />흐름·순위 분석</> },
            { icon: "📊", num: "5구간", label: <>예측 구간<br />6·12·24·36·60개월</> },
          ].map((c, idx) => (
            <div key={idx} style={{
              background: "#fff", borderRadius: 14, padding: "16px 10px",
              textAlign: "center", border: "1px solid #E5E7EB",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#111827", marginBottom: 4 }}>{c.num}</div>
              <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 40 }}>
          {[
            { icon: "🏠", num: "5만+", label: "등록 아파트" },
            { icon: "🧩", num: "단지 보정", label: "연식·세대수\n주차·전세 리스크" },
            { icon: "📰", num: "지역 이슈", label: "뉴스·정책·커뮤니티\n보조 점수" },
          ].map(c => (
            <div key={c.label} style={{
              background: "#fff", borderRadius: 14, padding: "16px 10px",
              textAlign: "center", border: "1px solid #E5E7EB",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#111827", marginBottom: 4 }}>{c.num}</div>
              <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "pre-line", lineHeight: 1.4 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <Section title="1. 어떤 데이터를 씁니까?">
          <p>특정 회사의 추정 시세보다, <strong>정부 공공 데이터와 단지 실거래 기록</strong>을 우선 사용합니다.</p>
          <div style={{
            background: "#F0FDF4", border: "1px solid #BBF7D0",
            borderRadius: 12, padding: "14px 16px", marginBottom: 14,
            fontSize: 13, color: "#166534", lineHeight: 1.8,
          }}>
            💡 <strong>현재 서비스 구조:</strong> 먼저 지역 단위의 시장 흐름 신호를 읽고, 그 위에 단지의 연식·세대수·주차·전세 리스크·학군 같은 정보를 얹어 점수와 전국 순위를 만듭니다.
            이후 실거래는 매일 갱신하고, 지역 AI 이슈는 주간 단위로 다시 계산합니다.
          </div>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <Th>데이터 출처</Th>
                  <Th>사용 목적</Th>
                  <Th>업데이트</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td><strong>국토교통부</strong> 실거래가 공개시스템</Td>
                  <Td>실제 거래 가격·거래량·평형 (핵심 학습 데이터)</Td>
                  <Td>매일 03:00</Td>
                </tr>
                <tr>
                  <Td><strong>오를지 AI 예측 엔진</strong> (자체 개발·구조 비공개)</Td>
                  <Td>예측 구간별 지역 흐름 신호·전국 순위 생성</Td>
                  <Td>주간 갱신 · 주기 재학습</Td>
                </tr>
                <tr>
                  <Td><strong>뉴스 + AI 분석</strong></Td>
                  <Td>교통·정책·정치·맘카페 등 지역 이슈 보조 점수</Td>
                  <Td>매주 (월·수·금 갱신)</Td>
                </tr>
                <tr>
                  <Td><strong>한국부동산원</strong> 전세가율 통계</Td>
                  <Td>시군구별 전세 리스크 수준</Td>
                  <Td>분기</Td>
                </tr>
                <tr>
                  <Td><strong>교육부·나이스(NEIS)</strong> 학군 데이터</Td>
                  <Td>시군구 단위 명문학군 지수</Td>
                  <Td>연간</Td>
                </tr>
                <tr>
                  <Td><strong>K-아파트(K-apt)</strong> 단지 정보</Td>
                  <Td>세대수·주차 수·시공사·난방 방식</Td>
                  <Td>수시</Td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="2. 점수는 어떻게 계산됩니까?">
          <p>오를지 점수는 <strong>두 층위</strong>로 만들어집니다.</p>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <StepCard step="1단계 · 기본축" title="지역 흐름 오를지 AI 기본점수 + 전국 순위" color="#16A34A" bg="#F0FDF4" border="#BBF7D0">
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                기본 점수와 전국 순위는 <strong>지역 단위 시장 흐름 신호</strong>를 먼저 읽고 시작합니다.
                금리, 거래량, 전세, 공급, 거시경제 같은 시장 변수를 바탕으로 예측 구간별 방향·서열 신호를 만듭니다.
              </p>
              {/* 검증 적중률 표 (실측 — 두 지역을 비교했을 때 적중) */}
              <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #BBF7D0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 8 }}>
                  전망 순위 과거 검증 — 두 곳을 비교했을 때 100번 중 몇 번 맞았나
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {[
                    { h: "6개월", acc: "약 58번" },
                    { h: "12개월", acc: "약 58번" },
                    { h: "24개월·상승장", acc: "약 60번" },
                    { h: "24개월·중립장", acc: "약 57번" },
                  ].map(r => (
                    <div key={r.h} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>{r.h}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#16A34A" }}>{r.acc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
                  * 과거 실거래 백테스트 기준(2026-07)이며 재검증 때마다 갱신됩니다. 순위가 가까운 단지 간의 우열은 통계적으로 구별력이 낮습니다.
                </div>
              </div>
            </StepCard>

            <StepCard step="2단계 · 개별 보정" title="아파트 단지 특성 반영" color="#059669" bg="#ECFDF5" border="#6EE7B7">
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                같은 동네라도 단지마다 다릅니다. 아래 요소들로 미세 조정합니다. (반영 방식과 크기는 검증 결과에 따라 조정되며, 세부 수치는 공개하지 않습니다.)
              </p>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["연식", "세대수", "주차", "전세 안정성", "학군"].map(t => (
                  <div key={t} style={{
                    background: "#fff", border: "1px solid #D1FAE5",
                    borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#374151",
                  }}>
                    {t}
                  </div>
                ))}
              </div>
            </StepCard>

            <StepCard step="3단계 · 유료 보정" title="지역 AI 이슈 보정 (유료)" color="#D97706" bg="#FFFBEB" border="#FDE68A">
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                유료 심층 분석에서는 시군구 단위 뉴스와 커뮤니티 이슈를 <strong>지역 보조 점수</strong>로 함께 반영합니다.
                반영 비중은 검증 결과에 따라 조정되며 세부 수치는 공개하지 않습니다.
              </p>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["교통 호재", "부동산 정책", "정치·공약", "글로벌 경제", "맘카페 트렌드", "개발·재개발"].map(cat => (
                  <div key={cat} style={{
                    background: "#fff", border: "1px solid #FDE68A",
                    borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#92400E", fontWeight: 600,
                  }}>
                    {cat}
                  </div>
                ))}
              </div>
            </StepCard>
          </div>
        </Section>

        <Section title="3. 점수 등급 기준">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {[
              { range: "75~100점", label: "현재 조건에서 비교적 안정적인 편입니다", color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" },
              { range: "64~74점",  label: "사도 되는 편입니다",              color: "#059669", bg: "#ECFDF5", border: "#6EE7B7" },
              { range: "56~63점",  label: "계약 전에 한 번 더 확인하세요",   color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
              { range: "50~55점",  label: "계약 전 꼼꼼히 따져보세요",      color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
              { range: "0~49점",   label: "전문가와 함께 검토해보세요",       color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
            ].map(g => (
              <div key={g.range} style={{
                background: g.bg, border: `1px solid ${g.border}`,
                borderRadius: 12, padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: g.color, flexShrink: 0 }}>{g.range}</span>
                <span style={{ fontSize: 13, color: g.color, textAlign: "right" }}>{g.label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. 예측 구간은 왜 5가지입니까?">
          <p>
            부동산 시장은 <strong>단기(6개월)와 장기(5년)</strong>의 움직임이 다릅니다.
            오를지 엔진은 6·12·24·36·60개월 구간을 각각 따로 학습했습니다.
          </p>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "6·12개월", desc: "단기 시장 심리·계절성 반영", icon: "⚡" },
              { label: "24개월", desc: "중기 정책 효과·입주 물량 반영 (기본 표시)", icon: "📅" },
              { label: "36·60개월", desc: "장기 인구 이동·개발 완성 반영", icon: "🔭" },
            ].map(i => (
              <div key={i.label} style={{
                background: "#fff", border: "1px solid #E5E7EB",
                borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>{i.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{i.label}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{i.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, color: "#DC2626", fontWeight: 600 }}>
            단, 모든 예측은 과거 실거래 데이터 기반 통계 추정이며 실제 결과와 다를 수 있습니다.
          </p>
        </Section>

        <Section title="5. 왜 믿을 수 있습니까?">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {[
              { icon: "📋", title: "공공 데이터만 사용", desc: "국토교통부·한국부동산원 등 정부 공식 데이터를 직접 가져옵니다. 누구든 원본 데이터와 비교해 검증할 수 있습니다." },
              { icon: "✅", title: "검증 수치를 숨기지 않음", desc: "전망 순위에는 과거 검증 적중률(100번 중 몇 번)을 화면에 그대로 함께 표기합니다. 잘 맞는 구간과 불확실한 구간을 구분해 보여줍니다." },
              { icon: "🔄", title: "매일·매주·매월 갱신", desc: "실거래가는 매일 갱신하고, AI 뉴스 점수는 주간 단위로 재분석하며, 오를지 AI 모델은 주기적으로 재학습합니다." },
              { icon: "⚖️", title: "정직한 한계 표기", desc: "순위가 가까운 단지 간의 우열은 통계적으로 구별력이 낮다는 한계를 화면에 그대로 표기합니다. 계산 세부 구조는 서비스 보호를 위해 공개하지 않습니다." },
              { icon: "🚫", title: "특정 거래 권유 없음", desc: "오를지AI는 투자자문업자가 아닙니다. 참고 정보를 드릴 뿐, 특정 아파트의 거래를 권유하지 않습니다." },
            ].map(i => (
              <div key={i.title} style={{
                background: "#fff", borderRadius: 14, padding: "16px 18px",
                border: "1px solid #E5E7EB", display: "flex", gap: 14,
              }}>
                <div style={{ fontSize: 22, flexShrink: 0, paddingTop: 2 }}>{i.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{i.title}</div>
                  <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>{i.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="6. 점수가 높으면 반드시 오릅니까?">
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#991B1B", lineHeight: 1.9, fontWeight: 500 }}>
              <strong>아닙니다.</strong> 오를지 점수는 &ldquo;지금 이 아파트가 상대적으로 어떤 리스크를 안고 있는지&rdquo;를 보는 보조 지표입니다.<br />
              현재 서비스 점수는 지역 흐름 신호를 단지 특성으로 보정한 구조라, <strong>같은 생활권 안에서도 체감은 달라질 수 있습니다.</strong><br />
              급매 여부, 동·층, 학군 체감, 재건축 단계 같은 현장 변수는 사람이 마지막으로 확인해야 합니다.<br />
              <strong>최종 매매 결정 전에는 반드시 전문가(공인중개사·세무사 등)와 직접 상담하세요.</strong>
            </p>
          </div>
        </Section>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/compare" style={{
            display: "block", padding: "16px", borderRadius: 14, textAlign: "center",
            background: "#16A34A", color: "#fff", fontSize: 15, fontWeight: 700,
            textDecoration: "none",
          }}>
            두 아파트 직접 비교하기 →
          </Link>
          <Link href="/sample" style={{
            display: "block", padding: "14px", borderRadius: 14, textAlign: "center",
            background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600,
            textDecoration: "none", border: "1px solid #E5E7EB",
          }}>
            샘플 분석 보기
          </Link>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #E5E7EB", display: "flex", gap: 16, fontSize: 13 }}>
          <Link href="/terms"   style={{ color: "#16A34A", textDecoration: "underline" }}>이용약관</Link>
          <Link href="/privacy" style={{ color: "#16A34A", textDecoration: "underline" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 16, fontWeight: 800, color: "#111827",
        marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F3F4F6",
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.9 }}>
        {children}
      </div>
    </div>
  )
}

function StepCard({
  step, title, color, bg, border, children,
}: {
  step: string; title: string; color: string; bg: string; border: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{step}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "8px 12px", background: "#F3F4F6",
      fontSize: 12, fontWeight: 700, color: "#374151",
      border: "1px solid #E5E7EB", textAlign: "left",
    }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{
      padding: "8px 12px", fontSize: 12, color: "#374151",
      border: "1px solid #E5E7EB", verticalAlign: "top", lineHeight: 1.6,
    }}>
      {children}
    </td>
  )
}
