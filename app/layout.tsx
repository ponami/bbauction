import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "비비옥션 | 크게 싸게, 안전하게",
  description: "비비옥션 - 전국 법원경매를 AI로 분석합니다. 단타매매·임대목적 필터, 투자점수, 리스크 분석.",
  icons: { icon: "/logo.png" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
