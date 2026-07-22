export const FREE_PAID_BOUNDARY = {
  free: "무료는 1:1 비교·매주 순위",
  paid: "유료는 원인·결론 리포트",
}

export const CONSUMER_PRODUCTS = [
  {
    id: "single-report",
    badge: "지금 이용 가능",
    title: "단일 단지 심층 리포트",
    price: "9,900원",
    summary: "후보 1개를 계약 전 마지막으로 확인하는 판단 리포트",
  },
  {
    id: "compare-pack",
    badge: "다음 페이즈",
    title: "비교 리포트",
    price: "19,900원",
    summary: "2~3개 후보를 한 번에 붙여 보는 비교팩",
  },
  {
    id: "first-home-pack",
    badge: "다음 페이즈",
    title: "신혼부부·생애첫매수 판단팩",
    price: "29,000원",
    summary: "신축 vs 구축, 예산, 체크리스트까지 묶은 결정팩",
  },
] as const

export const AGENT_PLANS = [
  {
    id: "solo",
    badge: "도입 예정",
    title: "Solo",
    price: "49,000원",
    summary: "1인 중개사가 고객 링크와 브랜딩 리포트를 반복 사용하는 시작 플랜 (Android 앱 신규 구매 불가, 별도 문의)",
  },
  {
    id: "pro",
    badge: "현재 결제 가능",
    title: "Pro",
    price: "69,000원",
    summary: "브랜딩 공유, 고객 전달, 팀원 추가까지 포함한 기본 중개사 SaaS (Android 앱 신규 구매 불가, 별도 문의)",
  },
  {
    id: "office",
    badge: "문의",
    title: "Office",
    price: "199,000원+",
    summary: "사무실 단위 운영, 고객관리, 팀 확장, 세금계산서 대응 플랜 (Android 앱 신규 구매 불가, 별도 문의)",
  },
] as const
