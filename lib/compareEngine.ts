// compareEngine.ts — /engine/compare/two 공용 호출·병합·표시 규칙
// 지도 모달(CompareSheet)과 메인 비교(AptCompare)가 같은 로직을 공유한다.
//
// 방향 규약 (각 빌더 정본 기준 — 반전 금지):
//  - national_rank.pct               : 높을수록 유리 (build_national_rank.py) → "전국 상위 (100-pct)%"
//  - short_rank.pct                  : 낮을수록 유리 (build_short_rank.py)    → "상위 pct%"
//  - apt_rank_national.national_pct  : 낮을수록 유리 (build_apt_rank_national.py) → "상위 pct%"
//  - apt_position.top_pct            : 낮을수록 유리 → "상위 pct%"

import { useEffect, useState } from "react"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

export type RegretScore = { score: number; band?: [number, number] | null; confidence?: string } | null
export type AptPosition = { top_pct: number | null; regime: string } | null
export type RankAccuracy = {
  h6?: { acc: number; floor?: number }
  h12?: { acc: number }
  h24_up?: { acc: number }
  h24_neutral?: { acc: number }
} | null
export type NationalRank = { pct: number | null; regime: string; algo: string; built_at: string; accuracy?: RankAccuracy } | null
export type ShortRank = { pct: number; regime: string; signal_valid: boolean; algo: string; built_at: string; accuracy?: RankAccuracy } | null
export type AptRankNational = { national_pct: number | null; regime: string; algo: string; built_at: string; accuracy?: RankAccuracy } | null

export interface CompareTwoResponse {
  winner_id: number
  loser_id: number
  winner_nm?: string
  loser_nm?: string
  win_probability: number
  expected_outperformance_pct?: number | null
  regret_score_a: RegretScore
  regret_score_b: RegretScore
  apt_position_a: AptPosition
  apt_position_b: AptPosition
  national_rank_a: NationalRank
  national_rank_b: NationalRank
  short_rank_a: ShortRank
  short_rank_b: ShortRank
  apt_rank_national_a: AptRankNational
  apt_rank_national_b: AptRankNational
}

// 한 아파트 몫의 엔진 필드 (병합·행 구성에 쓰는 공통 형태)
export interface EngineFields {
  regret_score?: RegretScore
  apt_position?: AptPosition
  national_rank?: NationalRank
  short_rank?: ShortRank
  apt_rank_national?: AptRankNational
}

export async function fetchCompareTwo(
  aptIdA: number,
  aptIdB: number,
  signal?: AbortSignal,
): Promise<CompareTwoResponse | null> {
  try {
    const r = await fetch(`${GATE_URL}/engine/compare/two`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apt_id_a: aptIdA, apt_id_b: aptIdB }),
      signal,
    })
    if (!r.ok) return null // 404 = 엔진 커버리지 밖 — 에러가 아니라 조용한 강등
    return await r.json()
  } catch {
    return null
  }
}

// 커버리지 사전 확인 — 검색 선택 직후 배지 표시용 (/engine/compare/available/{apt_id})
export async function fetchCompareAvailable(aptId: number): Promise<boolean | null> {
  try {
    const r = await fetch(`${GATE_URL}/engine/compare/available/${aptId}`)
    if (!r.ok) return null
    const data = await r.json()
    return !!data.available
  } catch {
    return null // 확인 실패 = 미표시 (막지 않는다)
  }
}

export function useCompareTwo(aptIdA?: number | null, aptIdB?: number | null) {
  const [data, setData] = useState<CompareTwoResponse | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "unavailable">("idle")

  useEffect(() => {
    if (!aptIdA || !aptIdB) {
      setData(null)
      setStatus("idle")
      return
    }
    const ctrl = new AbortController()
    setStatus("loading")
    fetchCompareTwo(aptIdA, aptIdB, ctrl.signal).then(d => {
      if (ctrl.signal.aborted) return
      setData(d)
      setStatus(d ? "ok" : "unavailable")
    })
    return () => ctrl.abort()
  }, [aptIdA, aptIdB])

  return { data, status }
}

// 기존 값(base) 위에 엔진 응답을 얹는다 — 엔진이 null인 필드는 기존 값 유지
export function mergeEngineFields(
  base: EngineFields,
  data: CompareTwoResponse | null,
  side: "a" | "b",
): EngineFields {
  if (!data) return base
  return {
    regret_score: data[`regret_score_${side}`] ?? base.regret_score,
    apt_position: data[`apt_position_${side}`] ?? base.apt_position,
    national_rank: data[`national_rank_${side}`] ?? base.national_rank,
    short_rank: data[`short_rank_${side}`] ?? base.short_rank,
    apt_rank_national: data[`apt_rank_national_${side}`] ?? base.apt_rank_national,
  }
}

// "과거 검증: 100번 중 약 N번 적중" — 지도 상세(NaverMap)와 동일한 정본 카피
export function accuracyPhrase(acc?: number | null): string | null {
  if (acc == null) return null
  return `과거 검증: 100번 중 약 ${Math.round(acc * 100)}번 적중`
}

// 24개월 순위의 국면별 적중률 선택 (up/neutral만 검증 수치 보유)
export function rank24Accuracy(regime?: string, accuracy?: RankAccuracy): number | null {
  if (!accuracy) return null
  if (regime === "neutral") return accuracy.h24_neutral?.acc ?? null
  if (regime === "up") return accuracy.h24_up?.acc ?? null
  return null
}

export function rankDisclaimer(builtAt?: string): string {
  const dateOnly = (builtAt || "").split("T")[0]
  return `본 순위는 ${dateOnly} 기준 데이터로 산출한 자체 지표에 따른 참고용 정보입니다. 특정 부동산의 매매·투자를 권유하지 않으며 정확성이나 수익을 보장하지 않습니다. 순위가 가까운 단지 간의 우열은 통계적으로 구별력이 낮습니다. 투자 판단의 책임은 이용자 본인에게 있습니다.`
}

export type EngineRow = {
  label: string
  a: string
  b: string
  winner?: "a" | "b" | "tie"
  note?: string
}

function fmtBandRange(band?: [number, number] | null): string {
  if (!band || band.length !== 2) return "-"
  const lo = (band[0] * 100).toFixed(1)
  const hi = (band[1] * 100).toFixed(1)
  return `${lo}% ~ ${hi}% 사이`
}

// 엔진 필드 → 비교표 행. 두 화면이 이 함수 하나만 쓴다.
export function buildEngineRows(a: EngineFields, b: EngineFields): EngineRow[] {
  const rows: EngineRow[] = []

  // ① 후회 신호 — 판정을 말로 먼저, 점수는 보조로.
  //    "전국 상위 N%" 환산 금지: 아래 검증된 전망 순위 행과 다른 지표라 같은 말로 번역하면 충돌한다.
  const ra = a.regret_score?.score
  const rb = b.regret_score?.score
  if (ra != null || rb != null) {
    const winner = ra != null && rb != null ? (ra > rb ? "a" : rb > ra ? "b" : "tie") : undefined
    const conf = (winner === "b" ? b : a).regret_score?.confidence
    rows.push({
      label: "후회 신호",
      a: ra != null ? (winner === "a" ? `후회 위험 더 낮음 · 신호 ${ra}/100` : `신호 ${ra}/100`) : "-",
      b: rb != null ? (winner === "b" ? `후회 위험 더 낮음 · 신호 ${rb}/100` : `신호 ${rb}/100`) : "-",
      winner,
      note: `후회 신호는 2년 뒤 전망을 전국 단지와 비교한 자체 점수입니다 (0~100, 높을수록 유리).${conf ? ` 신호 신뢰도: ${conf}.` : ""}`,
    })
    // 24개월 예상 변동 범위 — 별도 행으로 분리 + 라벨 명시 (점수 옆에 붙이면 뺄셈으로 오독됨)
    const bandA = a.regret_score?.band
    const bandB = b.regret_score?.band
    if (bandA || bandB) {
      rows.push({
        label: "24개월 예상 변동 범위",
        a: fmtBandRange(bandA),
        b: fmtBandRange(bandB),
        note: "가격이 이 범위 안에서 움직일 것으로 추정하는 구간입니다 (보장이 아닙니다). 두 단지의 범위가 많이 겹치면 우열 구별력이 낮습니다.",
      })
    }
  }

  // ② 24개월 뒤 전망 순위 — 단지 기준(apt_rank_national)이 있으면 그걸 쓰고,
  //    없는 쪽이 있으면 지역 기준(national_rank)으로 폴백 (두 행을 겹쳐 보여주지 않는다)
  const arA = a.apt_rank_national
  const arB = b.apt_rank_national
  const anyRank24 = arA || arB || a.national_rank || b.national_rank
  if (anyRank24) {
    const useApt = arA?.national_pct != null && arB?.national_pct != null
    const meta = useApt ? (arA || arB) : (a.national_rank || b.national_rank)
    const acc = rank24Accuracy(meta?.regime, meta?.accuracy)
    const accStr = accuracyPhrase(acc)
    if (useApt) {
      rows.push({
        label: "24개월 뒤 전망 순위",
        a: `전국 상위 ${Math.max(1, Math.round(arA!.national_pct!))}%`, // national_pct 낮을수록 유리
        b: `전국 상위 ${Math.max(1, Math.round(arB!.national_pct!))}%`,
        note: `${accStr ? accStr + " · " : ""}${rankDisclaimer(meta?.built_at)}`,
      })
    } else {
      rows.push({
        label: "24개월 뒤 전망 순위 (지역)",
        a: a.national_rank?.pct != null ? `전국 상위 ${Math.max(1, Math.round(100 - a.national_rank.pct))}%` : "-", // pct 높을수록 유리
        b: b.national_rank?.pct != null ? `전국 상위 ${Math.max(1, Math.round(100 - b.national_rank.pct))}%` : "-",
        note: `${accStr ? accStr + " · " : ""}${rankDisclaimer(meta?.built_at)}`,
      })
    }
  }

  // ③ 6개월 뒤 전망 순위 — 유효 상승 국면에서만 순위, 그 외에는 신호 약함 고지
  const srA = a.short_rank
  const srB = b.short_rank
  if (srA || srB) {
    const sr = srA || srB
    const valid = !!sr?.signal_valid && sr?.regime === "up"
    if (valid) {
      const accStr = accuracyPhrase(sr?.accuracy?.h6?.acc)
      rows.push({
        label: "6개월 뒤 전망 순위",
        a: srA?.pct != null ? `상위 ${Math.max(1, Math.round(srA.pct))}%` : "-", // pct 낮을수록 유리
        b: srB?.pct != null ? `상위 ${Math.max(1, Math.round(srB.pct))}%` : "-",
        note: accStr || undefined,
      })
    } else {
      rows.push({
        label: "6개월 뒤 전망",
        a: "—",
        b: "—",
        note: "현재 시장 국면에서는 단기 신호가 약해 순위를 제공하지 않습니다.",
      })
    }
  }

  // ④ 단지 위치 (같은 지역·연식군일 때만 응답에 실림)
  if (a.apt_position && b.apt_position) {
    rows.push({
      label: "단지 위치",
      a: a.apt_position.top_pct != null ? `상위 ${Math.round(a.apt_position.top_pct)}%` : "-", // top_pct 낮을수록 유리
      b: b.apt_position.top_pct != null ? `상위 ${Math.round(b.apt_position.top_pct)}%` : "-",
      note: "이 서열은 10번 중 6~7번 맞는 신호입니다",
    })
  }

  return rows
}
