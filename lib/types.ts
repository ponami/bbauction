// ============================================================
// 공유 타입 정의 — 프론트/백엔드 양쪽에서 import해서 사용
// ============================================================

// 영향도 레이블
export type ImpactLevel = "HIGH" | "POS" | "NEG" | "MED" | "KEY"

// 트렌드 방향
export type Trend = "up" | "down" | "neutral"

// 개별 분석 항목
export interface FactorItem {
  name: string
  status: string        // 이모지 (✅ ⚠️ 🔄 📋)
  detail: string
  impact: ImpactLevel
}

// 카테고리 분석 결과 (API 응답 공통 포맷)
export interface CategoryResult {
  id: CategoryId
  score: number          // 0~100
  trend: Trend
  summary: string        // 한 줄 요약
  items: FactorItem[]
  updatedAt: string      // ISO 8601
  cached?: boolean
  cachedAt?: string
  error?: string         // 실패 시 오류 메시지
  rawData?: Record<string, unknown>
}

// 8개 카테고리 ID
export type CategoryId =
  | "transport"   // 교통 호재
  | "policy"      // 부동산 정책
  | "politics"    // 정치 상황
  | "global"      // 세계 경제
  | "market"      // 부동산 시장
  | "geo"         // 지정학·입지
  | "school"      // 초품아·학군
  | "momcafe"     // 맘카페 트렌드

export interface ExplainabilitySignal {
  label: string
  value: string | number | null
  kind: string
}

export interface ExplainabilityUnitProfile {
  label: string
  value: string | number | null
}

export interface ExplainabilityBreakdownItem {
  category: string
  label: string
  score: number
  trend?: string
  summary?: string
  updated_at?: string
}

export interface ExplainabilityNewsItem {
  category?: string
  label?: string
  keyword?: string
  title?: string
  link?: string
  pub_date?: string
  collected_at?: string
}

export interface ExplainabilityTradeItem {
  ym: string
  pyeong: number
  area_m2: number
  floor: string
  price_man: number
  dealType?: string
}

export interface ExplainabilityScoreComponents {
  display_score?: number | null
  base_score?: number | null
  final_score?: number | null
  ai_adjustment?: number | null
  signals?: ExplainabilitySignal[]
  unit_profile?: ExplainabilityUnitProfile[]
  ai_breakdown?: ExplainabilityBreakdownItem[]
}

export interface ExplainabilityEvidence {
  recent_news?: ExplainabilityNewsItem[]
  recent_trades?: ExplainabilityTradeItem[]
  jeonse_summary?: {
    level?: string
    score?: number | null
    pressure?: number | null
  }
  school_summary?: {
    school_score?: number | null
    prestige_school_score?: number | null
    special_hs_score?: number | null
    intl_school_score?: number | null
  }
  turnover_summary?: {
    total_trades_12m: number
    turnover_rate_pct: number | null
    kapt_ho_cnt: number
  } | null
}

export interface ExplainabilityData {
  score_explanation?: string
  score_components?: ExplainabilityScoreComponents
  evidence?: ExplainabilityEvidence
}

// 대시보드 전체 데이터
export interface DashboardData extends ExplainabilityData {
  totalScore: number
  gateScore?: number | null    // ML 엔진 단독 점수 (지도 팝업과 동일)
  finalScore?: number | null   // 통합 종합점수 (ML 65% + AI뉴스 35%)
  categories: Record<CategoryId, CategoryResult>
  myProperty: PropertyInfo
  sellScenarios: SellScenario[]
  lastUpdated: string
  mlForecast?: MlForecastData
  is_presale?: boolean         // 분양예정 단지 여부
  presale_score_label?: string // 분양단지 점수 구성 라벨
}

// 내 아파트 정보
export interface PropertyInfo {
  address: string
  aptName: string
  area?: string            // 전용면적 (m²) - 예: "84.97"
  purchasePrice: number    // 매매가 (만원)
  interiorCost: number     // 인테리어 (만원)
  totalInvestment: number  // 총 투자금 (만원)
  nearestStation?: string
  walkToStation?: number   // 도보 분
  nearestSchool?: string
  isChoopuma?: boolean     // 초품아 여부
  schoolWalkMin?: number   // 초등학교 도보 분
}

// 매도 시나리오
export interface SellScenario {
  period: string           // "2027~2028"
  expectedPrice: number    // 예상 매도가 (만원)
  profit: number           // 수익 (만원)
  roi: number              // ROI (%)
  isOptimal?: boolean      // 최적 시점 여부
}

// 국토부 실거래가 데이터
export interface TradeRecord {
  aptName: string
  area: string             // 전용면적
  floor: string
  price: number            // 만원
  dealDate: string         // YYYY-MM
  dong: string
  dealType?: "매매" | "전세" | "월세"
}

// 뉴스 아이템 (네이버 뉴스 API)
export interface NewsItem {
  title: string
  description: string
  pubDate: string
  link: string
}

// 초등학교 정보
export interface SchoolInfo {
  name: string
  distance: number         // 미터 (단지 중심 기준)
  walkMinutes: number
  isChoopuma: boolean      // 확실한 초품아 (350m 이내)
  isChoopumaViaGate: boolean // 쪽문 기준 초품아 가능 (350+gateOffset 이내)
  gateOffset: number       // 적용된 쪽문 오프셋 (m)
  lat: number
  lng: number
}

// 경제 지표
export interface EconomicIndicators {
  baseRate: number         // 한국은행 기준금리 (%)
  usdKrw: number           // 원/달러 환율
  gdpGrowth?: number       // GDP 성장률 (%)
}

// Claude 분석 요청 포맷
export interface ClaudeAnalysisRequest {
  category: CategoryId
  data: unknown
  systemPrompt: string
}

// Claude 분석 응답 포맷 (JSON 강제)
export interface ClaudeAnalysisResponse {
  score: number
  trend: Trend
  summary: string
  items: FactorItem[]
}

// API Route 응답 래퍼
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  cached?: boolean
  cachedAt?: string
}

// ── 즐겨찾기 아파트 ──
export interface FavoriteApt {
  id: string                    // uuid
  aptName: string               // "신명아파트"
  address: string               // "인천광역시 서구 감단로 834"
  lawdCd: string                // 법정동코드 (5자리)
  dealTypes: ("매매" | "전세" | "월세")[]  // 감시할 거래 유형
  areaFilter?: number[]         // 감시할 전용면적 (예: [59, 84]). 비어있으면 전체
  priceMin?: number             // 최소가격 알림 (만원). 미설정 시 전체
  priceMax?: number             // 최대가격 알림 (만원). 미설정 시 전체
  createdAt: string
  lastCheckedAt?: string
  color: string                 // 카드 색상 (UI용)
  // 워치리스트 (Phase 1)
  category?: string             // "general" | "trade_up" | "gap_investment" | "custom"
  decisionStatus?: string       // "watching" | "buying" | "paused" | "skipped" | "bought"
  decisionReason?: string       // 유저가 기록한 결정 이유
  decisionUpdatedAt?: string    // 결정 상태 변경 시각
}

// ── 실거래 알림 ──
export interface DealAlert {
  id: string                    // uuid
  favoriteId: string            // 연결된 즐겨찾기 ID
  aptName: string
  address: string
  dealType: "매매" | "전세" | "월세"
  area: number                  // 전용면적 (m²)
  floor: string                 // 층수
  price: number                 // 만원 (매매/전세), 또는 보증금
  monthlyRent?: number          // 월세인 경우 월세 (만원)
  dealYear: string              // "2026"
  dealMonth: string             // "03"
  dealDay: string               // "15"
  isRead: boolean
  createdAt: string             // 알림 생성 시각
  // 행동형 알림 (Phase 2)
  actionType?: string           // null | "check_jeonse" | "review_timing" | "compare_alternative" | "contact_agent"
  actionMessage?: string        // 행동 권고 문구
}

// ── 실거래가 체크 결과 ──
export interface CheckResult {
  favoriteId: string
  aptName: string
  newDeals: DealAlert[]
  checkedAt: string
}

// ── 주간 리포트 (Phase 3) ──
export interface WeeklyReportCategory {
  category: string
  score: number | null
  trend: string | null
  summary: string | null
}

export interface WeeklyReportWeekData {
  weekLabel: string
  avgScore: number | null
  categories: WeeklyReportCategory[]
}

export interface WeeklyReportChanges {
  avgScoreDelta: number | null
  topUp: { category: string; delta: number } | null
  topDown: { category: string; delta: number } | null
}

export interface WeeklyReportItem {
  aptName: string
  address: string
  lawdCd: string
  thisWeek: WeeklyReportWeekData | null
  lastWeek: WeeklyReportWeekData | null
  changes: WeeklyReportChanges
  highlights: string[]
  recommendation: string | null
}

export interface WeeklyReport {
  success: boolean
  weekLabel: string | null
  generatedAt: string
  items: WeeklyReportItem[]
}

// ── 관심 동네 ──
export interface InterestNeighborhood {
  id: string
  name: string                   // "검단신도시", "인천 서구"
  sido: string                   // 시도명 "인천광역시"
  sigungu: string                // 시군구명 "서구"
  bjdCode: string                // 법정동코드 앞 5자리 (청약홈용)
  visitCount: number             // 대시보드 방문/조회 횟수
  isFavorited: boolean           // 수동 찜 여부
  sources: string[]              // 출처 ["즐겨찾기 자동추출", "직접 추가"]
  addedAt: string
  lastVisitedAt?: string
}

// ── 신규 분양 정보 ──
export interface PresaleItem {
  id: string
  aptName: string                // "검단 e편한세상 더퍼스트"
  address: string                // "인천광역시 서구 원당동 일원"
  sido: string
  sigungu: string
  totalUnits: number             // 총 세대수
  supply: SupplyUnit[]           // 공급 타입별 정보
  announcementDate: string       // 모집공고일 YYYY-MM-DD
  subscribeStartDate: string     // 청약 시작일
  subscribeEndDate: string       // 청약 마감일
  moveInDate: string             // 입주 예정일 (YYYY-MM 또는 YYYY)
  constructionCompany: string    // 시공사
  salesCompany?: string          // 시행사
  minPrice: number               // 최저 분양가 (만원)
  maxPrice: number               // 최고 분양가 (만원)
  specialSupplyDate?: string     // 특별공급일
  firstPriorityDate?: string     // 1순위 청약일
  source: "청약홈" | "뉴스" | "mock"
  sourceUrl?: string
  isRead: boolean
  matchedNeighborhoods: string[] // 매칭된 관심 동네 ID들
  createdAt: string
}

export interface SupplyUnit {
  type: string                   // "59A", "84B"
  area: number                   // 전용면적
  count: number                  // 공급 세대수
  price?: number                 // 분양가 (만원)
}

// ── 분양 체크 결과 ──
export interface PresaleCheckResult {
  checked: number                // 체크한 관심 동네 수
  newItems: number               // 새 분양 건수
  items: PresaleItem[]
  checkedAt: string
}

// ── ML 엔진 전망 ──
export interface MlHorizonScore {
  horizon: number          // 6, 12, 24, 36, 60 (개월)
  yyyymm: string           // 기준 연월 "202603"
  total: number            // 전국 평균 점수 (-1 ~ +1)
  regionScore: number | null  // 해당 시도 점수 (-1 ~ +1)
  dirAcc: number           // 방향 정확도 (0 ~ 1)
}

export interface MlForecastData {
  available: boolean
  timestamp?: string
  horizons?: MlHorizonScore[]
  lawdCd?: string
  regionName?: string
  error?: string
}
