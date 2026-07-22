import { parseStringPromise } from "xml2js"
import { format, subMonths } from "date-fns"

const KOSIS_BASE  = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"
const VILLA_BASE  = "https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade"
const BLDG_BASE   = "https://apis.data.go.kr/1613000/BldRgstHubService"
const GATE_URL    = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"
const FETCH_OPTS  = { headers: { "User-Agent": "Mozilla/5.0 (compatible; oreulji/1.0)" } }

export async function fetchApartmentMeta(aptName: string, lawdCd: string) {
  try {
    const url = new URL(`${GATE_URL}/apt/lookup`)
    url.searchParams.set("apt_nm", aptName)
    url.searchParams.set("sigungu_cd", lawdCd)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      buildYear:  typeof data?.build_year  === "number" ? data.build_year  : null,
      aptId:      typeof data?.apt_id      === "number" ? data.apt_id      : null,
      households: typeof data?.kapt_ho_cnt === "number" ? data.kapt_ho_cnt : null,
      sigunguNm:  typeof data?.sigungu_nm  === "string" ? data.sigungu_nm  : null,
      umdNm:      typeof data?.umd_nm      === "string" ? data.umd_nm      : null,
      lat:        typeof data?.lat         === "number" ? data.lat         : null,
      lon:        typeof data?.lon         === "number" ? data.lon         : null,
      isPresale:  Boolean(data?.is_presale),
    }
  } catch {
    return null
  }
}

function normalizeAptTradeName(name: string) {
  return String(name)
    .replace(/\s+/g, "")
    .replace(/아파트|APT|apt/gi, "")
    .replace(/[·.\-_/()]/g, "")
    .replace(/단지$/g, "")
    .toLowerCase()
}

function normalizeUmdName(name: string) {
  return String(name).replace(/\s+/g, "").toLowerCase()
}

export async function fetchTrades(lawdCd: string, aptName: string, monthsBack = 24, dongFilter?: string, umdFilter?: string) {
  const raw = process.env.KOSIS_API_KEY || ""
  if (!raw || !lawdCd || !aptName) return { trades: [], stats: null, priceHistory: [], tradesByArea: {} }
  const key = raw.includes("%") ? decodeURIComponent(raw) : raw

  const dongNum = dongFilter ? dongFilter.replace(/[^0-9]/g, "") : ""
  const target  = normalizeAptTradeName(aptName)
  const targetUmd = umdFilter ? normalizeUmdName(umdFilter) : ""
  const exactRecords: { price: number; area: number; floor: string; dealDate: string }[] = []
  const looseRecords: { price: number; area: number; floor: string; dealDate: string }[] = []

  for (let i = 0; i < monthsBack; i++) {
    const yyyymm = format(subMonths(new Date(), i), "yyyyMM")
    const url    = new URL(KOSIS_BASE)
    url.searchParams.set("serviceKey", key)
    url.searchParams.set("LAWD_CD",    lawdCd)
    url.searchParams.set("DEAL_YMD",   yyyymm)
    url.searchParams.set("numOfRows",  "1000")
    url.searchParams.set("pageNo",     "1")

    try {
      const res = await fetch(url.toString(), {
        signal:  AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; oreulji/1.0)" },
      })
      if (!res.ok) continue
      const xml    = await res.text()
      const parsed = await parseStringPromise(xml, { explicitArray: false })
      const items  = parsed?.response?.body?.items?.item
      if (!items) continue
      const list   = Array.isArray(items) ? items : [items]

      for (const it of list) {
        const name = normalizeAptTradeName(it["아파트"] || it["aptNm"] || "")
        if (!name) continue

        const isExactNameMatch = name === target
        const isLooseNameMatch = name.includes(target) || target.includes(name)
        if (!isExactNameMatch && !isLooseNameMatch) continue

        if (dongNum) {
          const itDong = String(it["aptDong"] || "").replace(/[^0-9]/g, "")
          if (itDong !== dongNum) continue
        }

        if (targetUmd) {
          const itemUmd = normalizeUmdName(it["법정동"] || it["umdNm"] || "")
          if (itemUmd && itemUmd !== targetUmd) continue
        }

        const price    = parseInt(String(it["거래금액"] || it["dealAmount"] || "0").replace(/,/g, "")) || 0
        const area     = parseFloat(String(it["전용면적"] || it["excluUseAr"] || "0")) || 0
        const floor    = String(it["층"] || it["floor"] || "")
        const year     = String(it["년"] || it["dealYear"] || "")
        const month    = String(it["월"] || it["dealMonth"] || "").padStart(2, "0")
        const dealDate = year && month ? `${year}-${month}` : ""
        if (price <= 0) continue

        const record = { price, area, floor, dealDate }
        if (isExactNameMatch) {
          exactRecords.push(record)
        } else {
          looseRecords.push(record)
        }
      }
    } catch { /* per-month 오류 무시 */ }
  }

  const records = exactRecords.length > 0 ? exactRecords : looseRecords
  if (records.length === 0) return { trades: [], stats: null, priceHistory: [], tradesByArea: {} }

  const sorted = [...records].sort((a, b) => b.dealDate.localeCompare(a.dealDate))
  const prices = records.map(r => r.price)
  const avg    = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

  // 평형별 그룹 (5단위 반올림)
  const byArea: Record<string, { price: number; dealDate: string }[]> = {}
  for (const r of records) {
    const areaKey = String(Math.round(r.area / 5) * 5)
    if (!byArea[areaKey]) byArea[areaKey] = []
    byArea[areaKey].push({ price: r.price, dealDate: r.dealDate })
  }
  const tradesByArea: Record<string, { avg: number; min: number; max: number; count: number; latest: number; latestDate: string }> = {}
  for (const [areaKey, rs] of Object.entries(byArea)) {
    const ps = rs.map(r => r.price)
    const s  = [...rs].sort((a, b) => b.dealDate.localeCompare(a.dealDate))
    tradesByArea[areaKey] = {
      avg:        Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
      min:        Math.min(...ps),
      max:        Math.max(...ps),
      count:      ps.length,
      latest:     s[0]?.price ?? 0,
      latestDate: s[0]?.dealDate ?? "",
    }
  }

  // 월별 평균가 (차트용, 최근 12개월)
  const byMonth: Record<string, number[]> = {}
  for (const r of records) {
    if (!r.dealDate) continue
    if (!byMonth[r.dealDate]) byMonth[r.dealDate] = []
    byMonth[r.dealDate].push(r.price)
  }
  const priceHistory = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([yyyymm, ps]) => ({
      yyyymm,
      avg: Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
    }))

  const recentTwo = sorted.slice(0, 2).map(r => ({
    ...r,
    label: `${r.dealDate} · ${Math.round(r.area)}㎡ ${r.floor}층 · ${(r.price / 10000).toFixed(1)}억`,
  }))

  return {
    trades: recentTwo,
    stats: {
      avg,
      min:        Math.min(...prices),
      max:        Math.max(...prices),
      count:      prices.length,
      latest:     sorted[0]?.price ?? 0,
      latestDate: sorted[0]?.dealDate ?? "",
    },
    priceHistory,
    tradesByArea,
  }
}

type RegistryAreaResult = {
  area: number
  areas?: number[]           // 집합건물: 호실별 전용면적 목록
  floorAreas?: { floor: number; area: number }[]  // 일반건축물: 층별 면적
  name: string
  buildYear: number | null
  purpose: string            // 주용도 (단독주택, 다세대주택, 연립주택 등)
  isMultiUnit: boolean       // 집합건물(연립·다세대) 여부
}

// ─── 건축물대장 전유공용면적 조회 (1차: 거래 이력 없어도 조회 가능) ──
async function lookupAreaFromRegistry(
  lawdCd:   string,
  bjdongCd: string,   // 법정동코드 5자리 (b_code[5:10])
  jibun:    string,
): Promise<RegistryAreaResult | null> {
  const raw = process.env.VILLA_API_KEY || ""
  if (!raw || !lawdCd || !bjdongCd || !jibun) return null
  const key = raw.includes("%") ? decodeURIComponent(raw) : raw

  const sigunguCd = lawdCd.slice(0, 5)
  const parts     = jibun.replace(/\s+/g, "").split("-")
  const bun       = String(parseInt(parts[0] || "0")).padStart(4, "0")
  const ji        = String(parseInt(parts[1] || "0")).padStart(4, "0")

  type BldgItem = Record<string, unknown>

  function bldgUrl(endpoint: string) {
    const u = new URL(`${BLDG_BASE}/${endpoint}`)
    u.searchParams.set("serviceKey", key)
    u.searchParams.set("sigunguCd",  sigunguCd)
    u.searchParams.set("bjdongCd",   bjdongCd)
    u.searchParams.set("bun",        bun)
    u.searchParams.set("ji",         ji)
    u.searchParams.set("numOfRows",  "100")
    u.searchParams.set("pageNo",     "1")
    u.searchParams.set("_type",      "json")
    return u.toString()
  }

  try {
    // ① 집합건물: 전유공용면적 조회
    const expRes  = await fetch(bldgUrl("getBrExposPubuseAreaInfo"), { signal: AbortSignal.timeout(8000), ...FETCH_OPTS })
    const expData = expRes.ok ? await expRes.json() : null
    const expItems = expData?.response?.body?.items?.item
    if (expItems) {
      const list = Array.isArray(expItems) ? expItems : [expItems]
      const exclusiveAreas: number[] = list
        .filter((it: BldgItem) =>
          String(it.exposPubuseGbCd) === "1" && parseFloat(String(it.area || "0")) > 0
        )
        .map((it: BldgItem) => Math.round(parseFloat(String(it.area)) * 10) / 10)

      if (exclusiveAreas.length > 0) {
        const sorted = [...exclusiveAreas].sort((a, b) => a - b)
        return {
          area:        sorted[Math.floor(sorted.length / 2)],
          areas:       [...new Set(sorted)],
          name:        "",
          buildYear:   null,
          purpose:     "다세대주택",
          isMultiUnit: true,
        }
      }
    }

    // ② 일반건축물: 표제부 + 층별개요 조회
    const [titleRes, flrRes] = await Promise.all([
      fetch(bldgUrl("getBrTitleInfo"),    { signal: AbortSignal.timeout(8000), ...FETCH_OPTS }),
      fetch(bldgUrl("getBrFlrOulnInfo"),  { signal: AbortSignal.timeout(8000), ...FETCH_OPTS }),
    ])
    const titleData = titleRes.ok ? await titleRes.json() : null
    const flrData   = flrRes.ok  ? await flrRes.json()   : null

    const titleItem = (() => {
      const raw = titleData?.response?.body?.items?.item
      if (!raw) return null
      return Array.isArray(raw) ? raw[0] : raw
    })() as BldgItem | null

    if (!titleItem) return null

    const totArea   = parseFloat(String(titleItem.totArea   || "0")) || 0
    const archArea  = parseFloat(String(titleItem.archArea  || "0")) || 0
    const purpose   = String(titleItem.mainPurpsCdNm || "")
    const buildYear = parseInt(String(titleItem.useAprDay || "0").slice(0, 4)) || null
    const bldNm     = String(titleItem.bldNm || "")

    // 층별 면적
    const floorAreas: { floor: number; area: number }[] = []
    const flrRaw = flrData?.response?.body?.items?.item
    if (flrRaw) {
      const flrList = Array.isArray(flrRaw) ? flrRaw : [flrRaw]
      for (const it of flrList as BldgItem[]) {
        const flrNo = parseInt(String(it.flrNo || "0")) || 0
        const area  = parseFloat(String(it.area || "0")) || 0
        if (area > 0) floorAreas.push({ floor: flrNo, area })
      }
      floorAreas.sort((a, b) => a.floor - b.floor)
    }

    // 대표 면적: 가장 큰 층 면적 (없으면 archArea)
    const primaryArea = floorAreas.length > 0
      ? Math.max(...floorAreas.map(f => f.area))
      : archArea || totArea

    if (primaryArea <= 0) return null

    return {
      area:        primaryArea,
      floorAreas:  floorAreas.length > 0 ? floorAreas : undefined,
      name:        bldNm,
      buildYear,
      purpose,
      isMultiUnit: false,
    }
  } catch {
    return null
  }
}

// ─── 다세대 주소 → 면적 자동 조회 ────────────────────────────────
// 1차: 건축물대장 전유공용면적 API (거래 이력 무관)
// 2차: MOLIT 실거래 데이터에서 지번 매칭
export async function lookupVillaArea(
  lawdCd:   string,
  bjdongCd: string,   // 법정동코드 5자리 (b_code[5:10])
  jibun:    string,   // 예: "454-22"
): Promise<RegistryAreaResult | null> {
  // 1차: 건축물대장
  const fromRegistry = await lookupAreaFromRegistry(lawdCd, bjdongCd, jibun)
  if (fromRegistry) return fromRegistry

  // 2차: 실거래 데이터 (최근 36개월)
  const raw = process.env.VILLA_API_KEY || ""
  if (!raw || !lawdCd || !jibun) return null
  const key = raw.includes("%") ? decodeURIComponent(raw) : raw

  const jibunNorm = jibun.replace(/\s+/g, "")

  for (let i = 0; i < 36; i++) {
    const yyyymm = format(subMonths(new Date(), i), "yyyyMM")
    const url = new URL(VILLA_BASE)
    url.searchParams.set("serviceKey", key)
    url.searchParams.set("LAWD_CD",    lawdCd)
    url.searchParams.set("DEAL_YMD",   yyyymm)
    url.searchParams.set("numOfRows",  "1000")
    url.searchParams.set("pageNo",     "1")

    try {
      const res    = await fetch(url.toString(), { signal: AbortSignal.timeout(8000), ...FETCH_OPTS })
      if (!res.ok) continue
      const xml    = await res.text()
      const parsed = await parseStringPromise(xml, { explicitArray: false })
      const items  = parsed?.response?.body?.items?.item
      if (!items) continue
      const list   = Array.isArray(items) ? items : [items]

      for (const it of list) {
        const itJibun = String(it["jibun"] || "").replace(/\s+/g, "")
        if (itJibun !== jibunNorm) continue

        const area      = parseFloat(String(it["excluUseAr"] || "0")) || 0
        const name      = String(it["mhouseNm"] || "")
        const buildYear = parseInt(String(it["buildYear"] || "0")) || null
        if (area > 0) return { area, name, buildYear, purpose: "연립다세대", isMultiUnit: true }
      }
    } catch { continue }
  }
  return null
}

// ─── 연립·다세대 실거래 (인근 비슷한 평형 비교) ──────────────────
export async function fetchVillaTrades(
  lawdCd:    string,
  umdNm:     string,   // 동 이름 (예: "신장동")
  areaM2:    number | null,  // 전용면적(㎡) — null이면 전체 수집
  monthsBack = 12,
) {
  const raw = process.env.VILLA_API_KEY || ""
  if (!raw || !lawdCd) return { trades: [], stats: null, priceHistory: [], tradesByArea: {}, nearbyCount: 0 }
  const key = raw.includes("%") ? decodeURIComponent(raw) : raw

  const records: { price: number; area: number; floor: string; dealDate: string; name: string; jibun: string }[] = []

  for (let i = 0; i < monthsBack; i++) {
    const yyyymm = format(subMonths(new Date(), i), "yyyyMM")
    const url = new URL(VILLA_BASE)
    url.searchParams.set("serviceKey", key)
    url.searchParams.set("LAWD_CD",    lawdCd)
    url.searchParams.set("DEAL_YMD",   yyyymm)
    url.searchParams.set("numOfRows",  "1000")
    url.searchParams.set("pageNo",     "1")

    try {
      const res    = await fetch(url.toString(), { signal: AbortSignal.timeout(8000), ...FETCH_OPTS })
      if (!res.ok) continue
      const xml    = await res.text()
      const parsed = await parseStringPromise(xml, { explicitArray: false })
      const items  = parsed?.response?.body?.items?.item
      if (!items) continue
      const list   = Array.isArray(items) ? items : [items]

      for (const it of list) {
        const dongNm = String(it["umdNm"] || "")
        if (umdNm && dongNm !== umdNm) continue  // 같은 동만

        const area  = parseFloat(String(it["excluUseAr"] || "0")) || 0
        // 면적 필터: ±10㎡ 이내
        if (areaM2 !== null && Math.abs(area - areaM2) > 10) continue

        const price    = parseInt(String(it["dealAmount"] || "0").replace(/,/g, "")) || 0
        const floor    = String(it["floor"] || "")
        const year     = String(it["dealYear"] || "")
        const month    = String(it["dealMonth"] || "").padStart(2, "0")
        const dealDate = year && month ? `${year}-${month}` : ""
        const name     = String(it["mhouseNm"] || it["houseType"] || "")
        const jibun    = String(it["jibun"] || "")
        if (price > 0) records.push({ price, area, floor, dealDate, name, jibun })
      }
    } catch { /* per-month 오류 무시 */ }
  }

  if (records.length === 0) return { trades: [], stats: null, priceHistory: [], tradesByArea: {}, nearbyCount: 0 }

  const sorted = [...records].sort((a, b) => b.dealDate.localeCompare(a.dealDate))
  const prices = records.map(r => r.price)
  const avg    = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

  // 평형별 그룹
  const byArea: Record<string, { price: number; dealDate: string }[]> = {}
  for (const r of records) {
    const areaKey = String(Math.round(r.area / 5) * 5)
    if (!byArea[areaKey]) byArea[areaKey] = []
    byArea[areaKey].push({ price: r.price, dealDate: r.dealDate })
  }
  const tradesByArea: Record<string, { avg: number; min: number; max: number; count: number; latest: number; latestDate: string }> = {}
  for (const [areaKey, rs] of Object.entries(byArea)) {
    const ps = rs.map(r => r.price)
    const s  = [...rs].sort((a, b) => b.dealDate.localeCompare(a.dealDate))
    tradesByArea[areaKey] = {
      avg:        Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
      min:        Math.min(...ps),
      max:        Math.max(...ps),
      count:      ps.length,
      latest:     s[0]?.price ?? 0,
      latestDate: s[0]?.dealDate ?? "",
    }
  }

  // 월별 평균가
  const byMonth: Record<string, number[]> = {}
  for (const r of records) {
    if (!r.dealDate) continue
    if (!byMonth[r.dealDate]) byMonth[r.dealDate] = []
    byMonth[r.dealDate].push(r.price)
  }
  const priceHistory = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([yyyymm, ps]) => ({
      yyyymm,
      avg: Math.round(ps.reduce((a, b) => a + b, 0) / ps.length),
    }))

  const recentFive = sorted.slice(0, 5).map(r => ({
    ...r,
    label: `${r.dealDate} · ${r.name} · ${Math.round(r.area)}㎡ ${r.floor}층 · ${(r.price / 10000).toFixed(1)}억`,
  }))

  return {
    trades: recentFive,
    stats: {
      avg,
      min:        Math.min(...prices),
      max:        Math.max(...prices),
      count:      prices.length,
      latest:     sorted[0]?.price ?? 0,
      latestDate: sorted[0]?.dealDate ?? "",
    },
    priceHistory,
    tradesByArea,
    nearbyCount: records.length,
  }
}
