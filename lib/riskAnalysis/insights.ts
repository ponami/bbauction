import { findLifeInfra } from "@/services/kakao"
import type { BusStopWithRoutes } from "@/services/transit"

export function buildSchoolInsight(
  schools: { name: string; distance: number; walkMinutes: number; isChoopuma: boolean; isChoopumaViaGate: boolean; gateOffset: number }[],
  middleSchools: { name: string; distance: number; walkMinutes: number }[],
  highSchools: { name: string; distance: number; walkMinutes: number }[],
  academies: { name: string; distance: number; walkMinutes: number }[]
) {
  const closestSchool       = schools[0] ?? null
  const closestMiddleSchool = middleSchools[0] ?? null
  const closestHighSchool   = highSchools[0] ?? null
  const closestAcademy      = academies[0] ?? null
  const schoolCount         = schools.length
  const middleSchoolCount   = middleSchools.length
  const highSchoolCount     = highSchools.length
  const academyCount        = academies.length
  const hasChoopuma         = schools.some(s => s.isChoopuma)
  const hasChoopumaViaGate  = !hasChoopuma && schools.some(s => s.isChoopumaViaGate)
  const gateOffset          = closestSchool?.gateOffset ?? 100
  const schoolWalkMin       = closestSchool?.walkMinutes ?? null
  const schoolDistance      = closestSchool?.distance ?? null
  const middleSchoolDistance = closestMiddleSchool?.distance ?? null
  const highSchoolDistance  = closestHighSchool?.distance ?? null
  const schoolList          = schools.slice(0, 3).map(s => `${s.name} ${s.distance}m`).join(", ") || "없음"
  const middleSchoolList    = middleSchools.slice(0, 3).map(s => `${s.name} ${s.distance}m`).join(", ") || "없음"
  const highSchoolList      = highSchools.slice(0, 3).map(s => `${s.name} ${s.distance}m`).join(", ") || "없음"
  const academyList         = academies.slice(0, 3).map(a => `${a.name} ${a.distance}m`).join(", ") || "없음"
  const academyDensity      = academyCount >= 8 ? "높음" : academyCount >= 4 ? "보통" : "낮음"
  const choopumaLabel       = (hasChoopuma || hasChoopumaViaGate) ? "초품아" : "초품아 아님"
  const parentConvenience   = hasChoopuma && academyCount >= 5
    ? "좋은 편"
    : ((hasChoopumaViaGate || (schoolDistance != null && schoolDistance <= 500)) && academyCount >= 3)
      ? "무난한 편"
      : "보수적으로 보는 편"

  return {
    schoolCount, middleSchoolCount, highSchoolCount, academyCount,
    closestSchool, closestMiddleSchool, closestHighSchool, closestAcademy,
    hasChoopuma, hasChoopumaViaGate, gateOffset, choopumaLabel,
    schoolWalkMin, schoolDistance, middleSchoolDistance, highSchoolDistance,
    schoolList, middleSchoolList, highSchoolList, academyList,
    academyDensity, parentConvenience,
  }
}

export function buildLifeInfraSummary(infra: Awaited<ReturnType<typeof findLifeInfra>>): string {
  const parts: string[] = []
  if (infra.hospital)    parts.push(`병원/의원 ${infra.hospital.count}곳(가장 가까운 ${infra.hospital.closest} ${infra.hospital.closestDist}m)`)
  if (infra.pharmacy)    parts.push(`약국 ${infra.pharmacy.count}곳(${infra.pharmacy.closestDist}m)`)
  if (infra.restaurant)  parts.push(`음식점·카페 ${(infra.restaurant.count) + (infra.cafe?.count ?? 0)}곳`)
  if (infra.publicOffice) parts.push(`${infra.publicOffice.closest} ${infra.publicOffice.closestDist}m`)
  return parts.length > 0 ? parts.join(" · ") : "생활 인프라 정보 없음"
}

export function buildTransitInsight(
  nearestStation: { name: string; distance: number; walkMinutes: number } | null,
  busStops: BusStopWithRoutes[]
) {
  return {
    nearestStation,
    busStops,
    futureTransit: "현재 분석 자료에서는 추가 예정 교통이 확인되지 않았습니다.",
  }
}
