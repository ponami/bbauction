// app/api/neighborhood-apts/route.ts
// 특정 동네(lawdCd)의 저평가 TOP7 / 최고가 TOP7 아파트 반환
import { NextRequest, NextResponse } from "next/server"
import { parseStringPromise } from "xml2js"
import { format, subMonths } from "date-fns"

const KOSIS_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"

interface Tx {
  name: string
  price: number
  area: number
  pricePerM2: number
  dong: string
}

export interface AptRankItem {
  rank: number
  name: string
  dong: string        // 법정동 (예: "대치동")
  count: number
  avgPrice: number
  avgPricePerM2: number
  mainAreas: string[]
  discountRatio?: number
}

export async function GET(req: NextRequest) {
  const lawdCd = req.nextUrl.searchParams.get("lawdCd")?.trim() || ""
  const apiKey = process.env.KOSIS_API_KEY

  if (!lawdCd) return NextResponse.json({ undervalued: [], expensive: [] })
  if (!apiKey) return NextResponse.json({ undervalued: [], expensive: [], message: "API 키 미설정" })

  try {
    const key = apiKey.includes("%") ? decodeURIComponent(apiKey) : apiKey
    const txMap = new Map<string, Tx[]>()
    const aptDong = new Map<string, string>() // apt name → 법정동

    // 6개월치 병렬 조회
    const monthResults = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const yyyymm = format(subMonths(new Date(), i), "yyyyMM")
        const url = new URL(KOSIS_BASE)
        url.searchParams.set("serviceKey", key)
        url.searchParams.set("LAWD_CD", lawdCd)
        url.searchParams.set("DEAL_YMD", yyyymm)
        url.searchParams.set("numOfRows", "1000")
        url.searchParams.set("pageNo", "1")
        return fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
          .then(r => r.ok ? r.text() : "")
          .catch(() => "")
      })
    )

    for (const xml of monthResults) {
      if (!xml) continue
      const parsed = await parseStringPromise(xml, { explicitArray: false })
      const items = parsed?.response?.body?.items?.item
      if (!items) continue

      const list = Array.isArray(items) ? items : [items]
      for (const item of list) {
        const name = String(item["아파트"] || item["aptNm"] || "").trim()
        const priceStr = String(item["거래금액"] || item["dealAmount"] || "0")
          .replace(/,/g, "").trim()
        const areaStr = String(item["전용면적"] || item["excluUseAr"] || "0").trim()

        const price = parseInt(priceStr) || 0
        const area = parseFloat(areaStr) || 0
        const dong = String(item["법정동"] || item["umdNm"] || "").trim()
        if (!name || price <= 0 || area <= 0) continue

        if (!txMap.has(name)) txMap.set(name, [])
        txMap.get(name)!.push({ name, price, area, pricePerM2: price / area, dong })
        if (dong && !aptDong.has(name)) aptDong.set(name, dong)
      }
    }

    const allTxs = [...txMap.values()].flat()
    if (allTxs.length === 0) {
      return NextResponse.json({ undervalued: [], expensive: [], message: "해당 지역 실거래 데이터 없음" })
    }

    const areaAvgPpm2 = allTxs.reduce((s, t) => s + t.pricePerM2, 0) / allTxs.length

    const stats: AptRankItem[] = []
    for (const [name, txs] of txMap) {
      if (txs.length < 2) continue

      const avgPrice = txs.reduce((s, t) => s + t.price, 0) / txs.length
      const avgPricePerM2 = txs.reduce((s, t) => s + t.pricePerM2, 0) / txs.length

      const pyCount = new Map<number, number>()
      for (const tx of txs) {
        const py = Math.round(tx.area / 3.3058)
        pyCount.set(py, (pyCount.get(py) || 0) + 1)
      }
      const mainAreas = [...pyCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([py]) => `${py}평`)

      stats.push({
        rank: 0,
        name,
        dong: aptDong.get(name) || "",
        count: txs.length,
        avgPrice: Math.round(avgPrice),
        avgPricePerM2: Math.round(avgPricePerM2),
        mainAreas,
        discountRatio: Math.round((avgPricePerM2 / areaAvgPpm2) * 100) / 100,
      })
    }

    const undervalued = [...stats]
      .sort((a, b) => (a.discountRatio ?? 1) - (b.discountRatio ?? 1))
      .slice(0, 7)
      .map((s, i) => ({ ...s, rank: i + 1 }))

    const expensive = [...stats]
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 7)
      .map((s, i) => ({ ...s, rank: i + 1 }))

    return NextResponse.json({
      undervalued,
      expensive,
      areaAvgPpm2: Math.round(areaAvgPpm2),
      totalTx: allTxs.length,
    })
  } catch (err) {
    console.error("[neighborhood-apts]", err)
    return NextResponse.json({ undervalued: [], expensive: [], error: "데이터 조회 중 오류가 발생했습니다" })
  }
}
