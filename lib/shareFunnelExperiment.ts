// lib/shareFunnelExperiment.ts
// 공유 퍼널 A/B 테스트 — 공유 CTA 타이밍 최적화

export type ShareFunnelVariant = "A" | "B" | "C"

const STORAGE_KEY = "orulzi_share_funnel_variant"

function getStoredVariant(): ShareFunnelVariant | null {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "A" || stored === "B" || stored === "C") return stored
  return null
}

function assignVariant(): ShareFunnelVariant {
  // 사용자 ID 기반 결정적 할당 (변경 최소화)
  const stored = getStoredVariant()
  if (stored) return stored

  const r = Math.random()
  const variant: ShareFunnelVariant = r < 0.34 ? "A" : r < 0.67 ? "B" : "C"
  try {
    window.localStorage.setItem(STORAGE_KEY, variant)
  } catch {}
  return variant
}

let _cachedVariant: ShareFunnelVariant | null = null

export function getShareFunnelVariant(): ShareFunnelVariant {
  if (!_cachedVariant) {
    _cachedVariant = assignVariant()
  }
  return _cachedVariant
}

/**
 * Variant 설명:
 * A (현행): 분석 완료 직후 공유 CTA 노출
 * B (변경): 점수 변동/주간 리포트 도착 시 공유 CTA
 * C (보상): 결정 기록 후 공유 CTA + 보상 미리보기
 */
export const VARIANT_LABELS: Record<ShareFunnelVariant, string> = {
  A: "분석 완료 후 공유",
  B: "변화 발생 시 공유",
  C: "결정 기록 후 보상 공유",
}
