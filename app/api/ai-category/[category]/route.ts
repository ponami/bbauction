import { NextResponse } from "next/server"
import { analyzeWithClaude } from "@/lib/claude"
import { withCache, invalidateCache, CACHE_TTL } from "@/lib/cache"
import { fetchTransportNews, fetchPolicyNews, fetchPoliticsNews, fetchGlobalNews, fetchMomcafeNews } from "@/services/naver"
import { fetchEconomicIndicators, formatIndicatorsForAnalysis } from "@/services/bok"
import { getMyCoords, findNearestStation, findMomcafeInfra } from "@/services/kakao"
import type { ApiResponse, CategoryResult, CategoryId } from "@/lib/types"

type AiCategory = "transport" | "policy" | "politics" | "global" | "momcafe" | "geo"

const VALID: AiCategory[] = ["transport", "policy", "politics", "global", "momcafe", "geo"]

async function fetchCategoryData(
  category: AiCategory,
  address?: string,
  aptName?: string,
): Promise<Record<string, unknown>> {
  const loc = (address || process.env.MY_ADDRESS || "분석 지역").split(" ").slice(0, 3).join(" ")

  switch (category) {
    case "transport": {
      const news = await fetchTransportNews(address, aptName).catch(() => [])
      return { news: news.slice(0, 8), context: `${loc} 교통 호재 — 지하철 연장, GTX, 광역버스 계획` }
    }
    case "policy": {
      const news = await fetchPolicyNews(address, aptName).catch(() => [])
      return { news: news.slice(0, 8), context: `${loc} 현재 정책 현황 분석` }
    }
    case "politics": {
      const news = await fetchPoliticsNews(address, aptName).catch(() => [])
      return { news: news.slice(0, 8), context: `${loc} 지역 공약 이행 현황` }
    }
    case "global": {
      const [indicators, news] = await Promise.all([
        fetchEconomicIndicators(),
        fetchGlobalNews(address, aptName).catch(() => []),
      ])
      return {
        indicators: formatIndicatorsForAnalysis(indicators),
        news: news.slice(0, 5),
        rawIndicators: indicators,
      }
    }
    case "momcafe": {
      const coords = await getMyCoords(address)
      const [news, infra] = await Promise.all([
        fetchMomcafeNews(address, aptName).catch(() => []),
        findMomcafeInfra(coords, 800),
      ])
      return {
        news: news.slice(0, 8),
        context: `${loc} 실거주 수요 — 가족친화 생활인프라 분석`,
        생활인프라: {
          마트:   infra.mart   ? `${infra.mart.closest} (${infra.mart.closestDist}m, 반경 800m 내 ${infra.mart.count}개)` : null,
          공원:   infra.park   ? `${infra.park.closest} (${infra.park.closestDist}m, 반경 800m 내 ${infra.park.count}개)` : null,
          키즈카페: infra.kidsCafe ? `${infra.kidsCafe.closest} (${infra.kidsCafe.closestDist}m, ${infra.kidsCafe.count}개)` : null,
          소아과: infra.pediatrics ? `${infra.pediatrics.closest} (${infra.pediatrics.closestDist}m, ${infra.pediatrics.count}개)` : null,
          약국:   infra.pharmacy ? `${infra.pharmacy.closest} (${infra.pharmacy.closestDist}m, ${infra.pharmacy.count}개)` : null,
        },
      }
    }
    case "geo": {
      const coords = await getMyCoords(address)
      const station = await findNearestStation(coords)
      return {
        address: address || process.env.MY_ADDRESS,
        coords,
        nearestStation: station,
        context: `${loc} 입지 분석 — 서울 접근성, 교통망, 개발 계획`,
      }
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params

  if (!VALID.includes(category as AiCategory)) {
    return NextResponse.json({ success: false, error: "유효하지 않은 카테고리" }, { status: 400 })
  }

  const cat = category as AiCategory
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address") || undefined
  const aptName = searchParams.get("apt")     || undefined
  const lawdCd  = searchParams.get("lawdCd")  || undefined
  const aptKey  = (aptName  || "default").replace(/\s+/g, "-").slice(0, 20)
  const areaKey = (lawdCd   || address?.replace(/\s+/g, "-").slice(0, 12) || "nokey")

  // 글로벌/정치는 매크로 데이터 — 아파트명과 무관, 실패 시 재시도
  const isMacro = cat === "global" || cat === "politics"
  const cacheKey = isMacro ? `${cat}:${areaKey}` : `${cat}:${areaKey}:${aptKey}`

  try {
    const { data, cached, cachedAt } = await withCache(
      cacheKey,
      CACHE_TTL[cat as CategoryId],
      async () => {
        const analysisData = await fetchCategoryData(cat, address, aptName)
        let analysis
        let error: string | undefined
        try {
          analysis = await analyzeWithClaude(cat, analysisData, address, aptName)
        } catch (err) {
          error = err instanceof Error ? err.message : "분석 오류"
          analysis = { score: 50, trend: "neutral" as const, summary: "분석 오류", items: [] }
        }
        return {
          ...analysis,
          id: cat,
          updatedAt: new Date().toISOString(),
          error,
          rawData: analysisData,
        } as CategoryResult
      },
    )

    // 매크로 카테고리는 실패 결과를 캐시하지 않고 다음 요청이 재시도하도록 함
    if (isMacro && data.error) {
      invalidateCache(cacheKey)
    }
    return NextResponse.json({ success: true, data, cached, cachedAt } as ApiResponse<typeof data>)
  } catch (error) {
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}
