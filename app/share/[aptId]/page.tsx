import { Metadata } from "next"
import SharePageClient from "./SharePageClient"

type Props = { params: Promise<{ aptId: string }> }

// SSR 타임아웃 방지: 메타데이터는 간략하게, 데이터 fetch는 클라이언트에서
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { aptId } = await params
  return {
    title: "오를지AI — 아파트 분석 리포트",
    description: "AI가 분석한 아파트 리스크 · 전망 · 결론을 확인하세요.",
    openGraph: {
      title: "오를지AI 아파트 분석",
      description: "AI 아파트 리스크 분석 리포트",
      siteName: "오를지AI",
      locale: "ko_KR",
      type: "website",
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { aptId } = await params
  return <SharePageClient apt={null} aptId={aptId} />
}
