// ============================================================
// 신규 분양 알림 서비스
// 데이터 소스:
//   1순위: 청약홈 API (data.go.kr — 아파트 분양정보 조회)
//   2순위: 네이버 뉴스 + Claude 분석
//   폴백:  더미 데이터
// ============================================================

import fs from "fs"
import path from "path"
import {
  InterestNeighborhood,
  PresaleItem,
  PresaleCheckResult,
  SupplyUnit,
} from "./types"
import { generateJsonWithAI } from "./claude"
import { prisma } from "./prisma"

const DATA_DIR = path.join(process.cwd(), "data")
const HOOD_FILE = path.join(DATA_DIR, "neighborhoods.json")
const PRESALE_FILE = path.join(DATA_DIR, "presales.json")

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ─── 관심 동네 CRUD ───────────────────────────────────────────

export function loadNeighborhoods(): InterestNeighborhood[] {
  ensureDir()
  if (!fs.existsSync(HOOD_FILE)) return []
  try { return JSON.parse(fs.readFileSync(HOOD_FILE, "utf-8")) } catch { return [] }
}

export function saveNeighborhoods(hoods: InterestNeighborhood[]) {
  ensureDir()
  const tmp = HOOD_FILE + ".tmp"
  fs.writeFileSync(tmp, JSON.stringify(hoods, null, 2), "utf-8")
  fs.renameSync(tmp, HOOD_FILE)
}

export function addNeighborhood(
  hood: Omit<InterestNeighborhood, "id" | "visitCount" | "addedAt">
): InterestNeighborhood {
  const hoods = loadNeighborhoods()
  // 중복 체크 (bjdCode 기준)
  const exists = hoods.find(h => h.bjdCode === hood.bjdCode)
  if (exists) {
    // 찜 상태나 소스만 업데이트
    exists.isFavorited = exists.isFavorited || hood.isFavorited
    if (hood.sources[0] && !exists.sources.includes(hood.sources[0])) {
      exists.sources.push(hood.sources[0])
    }
    saveNeighborhoods(hoods)
    return exists
  }
  const newHood: InterestNeighborhood = {
    ...hood,
    id: crypto.randomUUID(),
    visitCount: 0,
    addedAt: new Date().toISOString(),
  }
  hoods.push(newHood)
  saveNeighborhoods(hoods)
  return newHood
}

export function updateNeighborhood(id: string, patch: Partial<InterestNeighborhood>) {
  const hoods = loadNeighborhoods()
  const idx = hoods.findIndex(h => h.id === id)
  if (idx < 0) return null
  hoods[idx] = { ...hoods[idx], ...patch }
  saveNeighborhoods(hoods)
  return hoods[idx]
}

export function deleteNeighborhood(id: string): boolean {
  const hoods = loadNeighborhoods()
  const next = hoods.filter(h => h.id !== id)
  if (next.length === hoods.length) return false
  saveNeighborhoods(next)
  return true
}

// 방문 카운트 증가 (대시보드에서 해당 지역 분석 조회할 때 호출)
export function incrementVisit(bjdCode: string) {
  const hoods = loadNeighborhoods()
  const idx = hoods.findIndex(h => h.bjdCode === bjdCode)
  if (idx < 0) return
  hoods[idx].visitCount += 1
  hoods[idx].lastVisitedAt = new Date().toISOString()
  saveNeighborhoods(hoods)
}

// 즐겨찾기 아파트 주소에서 동네 자동 추출·등록
export async function syncFromFavorites() {
  try {
    const favs = await prisma.favorite.findMany({ select: { address: true, lawdCd: true } })
    for (const fav of favs) {
      if (!fav.address) continue
      const parts = fav.address.split(" ")
      // "인천광역시 서구 감단로 834" → sido: 인천광역시, sigungu: 서구
      if (parts.length >= 2) {
        addNeighborhood({
          name: `${parts[0]} ${parts[1]}`,
          sido: parts[0],
          sigungu: parts[1],
          bjdCode: fav.lawdCd,
          isFavorited: false,
          sources: ["즐겨찾기 자동추출"],
        })
      }
    }
  } catch (e) {
    console.warn("[syncFromFavorites] prisma query failed (likely no DB in dev):", e)
  }
}

// ─── 분양 정보 CRUD ───────────────────────────────────────────

export function loadPresales(): PresaleItem[] {
  ensureDir()
  if (!fs.existsSync(PRESALE_FILE)) return []
  try {
    const all = JSON.parse(fs.readFileSync(PRESALE_FILE, "utf-8")) as PresaleItem[]
    return all.slice(-300)
  } catch { return [] }
}

export function savePresales(items: PresaleItem[]) {
  ensureDir()
  const tmp = PRESALE_FILE + ".tmp"
  fs.writeFileSync(tmp, JSON.stringify(items.slice(-300), null, 2), "utf-8")
  fs.renameSync(tmp, PRESALE_FILE)
}

export function markPresalesRead(ids: string[]) {
  const items = loadPresales()
  savePresales(items.map(p => ids.includes(p.id) ? { ...p, isRead: true } : p))
}

// ─── 청약홈 API 호출 ─────────────────────────────────────────
// data.go.kr — "아파트분양정보 서비스" (LH청약센터 포함)

interface KaptRaw {
  KAPT_NM?: string        // 아파트명
  BJDONG_NM?: string      // 법정동명
  SIDO_NM?: string
  SIGUNGU_NM?: string
  TOT_DONG_CNT?: string   // 총 동수
  HSHLD_CNT?: string      // 세대수
  CMPLX_SIZE_NM?: string  // 단지규모
  BLDS_MTHD_NM?: string   // 공사방법
  CNSTRCT_ENTRPS_NM?: string // 시공사
  // 청약 일정 (청약홈 API)
  RCRIT_PBLANC_DE?: string    // 모집공고일
  SUBSCRPT_AREA_CODE_NM?: string
  HOUSE_SECD_NM?: string      // 주택구분
  RCRIT_PBLANC_DE2?: string
}

async function fetchFromCheongYakHom(
  sido: string,
  sigungu: string
): Promise<PresaleItem[]> {
  const key = process.env.CHEONGAK_API_KEY
  if (!key) return []

  // 청약홈 신규분양 공고 API
  const url = new URL("https://apis.data.go.kr/B552555/APTLttotPblancDetail/getLttotPblancSdInfo")
  url.searchParams.set("serviceKey", decodeURIComponent(key))
  url.searchParams.set("sidoNm", sido)
  url.searchParams.set("numOfRows", "20")
  url.searchParams.set("pageNo", "1")

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const text = await res.text()
    return parseCheongYakXml(text, sigungu)
  } catch {
    return []
  }
}

function parseCheongYakXml(xml: string, sigunguFilter: string): PresaleItem[] {
  const items: PresaleItem[] = []
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  const get = (block: string, tag: string) =>
    block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? ""

  for (const m of matches) {
    const b = m[1]
    const sigungu = get(b, "SIGUNGU_NM")
    if (sigunguFilter && !sigungu.includes(sigunguFilter) && !sigunguFilter.includes(sigungu)) continue

    const aptName = get(b, "HOUSE_NM") || get(b, "KAPT_NM") || "분양 아파트"
    const announceDate = get(b, "RCRIT_PBLANC_DE") || get(b, "PBLANC_DE") || ""
    const subStart = get(b, "SUBSCPT_AREA_CODE_NM") || ""
    const spe = get(b, "SPSPLY_RCEPT_BGNDE") || ""
    const f1 = get(b, "GNRL_RNK1_CRSPAREA_RCPT_BGNDE") || ""
    const moveIn = get(b, "MVN_PREARNGE_YM") || ""
    const totalStr = get(b, "TOT_SUPLY_HSHLDCO") || "0"

    // 분양가 파싱
    const minPriceStr = get(b, "LLY_LTTOT_TOP_AMOUNT") || "0"
    const maxPriceStr = get(b, "LTTOT_TOP_AMOUNT") || minPriceStr

    const supply: SupplyUnit[] = []
    const typeStr = get(b, "HOUSE_TY")
    if (typeStr) {
      typeStr.split(",").forEach(t => {
        const trimmed = t.trim()
        const areaMatch = trimmed.match(/(\d+(?:\.\d+)?)/)
        if (areaMatch) {
          supply.push({ type: trimmed, area: parseFloat(areaMatch[1]), count: 0 })
        }
      })
    }

    items.push({
      id: crypto.randomUUID(),
      aptName,
      address: `${get(b, "SIDO_NM")} ${sigungu} ${get(b, "BJDONG_NM")}`,
      sido: get(b, "SIDO_NM"),
      sigungu,
      totalUnits: parseInt(totalStr) || 0,
      supply,
      announcementDate: formatApiDate(announceDate),
      subscribeStartDate: formatApiDate(spe || f1),
      subscribeEndDate: formatApiDate(get(b, "GNRL_RNK1_CRSPAREA_RCPT_ENDDE") || ""),
      moveInDate: moveIn,
      constructionCompany: get(b, "BSNS_MBY_NM") || "",
      salesCompany: get(b, "CNSTLTN_ENTRPS_NM") || "",
      minPrice: parseInt(minPriceStr.replace(/,/g, "")) || 0,
      maxPrice: parseInt(maxPriceStr.replace(/,/g, "")) || 0,
      specialSupplyDate: formatApiDate(spe),
      firstPriorityDate: formatApiDate(f1),
      source: "청약홈",
      sourceUrl: "https://www.applyhome.co.kr",
      isRead: false,
      matchedNeighborhoods: [],
      createdAt: new Date().toISOString(),
    })
  }
  return items
}

function formatApiDate(raw: string): string {
  if (!raw) return ""
  // "20260315" → "2026-03-15"
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
  return raw
}

// ─── 네이버 뉴스 + Claude 분석 fallback ──────────────────────

async function fetchFromNaverNews(neighborhood: InterestNeighborhood): Promise<PresaleItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return []

  const query = encodeURIComponent(`${neighborhood.sigungu} 신규 분양 아파트 청약 2026`)
  const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=10&sort=date`

  try {
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret },
    })
    const json = await res.json()
    if (!json.items?.length) return []

    // Claude로 뉴스에서 분양 정보 추출
    return await extractPresaleFromNews(json.items, neighborhood)
  } catch {
    return []
  }
}

interface NaverNewsItem {
  title: string
  description: string
  pubDate: string
  link: string
}

async function extractPresaleFromNews(
  newsItems: NaverNewsItem[],
  neighborhood: InterestNeighborhood
): Promise<PresaleItem[]> {
  const newsText = newsItems
    .map(n => `제목: ${n.title.replace(/<[^>]*>/g, "")}\n내용: ${n.description.replace(/<[^>]*>/g, "")}`)
    .join("\n\n")

  const prompt = `다음 뉴스에서 ${neighborhood.sido} ${neighborhood.sigungu} 지역의 신규 아파트 분양/청약 정보를 추출해주세요.
  
뉴스 목록:
${newsText}

JSON 배열로만 응답하세요. 분양 정보가 없으면 빈 배열 []을 반환하세요.
각 항목 형식:
{
  "aptName": "아파트명",
  "address": "주소",
  "totalUnits": 세대수(숫자),
  "announcementDate": "YYYY-MM-DD",
  "subscribeStartDate": "YYYY-MM-DD",
  "subscribeEndDate": "YYYY-MM-DD", 
  "moveInDate": "YYYY-MM",
  "constructionCompany": "시공사",
  "minPrice": 최저분양가만원(숫자),
  "maxPrice": 최고분양가만원(숫자),
  "supply": [{"type": "59A", "area": 59.99, "count": 100}],
  "sourceUrl": "뉴스URL"
}`

  try {
    const text = await generateJsonWithAI(prompt)
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed: Partial<PresaleItem>[] = JSON.parse(clean)

    return parsed.map(p => ({
      id: crypto.randomUUID(),
      aptName: p.aptName ?? "미확인 분양",
      address: p.address ?? `${neighborhood.sido} ${neighborhood.sigungu}`,
      sido: neighborhood.sido,
      sigungu: neighborhood.sigungu,
      totalUnits: p.totalUnits ?? 0,
      supply: p.supply ?? [],
      announcementDate: p.announcementDate ?? "",
      subscribeStartDate: p.subscribeStartDate ?? "",
      subscribeEndDate: p.subscribeEndDate ?? "",
      moveInDate: p.moveInDate ?? "",
      constructionCompany: p.constructionCompany ?? "",
      minPrice: p.minPrice ?? 0,
      maxPrice: p.maxPrice ?? 0,
      source: "뉴스" as const,
      sourceUrl: p.sourceUrl ?? "",
      isRead: false,
      matchedNeighborhoods: [],
      createdAt: new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

// ─── 전체 체크 ────────────────────────────────────────────────

// 관심 동네 없을 때 기본 체크 지역
const DEFAULT_CHECK_TARGETS: InterestNeighborhood[] = [
  { id: "default-1", name: "서울 강남구",  sido: "서울특별시",  sigungu: "강남구",  bjdCode: "11680", isFavorited: false, visitCount: 0, addedAt: "", sources: [] },
  { id: "default-2", name: "서울 서초구",  sido: "서울특별시",  sigungu: "서초구",  bjdCode: "11650", isFavorited: false, visitCount: 0, addedAt: "", sources: [] },
  { id: "default-3", name: "서울 마포구",  sido: "서울특별시",  sigungu: "마포구",  bjdCode: "11440", isFavorited: false, visitCount: 0, addedAt: "", sources: [] },
  { id: "default-4", name: "경기 성남시",  sido: "경기도",      sigungu: "성남시",  bjdCode: "41131", isFavorited: false, visitCount: 0, addedAt: "", sources: [] },
  { id: "default-5", name: "경기 화성시",  sido: "경기도",      sigungu: "화성시",  bjdCode: "41590", isFavorited: false, visitCount: 0, addedAt: "", sources: [] },
  { id: "default-6", name: "인천 서구",    sido: "인천광역시",  sigungu: "서구",    bjdCode: "28260", isFavorited: false, visitCount: 0, addedAt: "", sources: [] },
]

export async function checkPresales(): Promise<PresaleCheckResult> {
  // 즐겨찾기에서 동네 자동 동기화
  await syncFromFavorites()

  const hoods = loadNeighborhoods()
  // 찜하거나 2번 이상 방문한 동네만 체크, 없으면 기본 지역으로 fallback
  let targets = hoods.filter(h => h.isFavorited || h.visitCount >= 2)
  if (targets.length === 0) targets = DEFAULT_CHECK_TARGETS

  const existing = loadPresales()
  const existingKeys = new Set(
    existing.map(p => `${p.aptName}-${p.announcementDate}`)
  )

  const newItems: PresaleItem[] = []

  for (const hood of targets) {
    // 1순위: 청약홈 API
    let fetched = await fetchFromCheongYakHom(hood.sido, hood.sigungu)

    // 2순위: 네이버 뉴스 + Claude
    if (!fetched.length) {
      fetched = await fetchFromNaverNews(hood)
    }

    // 3순위: 더미 (개발용)
    if (!fetched.length) {
      fetched = getMockPresales(hood.sido, hood.sigungu)
    }

    for (const item of fetched) {
      const key = `${item.aptName}-${item.announcementDate}`
      if (existingKeys.has(key)) continue
      item.matchedNeighborhoods = [hood.id]
      newItems.push(item)
      existingKeys.add(key)
    }
  }

  if (newItems.length > 0) {
    savePresales([...existing, ...newItems])
  }

  return {
    checked: targets.length,
    newItems: newItems.length,
    items: newItems,
    checkedAt: new Date().toISOString(),
  }
}

// ─── 더미 데이터 ──────────────────────────────────────────────

function getMockPresales(sido: string, sigungu: string): PresaleItem[] {
  return [
    {
      id: crypto.randomUUID(),
      aptName: `${sigungu} e편한세상 더퍼스트`,
      address: `${sido} ${sigungu} 일원`,
      sido, sigungu,
      totalUnits: 1042,
      supply: [
        { type: "59A", area: 59.99, count: 320, price: 35000 },
        { type: "59B", area: 59.42, count: 280, price: 34500 },
        { type: "84A", area: 84.96, count: 310, price: 44000 },
        { type: "84B", area: 84.62, count: 132, price: 43500 },
      ],
      announcementDate: "2026-04-10",
      subscribeStartDate: "2026-04-25",
      subscribeEndDate: "2026-04-27",
      moveInDate: "2028-12",
      constructionCompany: "대림산업",
      salesCompany: "DL이앤씨",
      minPrice: 34500,
      maxPrice: 44000,
      specialSupplyDate: "2026-04-22",
      firstPriorityDate: "2026-04-25",
      source: "mock",
      sourceUrl: "https://www.applyhome.co.kr",
      isRead: false,
      matchedNeighborhoods: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      aptName: `${sigungu} SK뷰`,
      address: `${sido} ${sigungu} 일원`,
      sido, sigungu,
      totalUnits: 856,
      supply: [
        { type: "59A", area: 59.99, count: 400, price: 32000 },
        { type: "84A", area: 84.96, count: 456, price: 41000 },
      ],
      announcementDate: "2026-05-15",
      subscribeStartDate: "2026-05-28",
      subscribeEndDate: "2026-05-30",
      moveInDate: "2029-06",
      constructionCompany: "SK에코플랜트",
      salesCompany: "SK에코플랜트",
      minPrice: 32000,
      maxPrice: 41000,
      specialSupplyDate: "2026-05-25",
      firstPriorityDate: "2026-05-28",
      source: "mock",
      sourceUrl: "https://www.applyhome.co.kr",
      isRead: false,
      matchedNeighborhoods: [],
      createdAt: new Date().toISOString(),
    },
  ]
}

// ─── 분양가 포매터 ────────────────────────────────────────────
export function formatPresalePrice(min: number, max: number): string {
  const f = (n: number) => {
    if (n >= 10000) {
      const 억 = Math.floor(n / 10000)
      const 천 = Math.round((n % 10000) / 1000)
      return 천 ? `${억}억${천}천` : `${억}억`
    }
    return `${Math.round(n / 1000)}천만`
  }
  if (!min && !max) return "미정"
  if (min === max || !max) return f(min)
  return `${f(min)}~${f(max)}`
}

// D-Day 계산
export function dday(dateStr: string): string {
  if (!dateStr) return ""
  const target = new Date(dateStr)
  const now = new Date()
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "D-Day"
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}
