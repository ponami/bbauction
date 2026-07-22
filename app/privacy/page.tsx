import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "개인정보처리방침 — 오를지AI",
}

const EFFECTIVE_DATE = "2026년 4월 26일"
const EMAIL = "support@oreulji.com"

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", padding: "32px 16px 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/map" style={{ fontSize: 13, color: "#6B7280", textDecoration: "none" }}>← 지도로 돌아가기</Link>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 6 }}>개인정보처리방침</h1>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 40 }}>시행일: {EFFECTIVE_DATE}</p>

        <Section title="1. 수집하는 개인정보 항목">
          <table>
            <thead>
              <tr>
                <Th>구분</Th><Th>항목</Th><Th>수집 목적</Th><Th>보유 기간</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>회원 가입</Td>
                <Td>이메일 주소, 이름(선택), 소셜 로그인 식별자</Td>
                <Td>서비스 이용, 본인 확인</Td>
                <Td>탈퇴 후 30일</Td>
              </tr>
              <tr>
                <Td>내 아파트 등록</Td>
                <Td>아파트명, 주소, 동·평형(선택), 매수가격(선택)</Td>
                <Td>맞춤 분석 제공</Td>
                <Td>탈퇴 시 즉시 삭제</Td>
              </tr>
              <tr>
                <Td>결제</Td>
                <Td>결제 식별자(PaymentID), 결제 금액, 결제 일시</Td>
                <Td>결제 처리 및 이력 관리</Td>
                <Td>5년 (전자상거래법)</Td>
              </tr>
              <tr>
                <Td>서비스 이용</Td>
                <Td>즐겨찾기 아파트 목록, 분석 이용 기록</Td>
                <Td>서비스 제공</Td>
                <Td>탈퇴 시 즉시 삭제</Td>
              </tr>
              <tr>
                <Td>위치 정보(선택)</Td>
                <Td>기기 GPS 좌표 (지도 초기 위치 설정 시)</Td>
                <Td>지도 자동 이동</Td>
                <Td>서버 미저장 (브라우저 내 일회성 사용)</Td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="2. 개인정보 수집 방법">
          <p>① 회원 가입 및 서비스 이용 시 이용자가 직접 입력</p>
          <p>② Google OAuth 등 소셜 로그인 연동 시 해당 플랫폼으로부터 제공</p>
          <p>③ 위치 정보는 이용자가 브라우저의 위치 정보 제공을 허용한 경우에만 수집</p>
        </Section>

        <Section title="3. 개인정보의 제3자 제공">
          <p>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 다음의 경우는 예외입니다.</p>
          <table>
            <thead>
              <tr>
                <Th>제공 받는 자</Th><Th>제공 항목</Th><Th>제공 목적</Th><Th>보유 기간</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>포트원(PortOne)</Td>
                <Td>결제 요청 정보</Td>
                <Td>웹 결제 처리</Td>
                <Td>포트원 약관에 따름</Td>
              </tr>
              <tr>
                <Td>Google Play</Td>
                <Td>구매 영수증 정보(구매 토큰, 주문 ID)</Td>
                <Td>안드로이드 앱 인앱 결제 처리</Td>
                <Td>Google Play 약관에 따름</Td>
              </tr>
              <tr>
                <Td>Supabase</Td>
                <Td>회원 정보, 서비스 이용 데이터</Td>
                <Td>데이터베이스 운영 (AWS 서울 리전)</Td>
                <Td>서비스 종료 시 삭제</Td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="4. 개인정보 처리 위탁">
          <table>
            <thead>
              <tr>
                <Th>수탁 업체</Th><Th>위탁 업무</Th>
              </tr>
            </thead>
            <tbody>
              <tr><Td>Anthropic (Claude API)</Td><Td>AI 분석 텍스트 생성 (입력된 아파트 정보 포함)</Td></tr>
              <tr><Td>카카오(Kakao)</Td><Td>지도 API — 주변 시설 검색</Td></tr>
              <tr><Td>네이버(Naver)</Td><Td>지도 API, 뉴스 검색 API</Td></tr>
              <tr><Td>Fly.io</Td><Td>서버 호스팅 (미국)</Td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 12 }}>※ AI 분석 시 입력된 아파트명·주소 등이 Anthropic 서버에 전달됩니다. 개인 식별 정보(이름·연락처 등)는 전달되지 않습니다.</p>
        </Section>

        <Section title="5. 이용자의 권리">
          <p>① 이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다.</p>
          <p>② 계정 삭제는 마이페이지에서 직접 진행할 수 있으며, 자세한 안내는 <Link href="/account-delete" style={{ color: "#6366F1", textDecoration: "underline" }}>계정 삭제 안내 페이지</Link>에서 확인할 수 있습니다.</p>
          <p>③ 탈퇴 요청 시 관련 법령에서 보존을 요구하는 정보(결제 기록 5년 등)를 제외한 서비스 데이터는 지체 없이 삭제합니다.</p>
        </Section>

        <Section title="6. 개인정보의 안전성 확보 조치">
          <p>① 비밀번호 및 결제 정보는 암호화하여 저장합니다.</p>
          <p>② 외부로 전송되는 데이터는 TLS/HTTPS를 통해 암호화합니다.</p>
          <p>③ 개인정보에 대한 접근 권한을 최소화하고 접근 기록을 관리합니다.</p>
        </Section>

        <Section title="7. 쿠키 및 로컬스토리지">
          <p>① 서비스는 세션 유지 및 이용자 설정 저장을 위해 쿠키와 브라우저 로컬스토리지를 사용합니다.</p>
          <p>② 로컬스토리지에 저장되는 정보: 온보딩 설정(예산·지역), 분석 기본값, 알림 설정 등</p>
          <p>③ 브라우저 설정에서 쿠키를 차단할 수 있으나, 일부 서비스 기능이 제한될 수 있습니다.</p>
        </Section>

        <Section title="8. 개인정보보호 책임자">
          <p>개인정보 관련 문의, 불만, 피해구제 신청은 아래로 연락하십시오.</p>
          <p>이메일: {EMAIL}</p>
          <p>또한 개인정보침해 관련 분쟁은 개인정보분쟁조정위원회(www.kopico.go.kr) 또는 개인정보침해신고센터(privacy.kisa.or.kr)에 신청할 수 있습니다.</p>
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#9CA3AF" }}>
          시행일: {EFFECTIVE_DATE}
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 16, fontSize: 13 }}>
          <Link href="/account-delete" style={{ color: "#6366F1", textDecoration: "underline" }}>계정 삭제 안내</Link>
          <Link href="/terms" style={{ color: "#6366F1", textDecoration: "underline" }}>이용약관</Link>
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

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "8px 12px", background: "#F3F4F6", fontSize: 12, fontWeight: 700, color: "#374151", border: "1px solid #E5E7EB", textAlign: "left" }}>{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "8px 12px", fontSize: 12, color: "#374151", border: "1px solid #E5E7EB", verticalAlign: "top" }}>{children}</td>
}
