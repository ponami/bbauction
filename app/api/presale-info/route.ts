// GET /api/presale-info?aptName=...&lawdCd=...&address=...
// 분양가 자동조회 + 인근 시세 + ML 점수

import { NextRequest, NextResponse } from "next/server"
import { fetchSalePrice } from "@/services/presaleSearch"
import { fetchTrades } from "@/lib/riskAnalysis/tradesFetcher"
import { fetchMlScore } from "@/lib/riskAnalysis/mlScore"
import { getMyCoords, findNearestStation, findNearbySchools } from "@/services/kakao"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const aptName = searchParams.get("aptName") || ""
  const lawdCd  = searchParams.get("lawdCd")  || ""
  const address = searchParams.get("address") || ""

  if (!aptName) return NextResponse.json({ error: "aptName 필수" }, { status: 400 })

  const [salePrice, tradesResult, mlResult, coords] = await Promise.all([
    fetchSalePrice(aptName),
    lawdCd ? fetchTrades(lawdCd, aptName, 24).catch(() => ({ trades: [], stats: null, priceHistory: [], tradesByArea: {} })) : Promise.resolve({ trades: [], stats: null, priceHistory: [], tradesByArea: {} }),
    lawdCd ? fetchMlScore(lawdCd).catch(() => null) : Promise.resolve(null),
    address ? getMyCoords(address).catch(() => null) : Promise.resolve(null),
  ])

  const [nearestStation, schools] = coords
    ? await Promise.all([
        findNearestStation(coords).catch(() => null),
        findNearbySchools(coords, 1000).catch(() => []),
      ])
    : [null, []]

  // 시세차익 계산: 인근 실거래 평균 - 분양가 중간값
  const nearbyAvg  = tradesResult.stats?.avg ?? null
  const saleMid    = salePrice.min != null
    ? salePrice.max != null ? Math.round((salePrice.min + salePrice.max) / 2) : salePrice.min
    : null
  const expectedGain = (nearbyAvg && saleMid) ? nearbyAvg - saleMid : null

  // ML 방향성
  const safetyScore = mlResult?.safetyScore ?? null
  const mlDirection = safetyScore == null ? null
    : safetyScore >= 65 ? "up" : safetyScore >= 45 ? "neutral" : "down"

  return NextResponse.json({
    aptName,
    lawdCd,
    salePrice,
    nearbyStats: tradesResult.stats,
    nearbyTrades: tradesResult.trades.slice(0, 5),
    expectedGain,
    safetyScore,
    mlDirection,
    mlDirectionScore: mlResult?.mlDirectionScore ?? null,
    horizons: mlResult?.horizons ?? [],
    regionName: mlResult?.regionName ?? "",
    nearestStation: nearestStation
      ? { name: nearestStation.name, distanceM: nearestStation.distance }
      : null,
    schoolCount: Array.isArray(schools) ? schools.length : 0,
  })
}
