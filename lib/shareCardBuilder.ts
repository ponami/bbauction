// lib/shareCardBuilder.ts
// 공유 결론 카드 데이터 생성 — 3줄 요약 + 핵심 수치 4개 + 비교 1장

import { getAdvisoryVerdict, getThreeAxisReasons, type AdvisoryInput } from "./advisoryCopy"

export interface ShareCardData {
  summary: {
    strength: string   // "이 아파트는 [강점]"
    risk: string       // "그러나 [리스크]"
    conclusion: string // "따라서 [결론]"
  }
  metrics: {
    label: string
    value: string
    color: "green" | "amber" | "red" | "neutral"
  }[]
  score: number
  scoreLabel: string
  aptName: string
  address: string
}

function scoreColor(score: number): "green" | "amber" | "red" {
  if (score >= 64) return "green"
  if (score >= 50) return "amber"
  return "red"
}

function fmtPrice(price: number | null | undefined): string {
  if (!price) return "-"
  if (price >= 10000) return `${(price / 10000).toFixed(1)}억`
  return `${price.toLocaleString()}만`
}

/**
 * 공유 결론 카드 데이터 생성
 *
 * @param apt 단지 정보 (AdvisoryInput 호환 + 추가 필드)
 * @returns ShareCardData — 카드 렌더링에 필요한 구조화된 데이터
 */
export function buildShareCard(
  apt: AdvisoryInput & {
    apt_nm?: string
    address?: string
    price?: number | null
    pred_pct_24m?: number | null
    expected_gain?: number | null
    jeonse_risk_level?: string | null
    recent_trades?: unknown[] | null
  },
): ShareCardData {
  const score = apt.final_score ?? apt.oreulji_score ?? 0
  const verdict = getAdvisoryVerdict(apt)
  const reasons = getThreeAxisReasons(apt)

  // 3줄 요약
  const positiveReason = reasons.find(r => r.positive)
  const negativeReason = reasons.find(r => !r.positive)

  const strength = positiveReason
    ? `${positiveReason.axis} 측면에서 긍정적입니다`
    : "데이터 기준 무난한 평가입니다"

  const risk = negativeReason
    ? `${negativeReason.axis}에서 리스크가 관찰됩니다`
    : "특별한 하방 리스크는 없습니다"

  const conclusion = score >= 64
    ? "검토를 진행할 수 있는 구간입니다"
    : score >= 50
      ? "조건부 접근이 필요한 구간입니다"
      : "보수적 접근이 필요한 구간입니다"

  // 핵심 수치 4개
  const metrics: ShareCardData["metrics"] = [
    {
      label: "종합 점수",
      value: `${score}점`,
      color: scoreColor(score),
    },
    (() => {
      const p = apt.pred_pct_24m ?? (apt.expected_gain != null && apt.price ? (apt.expected_gain / apt.price) * 100 : null)
      return {
        label: "24개월 전망",
        value: p == null ? "분석 중" : p >= 0 ? "상승 우위" : "하락 주의",
        color: (p == null ? "amber" : p >= 0 ? "green" : "red") as ShareCardData["metrics"][number]["color"],
      }
    })(),
    {
      label: "전세 리스크",
      value: apt.jeonse_risk_level ?? "보통",
      color: apt.jeonse_risk_level === "낮음" ? "green" : apt.jeonse_risk_level === "높음" ? "red" : "amber",
    },
    {
      label: "최근 거래",
      value: apt.recent_trades?.length ? `${apt.recent_trades.length}건` : "없음",
      color: (apt.recent_trades?.length ?? 0) >= 3 ? "green" : (apt.recent_trades?.length ?? 0) > 0 ? "amber" : "red",
    },
  ]

  return {
    summary: {
      strength,
      risk,
      conclusion,
    },
    metrics,
    score,
    scoreLabel: verdict.label,
    aptName: apt.apt_nm ?? "알 수 없음",
    address: apt.address ?? "",
  }
}
