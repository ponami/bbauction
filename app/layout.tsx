import type { Metadata } from "next"
import AuthProvider from "@/components/AuthProvider"
import BottomNav from "@/components/BottomNav"
import LegalFooter from "@/components/LegalFooter"
import "./globals.css"
import { PRODUCT_NAME, PRODUCT_TAGLINE, PRODUCT_DESCRIPTION_SHORT } from "@/lib/constants"

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | ${PRODUCT_TAGLINE}`,
  description: `${PRODUCT_NAME} - 국토부 실거래 데이터와 AI로 아파트 리스크를 분석합니다. ${PRODUCT_DESCRIPTION_SHORT}.`,
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
          <LegalFooter />
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
