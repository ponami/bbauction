import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "이용약관 — 오를지AI",
}

const EMAIL = "support@oreulji.com"

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", padding: "32px 16px 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/map" style={{ fontSize: 13, color: "#6B7280", textDecoration: "none" }}>← 지도로 돌아가기</Link>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 6 }}>이용약관</h1>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 40 }}>최종 수정일: 2026년 4월 28일</p>

        <Section title="제1조 (목적)">
          이 약관은 오를지AI(이하 &ldquo;회사&rdquo;)가 운영하는 AI 부동산 분석 서비스(oreulji.com, 이하 &ldquo;서비스&rdquo;)의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (용어의 정의)">
          <p>&ldquo;서비스&rdquo;란 회사가 제공하는 AI 기반 부동산 리스크 분석 플랫폼(oreulji.com)을 의미합니다. 본 서비스는 매수·매도 판단의 참고용 정보를 제공합니다.</p>
          <p>&ldquo;이용자&rdquo;란 이 약관에 동의하고 서비스를 이용하는 모든 사람을 말합니다.</p>
          <p>&ldquo;회원&rdquo;란 이메일 또는 소셜 계정으로 로그인하여 회사와 이용계약을 체결한 이용자를 말합니다.</p>
          <p>&ldquo;유료 플랜&rdquo;이란 단건 분석, 비교 리포트, 판단팩 등 1회성 이용료를 납부하고 이용하는 서비스를 말합니다.</p>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <p>① 이 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</p>
          <p>② 회사는 관련 법령에 위배되지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 7일 전 서비스 내 공지합니다.</p>
        </Section>

        <Section title="제4조 (회원가입)">
          <p>① 이용자는 이메일 또는 소셜 계정(네이버, 카카오 등)을 통해 회원가입을 할 수 있습니다.</p>
          <p>② 다음 각 호에 해당하는 경우 회원가입을 거부하거나 사후에 이용계약을 해지할 수 있습니다.</p>
          <p style={{ paddingLeft: 16 }}>&nbsp;&nbsp;- 타인의 명의를 도용한 경우<br />
          &nbsp;&nbsp;- 허위 정보를 기재한 경우<br />
          &nbsp;&nbsp;- 서비스 운영을 방해하는 목적으로 가입한 경우</p>
        </Section>

        <Section title="제5조 (서비스 이용)">
          <p>① 서비스는 공공 실거래 데이터 및 AI 모델을 기반으로 부동산 리스크 분석 정보를 제공합니다.</p>
          <p>② AI가 생성한 분석 결과는 참고용이며, 최종 투자 판단의 책임은 전적으로 이용자 본인에게 있습니다.</p>
          <p>③ AI 분석 결과는 「자본시장과 금융투자업에 관한 법률」상 투자자문업·투자일임업에 해당하지 않습니다.</p>
          <p>④ 무료 플랜은 제한된 기능을 이용할 수 있습니다.</p>
          <p>⑤ 유료 플랜 기능은 결제 확인 후 24시간 이내 활성화됩니다.</p>
        </Section>

        <Section title="제6조 (요금 및 결제)">
          <p>① 유료 서비스 요금은 다음과 같습니다.</p>
          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "14px 16px", margin: "8px 0", fontSize: 13, lineHeight: 2 }}>
            - 단건 분석: 9,900원 (특정 아파트 1개 심층 분석 리포트)<br />
            - 비교 리포트: 상품 안내 페이지에 표시된 금액 기준<br />
            - 첫 매수 판단팩: 상품 안내 페이지에 표시된 금액 기준
          </div>
          <p>② 현재 신규 유료 결제는 단건형 상품만 제공합니다.</p>
          <p>③ 결제 방식은 이용 환경에 따라 다릅니다.</p>
          <p style={{ paddingLeft: 16 }}>&nbsp;&nbsp;가. 웹(PC/모바일 브라우저): 포트원(PortOne)을 통한 신용카드 결제<br />
          &nbsp;&nbsp;나. 안드로이드 앱: Google Play 인앱 결제</p>
          <p>④ 단건형 상품은 결제 시점에 1회 청구되며 자동 갱신되지 않습니다.</p>
          <p>⑤ Android 앱에서는 단건 리포트 상품(single-report, compare-pack, first-home-pack)만 Google Play Billing으로 판매합니다. 과거에 판매된 구독형 또는 중개사 플랜(Agent Solo/Pro/Office)은 레거시 관리만 가능하며, 별도 문의(hello@orulzi.com)가 필요합니다.</p>
          <p>⑥ 결제 금액에는 부가가치세(VAT)가 포함되어 있습니다.</p>
        </Section>

        <Section title="제7조 (환불 정책)">
          <p>① 단건형 결제 상품의 환불 기준은 다음과 같습니다.</p>
          <p style={{ paddingLeft: 16 }}>&nbsp;&nbsp;가. 결제일로부터 7일 이내에 서비스를 이용하지 않은 경우 전액 환불<br />
          &nbsp;&nbsp;나. 단건 분석: 리포트를 열람(화면 확인)한 경우 환불 제한<br />
          &nbsp;&nbsp;다. 비교 리포트·첫 매수 판단팩 등 단건형 디지털 상품은 열람 또는 제공이 개시된 이후 환불이 제한될 수 있음<br />
          &nbsp;&nbsp;라. 회사 귀책 사유(서비스 장애 등) 발생 시 사용 기간 또는 제공 범위에 비례해 환불</p>
          <p>② 안드로이드 앱(Google Play) 결제 건은 Google Play 환불 정책을 따릅니다.</p>
          <p>③ 과거 구독형 또는 중개사 플랜 결제분의 환불/해지는 결제 당시 제공된 경로 및 정책을 따릅니다.</p>
          <p>④ 웹 결제 환불 요청은 {EMAIL}로 결제 내역과 함께 연락해 주십시오.</p>
        </Section>

        <Section title="제8조 (이용자의 의무)">
          <p>① 타인의 계정을 도용하거나 서비스를 불법적으로 이용하지 않습니다.</p>
          <p>② AI 분석 결과를 그대로 투자에 활용하여 발생한 손해의 책임은 이용자에게 있습니다.</p>
          <p>③ 서비스를 상업적 목적으로 무단 복제·배포하지 않습니다.</p>
          <p>④ 회사의 지식재산권을 침해하지 않습니다.</p>
        </Section>

        <Section title="제9조 (서비스 중단)">
          <p>회사는 설비 점검·보수, 천재지변, 기술적 장애 등 불가피한 사유로 서비스 제공을 일시 중단할 수 있습니다. 이 경우 사전 또는 사후에 공지합니다.</p>
        </Section>

        <Section title="제10조 (면책조항)">
          <p>① AI가 생성한 분석 결과는 보조 도구이며, 최종 투자 판단의 적절성에 대한 책임은 이용자에게 있습니다.</p>
          <p>② 실거래 데이터는 국토교통부 API 기준이며, 최대 수 개월의 지연이 있을 수 있습니다. 회사는 데이터의 완전성·정확성을 보증하지 않습니다.</p>
          <p>③ 회사는 이용자 간 또는 이용자와 제3자 간의 분쟁에 개입하지 않습니다.</p>
        </Section>

        <Section title="제11조 (분쟁 해결)">
          <p>① 본 약관은 대한민국 법률에 따라 해석됩니다.</p>
          <p>② 서비스와 관련한 분쟁은 회사 소재지 관할 법원을 제1심 법원으로 합니다.</p>
          <p>③ 분쟁 발생 시 먼저 {EMAIL}로 연락하여 협의를 시도합니다.</p>
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#9CA3AF" }}>
          문의: {EMAIL}<br />
          최종 수정일: 2026년 4월 28일
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 16, fontSize: 13 }}>
          <Link href="/account-delete" style={{ color: "#6366F1", textDecoration: "underline" }}>계정 삭제 안내</Link>
          <Link href="/privacy" style={{ color: "#6366F1", textDecoration: "underline" }}>개인정보처리방침</Link>
          <Link href="/refund" style={{ color: "#6366F1", textDecoration: "underline" }}>환불정책</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F3F4F6" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.9 }}>
        {children}
      </div>
    </div>
  )
}
