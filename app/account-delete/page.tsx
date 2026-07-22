import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "계정 삭제 안내 — 오를지AI",
  description: "오를지AI 계정 삭제 방법, 삭제되는 정보, 보관되는 정보, 구독 해지 유의사항을 안내합니다.",
}

const EMAIL = "support@oreulji.com"
const EFFECTIVE_DATE = "2026년 6월 9일"

const sectionStyle = {
  marginBottom: 28,
}

const sectionTitleStyle = {
  fontSize: 17,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: "1px solid #F3F4F6",
} satisfies React.CSSProperties

const bodyStyle = {
  fontSize: 14,
  color: "#374151",
  lineHeight: 1.9,
} satisfies React.CSSProperties

export default function AccountDeletePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", padding: "32px 16px 80px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 32, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13 }}>
          <Link href="/map" style={{ color: "#6B7280", textDecoration: "none" }}>← 지도로 돌아가기</Link>
          <Link href="/privacy" style={{ color: "#6366F1", textDecoration: "underline" }}>개인정보처리방침</Link>
          <Link href="/terms" style={{ color: "#6366F1", textDecoration: "underline" }}>이용약관</Link>
          <Link href="/refund" style={{ color: "#6366F1", textDecoration: "underline" }}>환불정책</Link>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 20, padding: "24px 22px", marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 8px" }}>계정 삭제 안내</h1>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>최종 수정일: {EFFECTIVE_DATE}</p>
          <p style={{ ...bodyStyle, marginTop: 18 }}>
            오를지AI는 앱 안에서 직접 계정을 삭제할 수 있습니다. 계정을 삭제하면 로그인 계정과 대부분의 서비스 데이터가 함께 제거되며,
            관련 법령상 보관이 필요한 일부 결제 기록은 별도 보관 기간 동안 유지될 수 있습니다.
          </p>
          <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 14, background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#B91C1C", marginBottom: 6 }}>삭제 전에 꼭 확인하세요</div>
            <div style={{ fontSize: 13, color: "#7F1D1D", lineHeight: 1.8 }}>
              현재 신규 결제는 단건 리포트만 제공되며 자동 갱신되지 않습니다.
              <br />
              Android 앱에서는 단건 리포트만 신규 판매합니다. 과거 구독형 또는 중개사 플랜(레거시)을 이용 중인 계정은 <strong>먼저 해지</strong>(Google Play 또는 웹에서)한 뒤 계정을 삭제해 주세요.
            </div>
          </div>
        </div>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>1. 앱에서 직접 계정을 삭제하는 방법</h2>
          <div style={bodyStyle}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>오를지AI 앱 또는 웹에 로그인합니다.</li>
              <li><strong>마이페이지</strong>로 이동합니다.</li>
              <li>하단의 <strong>계정 삭제</strong> 영역을 찾습니다.</li>
              <li>확인 문구 <strong>&quot;삭제&quot;</strong>를 입력한 뒤 삭제 버튼을 누릅니다.</li>
              <li>삭제가 완료되면 계정은 즉시 로그아웃되며, 동일 계정으로 다시 로그인할 수 없습니다.</li>
            </ol>
            <div style={{ marginTop: 12 }}>
              로그인 상태라면 <Link href="/mypage" style={{ color: "#6366F1", textDecoration: "underline" }}>마이페이지로 이동</Link>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>2. 삭제되는 정보</h2>
          <div style={bodyStyle}>
            <p style={{ marginTop: 0 }}>계정 삭제 요청이 정상 처리되면 아래 정보가 삭제됩니다.</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>로그인 계정 및 인증 정보</li>
              <li>회원 프로필 정보</li>
              <li>즐겨찾기 아파트, 알림 설정, 푸시 구독 정보</li>
              <li>서비스 이용 중 생성된 사용자별 저장 데이터 및 분석 권한 정보</li>
              <li>청약 알림 지역 등 계정에 연결된 개인화 설정</li>
            </ul>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>3. 삭제 후에도 일정 기간 보관될 수 있는 정보</h2>
          <div style={bodyStyle}>
            <p style={{ marginTop: 0 }}>
              전자상거래법 등 관련 법령에 따라 보관 의무가 있는 정보는 즉시 삭제되지 않을 수 있습니다.
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>결제 및 환불 처리 기록</li>
              <li>세금계산 및 회계 처리를 위한 거래 식별 정보</li>
              <li>법령 또는 분쟁 대응을 위해 필요한 최소 범위의 기록</li>
            </ul>
            <p style={{ marginBottom: 0 }}>
              일반적인 결제 기록은 관련 법령에 따라 최대 <strong>5년</strong>까지 보관될 수 있으며, 보관 기간 종료 후 삭제됩니다.
            </p>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>4. 앱에 접근할 수 없는 경우</h2>
          <div style={bodyStyle}>
            <p style={{ marginTop: 0 }}>
              로그인 문제, 기기 분실 등으로 앱에 접근할 수 없다면 아래 이메일로 문의해 주세요.
            </p>
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: "14px 16px" }}>
              <div><strong>문의 이메일:</strong> <a href={`mailto:${EMAIL}`} style={{ color: "#6366F1" }}>{EMAIL}</a></div>
              <div><strong>권장 제목:</strong> [오를지AI] 계정 삭제 요청</div>
              <div><strong>함께 보내면 좋은 정보:</strong> 가입 이메일, 최근 로그인 방식(이메일/소셜), 본인 확인에 필요한 최소 정보</div>
            </div>
            <p style={{ marginBottom: 0 }}>
              본인 확인이 필요한 경우 추가 확인 절차가 있을 수 있습니다.
            </p>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>5. 결제/구독 유의사항</h2>
          <div style={bodyStyle}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><strong>현재 신규 결제</strong>: 단건 결제만 제공되며 자동 갱신되지 않습니다.</li>
              <li><strong>과거 웹 정기결제</strong>: 마이페이지에서 해지 후 계정을 삭제해 주세요.</li>
              <li><strong>과거 Google Play 구독</strong>: Google Play에서 먼저 구독 해지 후 계정을 삭제해 주세요.</li>
            </ul>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>6. 관련 문서</h2>
          <div style={{ ...bodyStyle, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/privacy" style={{ color: "#6366F1", textDecoration: "underline" }}>개인정보처리방침</Link>
            <Link href="/terms" style={{ color: "#6366F1", textDecoration: "underline" }}>이용약관</Link>
            <Link href="/refund" style={{ color: "#6366F1", textDecoration: "underline" }}>환불정책</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
