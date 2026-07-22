import Link from "next/link"

export default function ProPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F172A",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
      color: "#fff",
      padding: "40px 20px 80px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/map" style={{ fontSize: 13, color: "#93C5FD", textDecoration: "none" }}>← 지도로 돌아가기</Link>
        </div>

        <div style={{ background: "#111827", border: "1px solid #334155", borderRadius: 24, padding: "28px 24px", marginBottom: 20 }}>
          <div style={{ display: "inline-block", background: "#1E293B", borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 800, color: "#93C5FD", marginBottom: 14 }}>
            PROFESSIONAL INQUIRY
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.3, margin: "0 0 12px" }}>
            중개사 전용 기능은<br />
            <span style={{ color: "#FDE68A" }}>별도 문의형</span>으로 전환했습니다
          </h1>
          <p style={{ fontSize: 15, color: "#CBD5E1", lineHeight: 1.8, margin: 0 }}>
            Android 앱에서는 단건 리포트 상품(single-report, compare-pack, first-home-pack)만 Google Play Billing으로 신규 판매합니다.
            중개사 플랜(Agent Solo/Pro/Office) 도입은 별도 문의(hello@orulzi.com)로 안내합니다. (온라인 결제 불가)
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 20, padding: "22px 20px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>문의 시 안내 가능한 항목</div>
            <div style={{ display: "grid", gap: 8, fontSize: 14, color: "#CBD5E1", lineHeight: 1.7 }}>
              <div>• 중개사용 공유 링크 / 상담 브리프 도입 방식</div>
              <div>• 팀 계정 운영이 필요한지 여부</div>
              <div>• 사무소 단위 사용량과 필요한 기능 범위</div>
              <div>• 도입 일정, 세금계산서, 계약 방식</div>
            </div>
          </div>

          <div style={{ background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: 20, padding: "22px 20px", color: "#7C2D12" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>중요 안내</div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              온라인에서 바로 결제되는 중개사 플랜은 현재 제공하지 않습니다.
              도입이 필요하면 아래 이메일로 문의해 주세요.
            </div>
          </div>

          <a
            href="mailto:hello@orulji.com?subject=%5B%EC%98%A4%EB%A5%BC%EC%A7%80AI%5D%20%EC%A4%91%EA%B0%9C%EC%82%AC%20%EB%8F%84%EC%9E%85%20%EB%AC%B8%EC%9D%98"
            style={{
              display: "block",
              textAlign: "center",
              padding: "16px 18px",
              borderRadius: 16,
              background: "#FDE68A",
              color: "#111827",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 900,
            }}
          >
            hello@orulji.com으로 문의하기
          </a>
        </div>
      </div>
    </div>
  )
}
