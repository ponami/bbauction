// app/api/compare-apts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { parseStringPromise } from "xml2js"
import { format, subMonths } from "date-fns"
import { extractNeighborhoodName, isSameNeighborhood } from "@/lib/address"

const KOSIS_BASE = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"

function normalizeAptName(name: string) {
  return String(name || "").replace(/\s+/g, "").replace(/아파트|APT|apt/gi, "").replace(/[·.\-_/()]/g, "").toLowerCase()
}

async function fetchTradesFor(lawdCd: string, aptName: string, addressHint = "", monthsBack = 36) {
  const apiKey = process.env.KOSIS_API_KEY
  if (!lawdCd || !aptName) return { trades: [], message: "missing params" }
  if (!apiKey) return { trades: [], message: "KOSIS_API_KEY not set" }

  const key = apiKey.includes("%") ? decodeURIComponent(apiKey) : apiKey
  const targetNeighborhood = extractNeighborhoodName(addressHint)

  // 월별 데이터 병렬 조회 후 아파트명 필터링
  const monthResults = await Promise.all(
    Array.from({ length: monthsBack }, (_, i) => {
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

  const records: any[] = []
  const target = normalizeAptName(aptName)
  for (const xml of monthResults) {
    if (!xml) continue
    try {
      const parsed = await parseStringPromise(xml, { explicitArray: false })
      const items = parsed?.response?.body?.items?.item
      if (!items) continue
      const list = Array.isArray(items) ? items : [items]
      for (const it of list) {
        const name = normalizeAptName(it["아파트"] || it["aptNm"] || "")
        if (!name) continue
        if (name.includes(target) || target.includes(name)) {
          const price = parseInt(String(it["거래금액"] || it["dealAmount"] || "0").replace(/,/g, "")) || 0
          const area = parseFloat(String(it["전용면적"] || it["excluUseAr"] || "0")) || 0
          const floor = String(it["층"] || it["floor"] || "")
          const dealYear = String(it["년"] || it["dealYear"] || "")
          const dealMonth = String(it["월"] || it["dealMonth"] || "")
          const dong = String(it["법정동"] || it["umdNm"] || "")
          if (targetNeighborhood && dong && !isSameNeighborhood(targetNeighborhood, dong)) continue
          const dealDate = dealYear && dealMonth ? `${dealYear}-${String(dealMonth).padStart(2, "0")}` : ""
          records.push({ aptName: it["아파트"] || it["aptNm"], price, area, floor, dealDate, dong })
        }
      }
    } catch { /* skip malformed month */ }
  }

  // stats
  if (records.length === 0) return { trades: [], stats: { avg: 0, min: 0, max: 0, count: 0 }, mainAreas: [], message: "no trades" }
  const prices = records.map(r => r.price)
  const avg = Math.round(prices.reduce((a,b) => a+b, 0) / prices.length)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const count = prices.length
  const pyCount = new Map()
  for (const r of records) {
    const py = Math.round(r.area / 3.3058)
    pyCount.set(py, (pyCount.get(py) || 0) + 1)
  }
  const mainAreas = [...pyCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([py])=>`${py}평`)

  return { trades: records.sort((a,b)=> b.dealDate.localeCompare(a.dealDate)).slice(0,10), stats: { avg, min, max, count }, mainAreas }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const apt1 = params.get("apt1") || ""
  const apt1Lawd = params.get("apt1Lawd") || ""
  const apt1Address = params.get("apt1Address") || ""
  const apt2 = params.get("apt2") || ""
  const apt2Lawd = params.get("apt2Lawd") || ""
  const apt2Address = params.get("apt2Address") || ""
  const monthsBack = Number(params.get("months") || "36")

  if (!apt1 || !apt1Lawd || !apt2 || !apt2Lawd) {
    return NextResponse.json({ error: "Missing apt1/apt1Lawd/apt2/apt2Lawd" }, { status: 400 })
  }

  try {
    const [r1, r2] = await Promise.all([
      fetchTradesFor(apt1Lawd, apt1, apt1Address, monthsBack),
      fetchTradesFor(apt2Lawd, apt2, apt2Address, monthsBack),
    ])

    return NextResponse.json({ apt1: { name: apt1, lawdCd: apt1Lawd, ...r1 }, apt2: { name: apt2, lawdCd: apt2Lawd, ...r2 } })
  } catch (err) {
    console.error("[compare-apts]", err)
    return NextResponse.json({ error: "비교 데이터를 불러오는 중 오류가 발생했습니다" }, { status: 500 })
  }
}
