// app/api/risk-analysis/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/getSessionUser"
import { canAccessDeepAnalysisByName } from "@/lib/userTier"
import { getRentalAnalysisBlockReason } from "@/lib/propertyClassification"
import { findNearbyAcademies, findNearbyHighSchools, findNearbyMiddleSchools, findNearbySchools, findNearestStation, findLifeInfra, getMyCoords, calcGateOffset } from "@/services/kakao"
import { findNearbyBusStopsWithRoutes } from "@/services/transit"
import { fetchApartmentMeta, fetchTrades, fetchVillaTrades, lookupVillaArea } from "@/lib/riskAnalysis/tradesFetcher"
import { fetchMlScore, fetchOreuljiScore } from "@/lib/riskAnalysis/mlScore"
import { estimateOfferRange } from "@/lib/riskAnalysis/floorParser"
import { buildPriceGuidance } from "@/lib/riskAnalysis/priceGuidance"
import { buildSchoolInsight, buildLifeInfraSummary, buildTransitInsight } from "@/lib/riskAnalysis/insights"
import { generateRiskAnalysis, generateReport } from "@/lib/riskAnalysis/reportBuilder"
import { computeSellSignal } from "@/lib/riskAnalysis/sellSignal"
import { fetchRegionHoaeNews, fetchTransportNews, fetchPolicyNews, fetchPoliticsNews, fetchMomcafeNews, searchBuildingOnNaver } from "@/services/naver"
import { reportLookupError } from "@/lib/lookupErrorReporter"
import { extractLocationKeyword } from "@/lib/address"
import { analyzeWithClaude } from "@/lib/claude"
import { withCache, CACHE_TTL } from "@/lib/cache"
import type { CategoryId } from "@/lib/types"
import { fetchRealPrices } from "@/services/kosis"
import { buildReferenceTrades } from "@/lib/riskAnalysis/comparableTrades"
import { buildReportInputModel, parseReportInputOverrides } from "@/lib/riskAnalysis/reportInputModel"

// ai-category와 동일한 캐시 키를 사용해서 중복 AI 호출 방지
async function getCategoryScore(
  category: "transport" | "policy" | "politics" | "momcafe",
  address: string,
  aptName: string,
) {
  const aptKey  = (aptName || "default").replace(/\s+/g, "-").slice(0, 20)
  const fetcher = { transport: fetchTransportNews, policy: fetchPolicyNews, politics: fetchPoliticsNews, momcafe: fetchMomcafeNews }[category]
  const context = { transport: "교통 호재·지하철 연장", policy: "부동산 정책·규제", politics: "지역 공약·개발", momcafe: "실거주 수요·학군" }[category]
  try {
    const { data } = await withCache(
      `${category}:${aptKey}`,
      CACHE_TTL[category as CategoryId],
      async () => {
        const news = await fetcher(address, aptName).catch(() => ([] as import("@/lib/types").NewsItem[]))
        const analysis = await analyzeWithClaude(category, { news: news.slice(0, 8), context }, address, aptName)
        return { ...analysis, id: category, updatedAt: new Date().toISOString() }
      },
    )
    return data as { score: number; trend: string; summary: string }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lawdCd       = searchParams.get("lawdCd")       || ""
  const aptName      = searchParams.get("aptName")      || ""
  const address      = searchParams.get("address")      || process.env.MY_ADDRESS || ""
  const dong         = searchParams.get("dong")         || ""
  const propertyType = searchParams.get("propertyType") || "apt"   // apt | villa
  const umdNm        = searchParams.get("umdNm")        || ""
  const bjdongCd     = searchParams.get("bjdongCd")     || ""
  const areaM2Str    = searchParams.get("areaM2")       || ""
  const areaM2       = areaM2Str ? parseFloat(areaM2Str) : null
  const reportInputOverrides = parseReportInputOverrides(searchParams)

  if (!lawdCd || !aptName) {
    return NextResponse.json({ error: "lawdCd, aptName 필수" }, { status: 400 })
  }

  // 심층 분석 권한 확인 (구독 또는 단건 구매 필요)
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { authorized: false, error: "심층 분석은 로그인 후 이용할 수 있습니다", code: "LOGIN_REQUIRED" },
      { status: 401 }
    )
  }
  const access = await canAccessDeepAnalysisByName(user.id, aptName, lawdCd)
  if (!access.allowed) {
    if (access.reason === "limit_exceeded") {
      return NextResponse.json(
        {
          authorized: false,
          error: `이번 달 분석 횟수(${access.limit}회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.`,
          code: "LIMIT_EXCEEDED",
          used: access.used,
          limit: access.limit,
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { authorized: false, error: "이 아파트의 심층 분석을 이용하려면 단건 구매 또는 유료구독이 필요합니다", code: "UPGRADE_REQUIRED" },
      { status: 403 }
    )
  }

  // 구독 사용량 선기록 (동시 요청 어뷰징·크롤링 방지) — canAccessDeepAnalysisByName 내부에서 처리됨

  const isVilla = propertyType === "villa"

  // villa: 지번(aptName)으로 면적 자동 조회 (areaM2 미전달 시)
  const jibun = isVilla ? aptName.replace(/\s+/g, "") : ""
  const villaLookup = (isVilla && !areaM2)
    ? await lookupVillaArea(lawdCd, bjdongCd, jibun)
    : null
  const resolvedAreaM2 = areaM2 ?? villaLookup?.area ?? null

  const aptMeta     = isVilla ? null : await fetchApartmentMeta(aptName, lawdCd)
  const gateOffsetM = calcGateOffset(aptMeta?.households)
  const isPresaleApt = Boolean(aptMeta?.isPresale)

  const coords = (aptMeta?.lat && aptMeta?.lon)
    ? { lat: aptMeta.lat, lng: aptMeta.lon }
    : await getMyCoords(address || process.env.MY_ADDRESS || "")

  const locationKeyword = extractLocationKeyword(address || aptName || umdNm || "")

  const [tradeResult, allLawdTrades, mlResult, schools, middleSchools, highSchools, academies, nearestStation, lifeInfra, busStops, regionNews, transportScore, policyScore, politicsScore, momcafeScore] = await Promise.all([
    isPresaleApt
      ? Promise.resolve({ trades: [], stats: null, priceHistory: [], tradesByArea: {} })
      : isVilla
      ? fetchVillaTrades(lawdCd, umdNm, resolvedAreaM2, 12)
      : fetchTrades(lawdCd, aptName, 24, dong || undefined, aptMeta?.umdNm || umdNm || undefined),
    !isVilla && !isPresaleApt && lawdCd
      ? fetchRealPrices(24, lawdCd).catch(() => [])
      : Promise.resolve([]),
    fetchMlScore(lawdCd),
    findNearbySchools(coords, 1000, gateOffsetM),
    findNearbyMiddleSchools(coords, 2000),
    findNearbyHighSchools(coords, 3000),
    findNearbyAcademies(coords, 1500),
    findNearestStation(coords),
    findLifeInfra(coords, 500),
    findNearbyBusStopsWithRoutes(coords.lat, coords.lng),
    locationKeyword ? fetchRegionHoaeNews(locationKeyword, aptName).catch(() => []) : Promise.resolve([]),
    getCategoryScore("transport", address, aptName),
    getCategoryScore("policy",    address, aptName),
    getCategoryScore("politics",  address, aptName),
    getCategoryScore("momcafe",   address, aptName),
  ])

  // ── 빌라 조회 실패 + 거래 이력 없음 → 네이버 검색 fallback ──
  if (isVilla && villaLookup === null && tradeResult.trades.length === 0) {
    const naverResult = await searchBuildingOnNaver(address || aptName, aptName).catch(() => null)

    await reportLookupError({
      address:      address || aptName,
      aptName,
      lawdCd,
      propertyType,
      reason:       naverResult?.isNewConstruction ? "new_construction" : "registry_miss",
      naverTitles:  naverResult?.titles ?? [],
    })

    const userMessage = naverResult?.isNewConstruction
      ? naverResult.summary
      : "건물 정보를 찾을 수 없습니다. 주소를 다시 확인해 주세요."

    return NextResponse.json({
      success:     false,
      error:       userMessage,
      naverTitles: naverResult?.titles ?? [],
      isNewConstruction: naverResult?.isNewConstruction ?? false,
    }, { status: 404 })
  }

  const rentalBlockReason = getRentalAnalysisBlockReason(aptName, undefined, tradeResult.trades.length)
  if (rentalBlockReason) {
    return NextResponse.json({ success: false, error: rentalBlockReason }, { status: 422 })
  }

  const safetyScore    = mlResult?.safetyScore ?? 50
  const regretPct      = Math.round(100 - safetyScore * 0.85)
  const offerRange     = estimateOfferRange(tradeResult.trades)
  const priceGuidance  = buildPriceGuidance(tradeResult.stats, safetyScore, regretPct, offerRange)
  const reportInput = buildReportInputModel({
    ...reportInputOverrides,
    targetPrice: priceGuidance.targetPrice,
    buildYear: aptMeta?.buildYear ?? null,
  })
  const schoolInsight  = buildSchoolInsight(schools, middleSchools, highSchools, academies)
  const transitInsight = buildTransitInsight(nearestStation, busStops)
  const lifeInfraSummary = buildLifeInfraSummary(lifeInfra)

  // 오를지 종합점수: 게이트 oreulji_score(65%) + AI 카테고리 평균(35%)
  const GATE_URL  = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"
  const gateScore = aptMeta?.aptId ? await fetchOreuljiScore(aptMeta.aptId).catch(() => null) : null
  const mlBase    = gateScore?.oreuljiScore ?? safetyScore
  const catScores = [transportScore, policyScore, politicsScore, momcafeScore].filter((s): s is NonNullable<typeof s> => s != null)
  const catAvg    = catScores.length > 0 ? Math.round(catScores.reduce((a, c) => a + c.score, 0) / catScores.length) : null
  const oreuljiScore = catAvg !== null
    ? Math.round(mlBase * 0.65 + catAvg * 0.35)
    : mlBase

  // 매도 타이밍 시그널
  const sellSignal = computeSellSignal({
    oreuljiScore,
    mlDirectionScore: mlResult?.mlDirectionScore ?? null,
    regretPct,
    catAvg,
    horizons: mlResult?.horizons ?? [],
  })

  // 동네 랭킹 + 대안 단지 (게이트 서버, 아파트만)
  const aptId = aptMeta?.aptId ?? null
  const [ranking, alternatives] = aptId
    ? await Promise.all([
        fetch(`${GATE_URL}/apt/${aptId}/rank`, { signal: AbortSignal.timeout(4000) })
          .then(r => r.ok ? r.json() : null).catch(() => null),
        oreuljiScore < 55
          ? fetch(`${GATE_URL}/apt/${aptId}/similar?limit=5`, { signal: AbortSignal.timeout(4000) })
              .then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
      ])
    : [null, null]
  const referenceAreaM2 = !isVilla
    ? (areaM2 ?? tradeResult.trades[0]?.area ?? null)
    : resolvedAreaM2
  const referenceTradeData = !isVilla && !isPresaleApt
    ? buildReferenceTrades(allLawdTrades, aptName, referenceAreaM2, aptMeta?.umdNm || umdNm || null)
    : { trades: [], scope: "none" as const, note: null as string | null }

  const sharedParams = {
    aptName,
    buildYear:   aptMeta?.buildYear  ?? null,
    households:  aptMeta?.households ?? null,
    sigunguNm:   aptMeta?.sigunguNm  ?? null,
    umdNm:       aptMeta?.umdNm      ?? null,
    safetyScore,
    oreuljiScore,
    regretPct,
    targetPrice: priceGuidance.targetPrice,
    discountPct: priceGuidance.discountPct,
    mlScore:     mlResult?.mlDirectionScore ?? null,
    stats:       tradeResult.stats,
    trades:      tradeResult.trades,
    horizons:    mlResult?.horizons ?? [],
    regionName:  mlResult?.regionName ?? "",
    offerRange,
    schoolInsight,
    transitInsight,
    lifeInfraSummary,
    regionNews,
    referenceTrades: referenceTradeData.trades,
    referenceTradeScope: referenceTradeData.scope,
    referenceTradeNote: referenceTradeData.note,
    alternatives: alternatives?.alternatives ?? null,
    budget: reportInput.budget,
    purpose: reportInput.purpose,
    reportPersona: reportInput.reportPersona === "general" ? "first-home" : reportInput.reportPersona,
    reportInput,
    categoryScores: {
      transport: transportScore,
      policy:    policyScore,
      politics:  politicsScore,
      momcafe:   momcafeScore,
    },
  }

  const [llm, report] = await Promise.all([
    generateRiskAnalysis({ ...sharedParams, lawdCd }),
    generateReport(sharedParams),
  ])

  return NextResponse.json({
    aptName,
    lawdCd,
    propertyType,
    is_presale: isPresaleApt,
    oreuljiScore,
    buildYear:         aptMeta?.buildYear ?? villaLookup?.buildYear ?? null,
    villaInfo: isVilla ? {
      name:        villaLookup?.name       ?? null,
      area:        resolvedAreaM2,
      areas:       villaLookup?.areas      ?? null,        // 집합건물: 호실별 전용면적 목록
      floorAreas:  villaLookup?.floorAreas ?? null,        // 일반건축물: 층별 면적
      purpose:     villaLookup?.purpose    ?? null,        // 주용도 (단독주택, 다세대주택 등)
      isMultiUnit: villaLookup?.isMultiUnit ?? null,
      areaFound:   villaLookup !== null,
      areaNote: (() => {
        if (!villaLookup) return `면적 자동 조회 실패 — 건축물대장·거래 이력 모두 없습니다. 면적을 직접 입력하면 비슷한 평형 비교가 가능합니다.`
        const areaPy = Math.round((resolvedAreaM2 ?? 0) / 3.3058)
        if (villaLookup.isMultiUnit && villaLookup.areas && villaLookup.areas.length > 1) {
          const areaList = villaLookup.areas.map(a => `${a}㎡(${Math.round(a / 3.3058)}평)`).join(", ")
          return `집합건물 — 건물 내 ${villaLookup.areas.length}개 호실 면적: ${areaList}. 대표 전용면적 ${resolvedAreaM2}㎡(${areaPy}평) 기준으로 비교합니다.`
        }
        if (!villaLookup.isMultiUnit && villaLookup.floorAreas && villaLookup.floorAreas.length > 0) {
          const flrList = villaLookup.floorAreas.map(f => `${f.floor}층 ${f.area}㎡(${Math.round(f.area / 3.3058)}평)`).join(", ")
          return `${villaLookup.purpose || "일반건축물"} — 층별 면적: ${flrList}. 거주 층에 맞는 면적을 직접 입력하면 더 정확한 비교가 가능합니다.`
        }
        return `전용면적 ${resolvedAreaM2}㎡ (${areaPy}평) — 건축물대장에서 자동 확인`
      })(),
      nearbyNote: `${umdNm || "인근"} 연립·다세대 ${(tradeResult as { nearbyCount?: number }).nearbyCount ?? tradeResult.stats?.count ?? 0}건 비교 (12개월)${resolvedAreaM2 ? ` · 전용 ${resolvedAreaM2}㎡ ±10㎡ 필터` : " · 전체 평형"}`,
    } : null,
    safetyScore,
    regretPct,
    regionName:        mlResult?.regionName ?? "",
    trades:            tradeResult.trades,
    stats:             tradeResult.stats,
    priceHistory:      tradeResult.priceHistory,
    tradesByArea:      tradeResult.tradesByArea,
    nearbyCount:       (tradeResult as { nearbyCount?: number }).nearbyCount ?? null,
    mlEngineConnected: !!mlResult,
    horizons:          mlResult?.horizons ?? [],
    sellSignal,
    ranking,
    alternatives:      alternatives?.alternatives ?? null,
    llm,
    report,
  })
}
