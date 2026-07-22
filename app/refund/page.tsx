import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "환불정책 — 오를지AI",
}

const EMAIL = "support@oreulji.com"

export default function RefundPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", padding: "32px 16px 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/map" style={{ fontSize: 13, color: "#6B7280", textDecoration: "none" }}>← 지도로 돌아가기</Link>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 6 }}>환불정책</h1>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 40 }}>전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따른 청약철회 기준을 따릅니다.</p>

        {/* 요약 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
          {[
            { title: "단건 분석", price: "9,900원", rule: "열람 전 7일 이내 전액 환불\n열람 후 환불 불가" },
            { title: "단건형 판단팩", price: "상품별 상이", rule: "제공 전 7일 이내 환불 가능\n제공 개시 후 환불 제한 가능" },
          ].map(c => (
            <div key={c.title} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: "#6366F1", fontWeight: 600, marginBottom: 10 }}>{c.price}</div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line" }}>{c.rule}</div>
            </div>
          ))}
        </div>

        <Section title="1. 단건 분석 (9,900원)">
          <p>① 결제일로부터 7일 이내이고, 심층 분석 리포트를 열람(화면 확인)하지 않은 경우 전액 환불합니다.</p>
          <p>② 리포트를 한 번이라도 열람한 경우 「전자상거래법」 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 결제 전 이 사실을 확인하시기 바랍니다.</p>
        </Section>

        <Section title="2. 비교 리포트 / 첫 매수 판단팩">
          <p>① 상품 안내에 표시된 범위의 디지털 리포트 또는 판단팩은 결제 후 즉시 또는 순차적으로 제공됩니다.</p>
          <p>② 제공이 시작되기 전까지는 결제일로부터 7일 이내 환불을 요청할 수 있습니다.</p>
          <p>③ 리포트 열람 또는 디지털 콘텐츠 제공이 개시된 이후에는 「전자상거래법」에 따라 환불이 제한될 수 있습니다.</p>
        </Section>

        <Section title="3. 과거 정기결제 상품 안내">
          <p>현재 신규 판매는 단건 결제만 제공합니다.</p>
          <p>Android 앱에서는 단건 리포트 상품(single-report, compare-pack, first-home-pack)만 Google Play Billing으로 신규 판매합니다. 과거에 판매된 개인 구독 또는 중개사 플랜(Agent Solo/Pro/Office)은 레거시 관리만 가능하며, 환불/해지는 결제 당시 경로(Google Play 또는 웹)를 따릅니다.</p>
        </Section>

        <Section title="4. 회사 귀책 사유로 인한 환불">
          <p>서버 장애 등 회사의 귀책 사유로 서비스를 정상 이용하지 못한 경우, 해당 기간에 비례하여 환불합니다.</p>
        </Section>

        <Section title="5. 결제 방식별 환불 안내">
          <p><strong>웹 결제(포트원 · 신용카드)</strong></p>
          <p>① 환불 신청은 {EMAIL}로 아래 정보와 함께 연락해 주십시오.</p>
          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "14px 16px", marginTop: 8, fontSize: 13, lineHeight: 1.8 }}>
            - 가입 이메일<br />
            - 결제 일시 및 금액<br />
            - 환불 사유
          </div>
          <p>② 접수 후 3영업일 이내에 검토 결과를 안내하며, 환불 승인 시 카드사 정책에 따라 3~5영업일 내 처리됩니다.</p>
          <p style={{ marginTop: 16 }}><strong>안드로이드 앱 결제(Google Play 인앱 결제)</strong></p>
          <p>① Google Play를 통한 결제 건은 Google Play의 자체 환불 정책을 따릅니다.</p>
          <p>② 환불은 Google Play 고객센터 또는 Google Play 구매 기록 페이지에서 직접 신청할 수 있습니다.</p>
          <p>③ Google Play 결제 건에 대한 회사 직접 환불은 불가하며, 모든 환불 및 분쟁은 Google Play를 통해 처리됩니다.</p>
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#9CA3AF", lineHeight: 1.8 }}>
          환불 문의: {EMAIL}<br />
          본 환불정책은 이용약관의 일부를 구성합니다.
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 16, fontSize: 13 }}>
          <Link href="/account-delete" style={{ color: "#6366F1", textDecoration: "underline" }}>계정 삭제 안내</Link>
          <Link href="/terms" style={{ color: "#6366F1", textDecoration: "underline" }}>이용약관</Link>
          <Link href="/privacy" style={{ color: "#6366F1", textDecoration: "underline" }}>개인정보처리방침</Link>
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
