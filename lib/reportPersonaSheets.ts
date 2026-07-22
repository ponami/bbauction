import type { ReportPersona } from "@/lib/reportProducts"
import type { ReportAlternativeInput } from "@/lib/riskAnalysis/reportCommonData"
import { buildAgentDefenseSections } from "@/lib/riskAnalysis/agentDefenseKit"
import { flowLabel } from "@/lib/riskAnalysis/decisionTables"
import { buildFirstHomeCostMetrics, buildFirstHomeCostSections } from "@/lib/riskAnalysis/firstHomeCostSheet"
import { buildInvestorPersonaMetrics, buildInvestorPersonaSections } from "@/lib/riskAnalysis/investorAfterTaxSheet"
import type { ReportInputModel } from "@/lib/riskAnalysis/reportInputModel"
import { fmtManwon } from "@/lib/riskAnalysis/priceGuidance"

interface TradeStats {
  avg: number
  latest: number
  count: number
  latestDate: string
}

interface Horizon {
  horizon: number
  regionScore: number | null
  total: number
}

export interface PersonaMetric {
  label: string
  value: string
  note?: string
}

export interface PersonaSection {
  title: string
  items: string[]
}

export interface PersonaSheet {
  id: string
  persona: Exclude<ReportPersona, "general">
  audienceLabel: string
  defaultOpen?: boolean
  title: string
  summary: string
  metrics: PersonaMetric[]
  sections: PersonaSection[]
  footnote?: string
}

interface BuildPersonaSheetInput {
  persona: ReportPersona
  buildYear?: number | null
  targetPrice: number
  stats: TradeStats | null
  horizons: Horizon[]
  alternatives?: ReportAlternativeInput[] | null
  reportInput: ReportInputModel
}

const PERSONA_SHEET_ORDER: Array<Exclude<ReportPersona, "general">> = ["first-home", "agent", "investor"]

function normalizedFlow(horizons: Horizon[], horizon: number) {
  const row = horizons.find((item) => item.horizon === horizon)
  const score = row ? row.regionScore ?? row.total : null
  return {
    label: flowLabel(score),
    score,
  }
}

function buildBudgetLabel(budget?: number | null, targetPrice?: number) {
  if (!budget || budget <= 0 || !targetPrice || targetPrice <= 0) return "예산 정보 없음"
  if (targetPrice <= budget) return "예산 안"
  if (targetPrice <= Math.round(budget * 1.05)) return "살짝 초과"
  return "예산 초과"
}

export function buildPersonaSheet(input: BuildPersonaSheetInput): PersonaSheet | null {
  const { persona, buildYear, targetPrice, stats, horizons, alternatives, reportInput } = input
  if (persona === "general") return null
  const flow24 = normalizedFlow(horizons, 24)
  const budgetLabel = buildBudgetLabel(reportInput.budget, targetPrice)
  const topAlt = alternatives?.[0]
  const ageText = buildYear
    ? buildYear >= 2019
      ? "신축·준신축 축"
      : buildYear >= 2010
      ? "준신축 축"
      : "구축 축"
    : "연식 확인 필요"

  if (persona === "first-home") {
    return {
      id: "first-home-sheet",
      persona,
      audienceLabel: "신혼부부·생애첫매수",
      defaultOpen: true,
      title: "신혼부부 총주거비 판단서",
      summary: "좋아 보이는 집인지보다, 사고 나서 12개월 버틸 수 있는지부터 판단하는 표입니다.",
      metrics: buildFirstHomeCostMetrics({
        targetPrice,
        budgetLabel,
        reportInput,
      }),
      sections: buildFirstHomeCostSections({
        ageText,
        reportInput,
        stats,
        topAlt,
      }),
      footnote: "첫 매수는 점수보다 총초기투입금·월 총주거비·잔여현금이 먼저 설명돼야 최종 합의가 쉽습니다.",
    }
  }

  if (persona === "agent") {
    return {
      id: "agent-brief",
      persona,
      audienceLabel: "중개사·상담 실무",
      title: "중개사 비교/방어 브리프",
      summary: "고객 앞에서 추천을 방어하고, 보류 이유까지 설명할 수 있게 정리한 상담용 시트입니다.",
      metrics: [
        { label: "권장 진입가", value: fmtManwon(targetPrice), note: "가격 설명의 출발점" },
        { label: "최근 거래량", value: `${stats?.count ?? 0}건`, note: stats?.latestDate ? `최신 거래월 ${stats.latestDate}` : "직접 실거래 부족" },
        { label: "24개월 흐름", value: flow24.label, note: flow24.score != null ? `${flow24.score.toFixed(2)}점` : "데이터 부족" },
        { label: "대안 후보", value: `${alternatives?.length ?? 0}개`, note: topAlt ? `${topAlt.apt_nm} 포함` : "비교단지 추가 필요" },
      ],
      sections: buildAgentDefenseSections({
        targetPrice,
        stats,
        budgetLabel,
        flow24Label: flow24.label,
        topAlt,
      }),
      footnote: "중개사 리포트는 장점 나열보다 추천/보류 이유, 고객 유형별 반론 대응, 다음 상담 액션이 먼저 보여야 설득력이 생깁니다.",
    }
  }

  if (persona === "investor") {
    return {
      id: "investor-sheet",
      persona,
      audienceLabel: "추가매수·투자 검토",
      title: "투자자 세후 손익 판단표",
      summary: "좋아 보이는 단지보다, 세후로 얼마가 남고 실제로 나올 수 있는지부터 판단하는 표입니다.",
      metrics: buildInvestorPersonaMetrics({
        targetPrice,
        reportInput,
        horizons,
        stats,
      }),
      sections: buildInvestorPersonaSections({
        targetPrice,
        reportInput,
        horizons,
        stats,
        topAlt,
      }),
      footnote: "투자 판단은 상승 기대 문장보다 2년/4년 세후손익, 보유비용, 거래량, 대안 기회비용이 먼저 보여야 합니다.",
    }
  }

  return null
}

export function buildPersonaSheets(input: Omit<BuildPersonaSheetInput, "persona">): PersonaSheet[] {
  return PERSONA_SHEET_ORDER.map((persona) => buildPersonaSheet({ ...input, persona })).filter(
    (sheet): sheet is PersonaSheet => Boolean(sheet)
  )
}
