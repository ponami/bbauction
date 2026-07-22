"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

export default function LegalFooter() {
  const pathname = usePathname()

  // 지도 페이지에서는 하단 법적 링크를 숨김 (화면 스크롤 방지)
  if (pathname === "/map") return null

  return (
    <div style={{
      padding: "12px 16px 80px",
      borderTop: "1px solid #F3F4F6",
      background: "#F9FAFB",
      display: "flex", flexWrap: "wrap", gap: "8px 16px",
      fontSize: 11, color: "#9CA3AF",
    }}>
      <span>© 2026 오를지AI</span>
      <Link href="/terms"   style={{ color: "#9CA3AF", textDecoration: "none" }}>이용약관</Link>
      <Link href="/privacy" style={{ color: "#9CA3AF", textDecoration: "none" }}>개인정보처리방침</Link>
      <Link href="/refund"  style={{ color: "#9CA3AF", textDecoration: "none" }}>환불정책</Link>
      <span style={{ width: "100%", lineHeight: 1.6 }}>
        본 서비스는 AI 기반 참고 정보이며 투자 수익을 보장하지 않습니다. 최종 판단의 책임은 이용자 본인에게 있습니다.
      </span>
    </div>
  )
}
