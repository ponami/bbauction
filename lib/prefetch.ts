// 대시보드 AI 카테고리 Prefetch
// 페이지 이동 직전에 호출해서 서버 파일 캐시를 미리 채워둠

const AI_CATEGORIES = ["transport", "policy", "politics", "global", "momcafe", "geo"] as const

export function prefetchDashboard(address: string, aptName: string, lawdCd?: string) {
  if (typeof window === "undefined") return // 서버 사이드 실행 방지

  for (const cat of AI_CATEGORIES) {
    const url = `/api/ai-category/${cat}?address=${encodeURIComponent(address)}&apt=${encodeURIComponent(aptName)}${lawdCd ? `&lawdCd=${lawdCd}` : ""}`
    fetch(url).catch(() => {})
  }
}
