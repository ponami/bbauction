// 학군 등급 (F2, 표시 전용) — gate services/school_grade.py의 미러.
// 경계 박제 2026-07-17 (PLAN_richgo_features_impl_20260717.md §G). 초과(>) 비교 — 변경 금지.
// 경계 개정 시(별도 승인) 두 파일을 함께 수정할 것.

export const SCHOOL_GRADE_BOUNDS = [39, 27, 17, 10] as const

/** edu/school score → 1~5 등급 (1 = 최상). 결측 → null (배지 숨김). */
export function schoolGrade(score: number | null | undefined): number | null {
  if (score == null || score <= 0) return null
  for (let i = 0; i < SCHOOL_GRADE_BOUNDS.length; i++) {
    if (score > SCHOOL_GRADE_BOUNDS[i]) return i + 1
  }
  return 5
}

/** "N등급" 라벨. 결측 → null. */
export function schoolGradeLabel(score: number | null | undefined): string | null {
  const g = schoolGrade(score)
  return g == null ? null : `${g}등급`
}
