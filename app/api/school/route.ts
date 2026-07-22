import { NextResponse } from "next/server"
import { analyzeWithClaude } from "@/lib/claude"
import { withCache, CACHE_TTL } from "@/lib/cache"
import { getMyCoords, findNearbySchools, findNearbyAcademies, findNearbyMiddleSchools, findNearbyHighSchools } from "@/services/kakao"
import type { ApiResponse, CategoryResult } from "@/lib/types"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address  = searchParams.get("address") || undefined
  const aptName  = searchParams.get("apt")     || undefined
  const lawdCd   = searchParams.get("lawdCd")  || undefined
  const aptKey   = (aptName || "default").replace(/\s+/g, "-").slice(0, 20)
  try {
    const { data, cached, cachedAt } = await withCache(
      `school:${aptKey}`, CACHE_TTL.school,
      async () => {
        const coords = await getMyCoords(address)
        const [schools, academies, middleSchools, highSchools] = await Promise.all([
          findNearbySchools(coords, 1000),
          findNearbyAcademies(coords, 1500),
          findNearbyMiddleSchools(coords, 2000),
          findNearbyHighSchools(coords, 3000),
        ])
        const hasChoopuma = schools.some((s) => s.isChoopuma)
        const analysisData = {
          schools,
          schoolCount: schools.length,
          middleSchools,
          middleSchoolCount: middleSchools.length,
          highSchools,
          highSchoolCount: highSchools.length,
          academies,
          academyCount: academies.length,
          hasChoopuma,
          closestSchool: schools[0] ?? null,
          closestMiddleSchool: middleSchools[0] ?? null,
          closestHighSchool: highSchools[0] ?? null,
          closestAcademy: academies[0] ?? null,
          context: "초품아 = 신호등 없이 도보로 초등학교 접근 가능. 초·중·고 학교 수와 거리, 학원 수는 모두 생활권 판단에 참고하고, 점수에는 보조지표로만 반영한다.",
        }
        let analysis
        let error: string | undefined
        try {
            analysis = await analyzeWithClaude("school", analysisData, address, aptName)
        } catch (err) {
          error = err instanceof Error ? err.message : "분석 오류"
          analysis = { score: 50, trend: "neutral" as const, summary: "분석 오류", items: [] }
        }
        return {
          ...analysis,
          id: "school",
          updatedAt: new Date().toISOString(),
          error,
          rawData: {
            schoolCount: schools.length,
            middleSchoolCount: middleSchools.length,
            highSchoolCount: highSchools.length,
            academyCount: academies.length,
            hasChoopuma,
            closestSchool: schools[0] ?? null,
            closestMiddleSchool: middleSchools[0] ?? null,
            closestHighSchool: highSchools[0] ?? null,
            closestAcademy: academies[0] ?? null,
          },
        } as CategoryResult
      }
    )
    return NextResponse.json({ success: true, data, cached, cachedAt } as ApiResponse<typeof data>)
  } catch (error) {
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}
