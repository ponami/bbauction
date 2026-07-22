export type LandingPersonaId = "newlywed" | "upgrade" | "budget" | "investor" | "agent"
export type LandingVariant = "proof" | "decision"

export interface LandingPersonaCopy {
  id: LandingPersonaId
  tab: string
  badge: string
  headline: string
  summary: string
  cta: string
  bullets: string[]
  stats: Array<{ value: string; label: string }>
}

export const LANDING_PERSONAS: Record<LandingPersonaId, LandingPersonaCopy> = {
  newlywed: {
    id: "newlywed",
    tab: "신혼부부 첫 매수",
    badge: "신축 vs 구축 1:1 비교",
    headline: "첫 집이라 더 불안할 때, 두 후보를 나란히 놓으면 답이 보입니다",
    summary: "신축을 노릴지, 이미 완성된 단지를 살지 — 고민되는 두 아파트를 무료로 1:1 비교하고, 후회 신호와 전국 순위로 어느 쪽이 후회가 덜할지 확인하세요.",
    cta: "두 후보 무료로 비교하기 →",
    bullets: [
      "20년 실거래 기반 1:1 비교 — 후회 신호·전국 순위·가격 부담을 한 화면에",
      "순위는 매주 갱신 — 계약 전까지 후보의 변화를 무료로 추적",
      "결론이 필요할 때만: 원인 설명 + 계약 전 체크포인트 리포트 (9,900원~)",
    ],
    stats: [
      { value: "1:1 비교", label: "무료" },
      { value: "매주", label: "순위 갱신" },
      { value: "9,900원~", label: "결정형 리포트" },
    ],
  },
  upgrade: {
    id: "upgrade",
    tab: "갈아타기 실거주",
    badge: "내 집 vs 새 후보",
    headline: "지금 집을 팔고 옮길 가치가 있는지, 내 집과 새 후보를 직접 붙여 보세요",
    summary: "현재 보유 아파트를 한쪽에 넣고 새 후보를 붙이면, 실거래 흐름·후회 신호·전국 순위로 갈아타기의 실익을 무료로 확인할 수 있습니다.",
    cta: "내 집 vs 새 후보 비교하기 →",
    bullets: [
      "보유 단지와 새 후보의 하락 리스크·가격 부담 1:1 대조",
      "전국 순위 매주 갱신 — 갈아타기 타이밍 변화를 놓치지 않게 추적",
      "유료 리포트는 왜 그런지(지역 이슈·원인)와 실행 체크포인트까지 정리",
    ],
    stats: [
      { value: "1:1 비교", label: "내 집 포함" },
      { value: "24개월", label: "가격 흐름" },
      { value: "리스크", label: "원인 추적" },
    ],
  },
  investor: {
    id: "investor",
    tab: "투자자 갭/소액",
    badge: "적중률 공개 순위",
    headline: "호재만 믿고 들어가기 불안할 때, 두 매물을 검증된 순위로 대조합니다",
    summary: "후보 매물 2개를 1:1로 비교하면 20년 실거래와 오를지 엔진이 산출한 후회 신호·전국 순위가 나란히 열립니다. 순위의 과거 검증 적중률을 숫자 그대로 함께 표기합니다.",
    cta: "두 매물 순위 대조하기 →",
    bullets: [
      "전국 순위 1:1 대조 — 과거 검증 적중률(100번 중 몇 번)을 화면에 그대로 표기",
      "매주 갱신되는 순위로 후보 매물의 상대 위치 변화를 무료로 추적",
      "유료 리포트는 원인 분석 + 공급·역전세 리스크 체크포인트로 차별화",
    ],
    stats: [
      { value: "전국 순위", label: "적중률 표기" },
      { value: "1:1 비교", label: "매물 대조" },
      { value: "9,900원~", label: "결정형 리포트" },
    ],
  },
  agent: {
    id: "agent",
    tab: "공인중개사 브리핑",
    badge: "고객 브리핑용",
    headline: "고객이 고민하는 두 매물, 말 대신 나란히 놓인 데이터로 브리핑하세요",
    summary: "고객이 저울질하는 두 매물을 1:1 비교 화면에 띄우면 20년 실거래·후회 신호·전국 순위가 나란히 정리됩니다. 브리핑 후 결정 단계에는 출력용 보고서로 이어집니다.",
    cta: "고객 매물 1:1 브리핑하기 →",
    bullets: [
      "두 매물 1:1 비교 화면을 그대로 고객 브리핑 자료로 활용",
      "공공데이터 기반 수치라 고객 설득에 객관성 확보",
      "계약 단계에는 원인 설명·체크포인트가 담긴 브랜딩 보고서 출력",
    ],
    stats: [
      { value: "1:1 비교", label: "고객 브리핑" },
      { value: "공공데이터", label: "객관 근거" },
      { value: "9,900원~", label: "전문가 리포트" },
    ],
  },
  budget: {
    id: "budget",
    tab: "예산 맞춤 후보",
    badge: "무리한 진입 방지",
    headline: "예산 안 후보와 살짝 무리한 후보, 둘을 붙여 보면 숫자로 판단됩니다",
    summary: "예산에 맞는 단지와 조금 무리해서 노리는 단지를 1:1로 비교해, 더 나은 쪽이 가격 부담을 감수할 가치가 있는지 확인하는 흐름입니다.",
    cta: "예산 안 vs 무리 후보 비교 →",
    bullets: [
      "예산 적합 후보와 상급지 후보의 후회 신호·순위 직접 대조",
      "무리한 진입인지 가격 부담과 하락 리스크로 바로 확인",
      "무료는 1:1 비교·순위 추적, 유료는 원인·체크포인트 결론 정리",
    ],
    stats: [
      { value: "예산 대조", label: "1:1 비교" },
      { value: "매주", label: "순위 갱신" },
      { value: "무료 비교", label: "유료 결론" },
    ],
  },
}

export const LANDING_VARIANTS: Record<LandingVariant, { title: string; body: string }> = {
  proof: {
    title: "적중률을 숫자 그대로 공개하는 1:1 비교 엔진",
    body: "전국 순위와 후회 신호는 20년 실거래로 검증한 과거 적중률(100번 중 몇 번)을 화면에 함께 표기합니다. 잘 맞는 구간과 불확실한 구간을 숨기지 않습니다.",
  },
  decision: {
    title: "후보를 늘리는 앱이 아니라, 둘 중 하나로 좁히는 앱",
    body: "고민되는 두 아파트의 1:1 비교는 무료이고 순위는 매주 갱신됩니다. 계약 직전 결론이 필요할 때만 원인 설명과 체크포인트가 담긴 리포트를 구매하세요.",
  },
}

export function normalizeLandingPersona(value: string | null | undefined): LandingPersonaId {
  if (value === "upgrade" || value === "budget" || value === "newlywed" || value === "investor" || value === "agent") return value
  return "newlywed"
}

export function normalizeLandingVariant(value: string | null | undefined): LandingVariant {
  if (value === "decision" || value === "proof") return value
  return "proof"
}
