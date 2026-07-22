// app/api/reports/weekly/route.ts
// GET /api/reports/weekly — 유저 즐겨찾기 기반 주간 리포트 반환
//
// 각 즐겨찾기의 lawdCd로 Gate API weekly scores 조회,
// 금주 vs 전주 비교, 하이라이트 생성

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/getSessionUser"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "http://localhost:8001"

interface GateWeeklyCategory {
  category: string
  score: number | null
  trend: string | null
  summary: string | null
}

interface GateWeekData {
  week_label: string
  categories: GateWeeklyCategory[]
  avg_score: number | null
}

interface GateSummaryResponse {
  success: boolean
  weeks_data: GateWeekData[]
}

interface WeeklyReportItem {
  aptName: string
  address: string
  lawdCd: string
  thisWeek: {
    weekLabel: string
    avgScore: number | null
    categories: GateWeeklyCategory[]
  } | null
  lastWeek: {
    weekLabel: string
    avgScore: number | null
    categories: GateWeeklyCategory[]
  } | null
  changes: {
    avgScoreDelta: number | null
    topUp: { category: string; delta: number } | null
    topDown: { category: string; delta: number } | null
  }
  highlights: string[]
  recommendation: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: "교통",
  policy: "정책",
  politics: "정치",
  global: "세계경제",
  momcafe: "맘카페",
  geo: "지리/입지",
  school: "학군",
}

function getRecommendation(avgScoreDelta: number | null, topDown: { category: string; delta: number } | null): string | null {
  if (avgScoreDelta === null) return null
  if (avgScoreDelta <= -10) return "리스크 크게 상승, 매도/보류 고려 필요"
  if (avgScoreDelta <= -5) return "리스크 상향, 모니터링 강화 필요"
  if (avgScoreDelta >= 10) return "여건 개선, 구매 타이밍 재검토"
  if (avgScoreDelta >= 5) return "긍정적 변화, 지속 관찰"
  return null
}

function getHighlights(thisWeek: { weekLabel: string; avgScore: number | null; categories: GateWeeklyCategory[] } | null, lastWeek: { weekLabel: string; avgScore: number | null; categories: GateWeeklyCategory[] } | null): string[] {
  const highlights: string[] = []
  if (!thisWeek || !lastWeek) return highlights

  for (const cat of thisWeek.categories) {
    const prev = lastWeek.categories.find(c => c.category === cat.category)
    if (!prev || cat.score === null || prev.score === null) continue
    const delta = cat.score - prev.score
    const catLabel = CATEGORY_LABELS[cat.category] ?? cat.category

    if (delta >= 10) highlights.push(`${catLabel} ${delta}점 상승`)
    else if (delta <= -10) highlights.push(`${catLabel} ${Math.abs(delta)}점 하락`)
  }

  return highlights.slice(0, 3) // 최대 3개
}

function buildItem(
  aptName: string,
  address: string,
  lawdCd: string,
  apiData: GateSummaryResponse,
): WeeklyReportItem {
  const weeks = apiData.weeks_data ?? []

  const mapWeek = (w: GateWeekData): { weekLabel: string; avgScore: number | null; categories: GateWeeklyCategory[] } | null => {
    return {
      weekLabel: w.week_label,
      avgScore: w.avg_score,
      categories: w.categories,
    }
  }

  const thisWeek = weeks[0] ? mapWeek(weeks[0]) : null
  const lastWeek = weeks[1] ? mapWeek(weeks[1]) : null

  // 금주 vs 전주 평균 점수 차이
  const avgScoreDelta =
    thisWeek?.avgScore != null && lastWeek?.avgScore != null
      ? thisWeek.avgScore - lastWeek.avgScore
      : null

  // 카테고리별 증감 (가장 큰 상승/하락)
  let topUp: { category: string; delta: number } | null = null
  let topDown: { category: string; delta: number } | null = null

  if (thisWeek && lastWeek) {
    for (const cat of thisWeek.categories) {
      const prev = lastWeek.categories.find(c => c.category === cat.category)
      if (!prev || cat.score === null || prev.score === null) continue
      const delta = cat.score - prev.score
      if (delta > 0 && (!topUp || delta > topUp.delta)) {
        topUp = { category: cat.category, delta }
      }
      if (delta < 0 && (!topDown || delta < topDown.delta)) {
        topDown = { category: cat.category, delta }
      }
    }
  }

  const highlights = getHighlights(thisWeek, lastWeek)
  const recommendation = getRecommendation(avgScoreDelta, topDown)

  return {
    aptName,
    address,
    lawdCd,
    thisWeek,
    lastWeek,
    changes: { avgScoreDelta, topUp, topDown },
    highlights,
    recommendation,
  }
}

export async function GET() {
  const user = await getSessionUser()

  // 비로그인: 빈 리포트 반환
  if (!user) {
    return NextResponse.json({
      success: true,
      weekLabel: null,
      generatedAt: new Date().toISOString(),
      items: [],
    })
  }

  try {
    // 유저 즐겨찾기 조회
    const favorites = await prisma.favorite.findMany({
      where: { userEmail: user.email },
      select: { aptName: true, address: true, lawdCd: true },
    })

    if (favorites.length === 0) {
      return NextResponse.json({
        success: true,
        weekLabel: null,
        generatedAt: new Date().toISOString(),
        items: [],
      })
    }

    // 즐겨찾기의 lawdCd 중복 제거 (같은 시군구는 한 번만 조회)
    const seenSigungu = new Set<string>()
    const items: WeeklyReportItem[] = []

    for (const fav of favorites) {
      const sigunguCd = fav.lawdCd.slice(0, 5)

      // 같은 시군구는 캐시
      if (!seenSigungu.has(sigunguCd)) {
        seenSigungu.add(sigunguCd)

        try {
          const res = await fetch(
            `${GATE_URL}/weekly/summary?sigungu_cd=${sigunguCd}&weeks=2`,
            { signal: AbortSignal.timeout(5000) },
          )
          if (!res.ok) continue
          const apiData: GateSummaryResponse = await res.json()
          if (!apiData.success) continue

          // 이 시군구의 모든 즐겨찾기에 동일한 데이터 적용
          const sameSigungu = favorites.filter(f => f.lawdCd.slice(0, 5) === sigunguCd)
          for (const sf of sameSigungu) {
            items.push(buildItem(sf.aptName, sf.address, sf.lawdCd, apiData))
          }
        } catch {
          // 개별 API 실패는 무시
        }
      }
    }

    const weekLabel = items.find(i => i.thisWeek)?.thisWeek?.weekLabel ?? null

    return NextResponse.json({
      success: true,
      weekLabel,
      generatedAt: new Date().toISOString(),
      items,
    })
  } catch {
    return NextResponse.json({
      success: true,
      weekLabel: null,
      generatedAt: new Date().toISOString(),
      items: [],
    })
  }
}
