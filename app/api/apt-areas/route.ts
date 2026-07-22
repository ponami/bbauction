// app/api/apt-areas/route.ts
// 특정 아파트의 최근 거래에서 평형(전용면적) 목록 반환
import { NextRequest, NextResponse } from "next/server"
import { parseStringPromise } from "xml2js"
import { format, subMonths } from "date-fns"

const BASE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"

function normalizeAptName(name: string): string {
  return name.replace(/\s+/g, "").replace(/아파트|APT/gi, "").toLowerCase()
}

export async function GET(req: NextRequest) {
  const lawdCd = req.nextUrl.searchParams.get("lawdCd") || ""
  const aptName = req.nextUrl.searchParams.get("apt") || ""
  const apiKey = process.env.KOSIS_API_KEY

  if (!lawdCd || !aptName) {
    return NextResponse.json({ areas: [] })
  }

  if (!apiKey) {
    return NextResponse.json({ areas: [] })
  }

  try {
    const key = apiKey.includes("%") ? decodeURIComponent(apiKey) : apiKey
    const areaSet = new Set<string>()

    // 최근 12개월 조회해서 해당 아파트 평형 수집
    for (let i = 0; i < 12; i++) {
      const yyyymm = format(subMonths(new Date(), i), "yyyyMM")
      const url = new URL(BASE_URL)
      url.searchParams.set("serviceKey", key)
      url.searchParams.set("LAWD_CD", lawdCd)
      url.searchParams.set("DEAL_YMD", yyyymm)
      url.searchParams.set("numOfRows", "100")
      url.searchParams.set("pageNo", "1")

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue

      const xml = await res.text()
      const parsed = await parseStringPromise(xml, { explicitArray: false })
      const items = parsed?.response?.body?.items?.item
      if (!items) continue

      const list = Array.isArray(items) ? items : [items]
      const target = normalizeAptName(aptName)

      for (const item of list) {
        const name = normalizeAptName(item["아파트"] || item["aptNm"] || "")
        if (!name) continue
        if (name.includes(target) || target.includes(name)) {
          const area = String(item["전용면적"] || item["excluUseAr"] || "").trim()
          if (area) areaSet.add(area)
        }
      }

      if (areaSet.size >= 10) break // 충분하면 조기 종료
    }

    const areas = Array.from(areaSet)
      .map(m2 => {
        const num = parseFloat(m2)
        const py = Math.round(num / 3.3058)
        return { m2, py: String(py), label: `${m2}㎡ (약 ${py}평)` }
      })
      .sort((a, b) => parseFloat(a.m2) - parseFloat(b.m2))

    return NextResponse.json({ areas })
  } catch (err) {
    return NextResponse.json({ areas: [], error: "평형 정보 조회 중 오류가 발생했습니다" })
  }
}
