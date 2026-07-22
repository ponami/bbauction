// lib/alerts.ts — 실거래가 & 점수 변동 알림 서비스 (DB 기반)
// 국토부 실거래가 API + 오를지 점수 변동 감지 → 웹푸시 발송

import { prisma } from "./prisma"
import { sendPushToUser } from "./webpush"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "http://localhost:8001"

function buildDashboardUrl(aptName: string, lawdCd: string, address?: string) {
  const params = new URLSearchParams({
    apt: aptName,
    lawdCd,
  })
  if (address) params.set("address", address)
  return `/dashboard?${params.toString()}`
}

// ────────────────────────────────────────────
// 국토부 실거래가 API
// ────────────────────────────────────────────

interface RawDeal {
  아파트: string
  전용면적: string
  층: string
  거래금액: string
  년: string
  월: string
  일: string
  법정동: string
  전월세구분?: string
  보증금액?: string
  월세금액?: string
}

const fetchDealsCache = new Map<string, Promise<RawDeal[]>>()

async function fetchDeals(
  lawdCd: string,
  yearMonth: string,
  dealType: "매매" | "전세" | "월세",
): Promise<RawDeal[]> {
  const cacheKey = `${lawdCd}-${yearMonth}-${dealType}`
  const cached = fetchDealsCache.get(cacheKey)
  if (cached) return cached

  const promise = (async () => {
    const key = dealType === "매매" ? process.env.KOSIS_API_KEY : process.env.JEONSE_API_KEY
    if (!key) return []

    const serviceUrl = dealType === "매매"
      ? "getRTMSDataSvcAptTrade"
      : "getRTMSDataSvcAptRent"

    const url = new URL(`https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/${serviceUrl}`)
    url.searchParams.set("serviceKey", decodeURIComponent(key))
    url.searchParams.set("LAWD_CD", lawdCd)
    url.searchParams.set("DEAL_YMD", yearMonth)
    url.searchParams.set("numOfRows", "100")
    url.searchParams.set("pageNo", "1")

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
      const text = await res.text()
      const items: RawDeal[] = []
      const matches = text.matchAll(/<item>([\s\S]*?)<\/item>/g)
      for (const m of matches) {
        const get = (tag: string) =>
          m[1].match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? ""
        items.push({
          아파트: get("아파트"),
          전용면적: get("전용면적"),
          층: get("층"),
          거래금액: get("거래금액"),
          년: get("년"),
          월: get("월"),
          일: get("일"),
          법정동: get("법정동"),
          전월세구분: get("전월세구분"),
          보증금액: get("보증금액"),
          월세금액: get("월세금액"),
        })
      }
      return items
    } catch {
      return []
    }
  })()

  fetchDealsCache.set(cacheKey, promise)
  return promise
}

function buildTradeKey(dealType: string, area: string, floor: string, price: string, year: string, month: string, day: string) {
  return `${dealType}-${area}-${floor}-${price}-${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`
}

// ────────────────────────────────────────────
// 오를지 점수 조회 (Gate API)
// ────────────────────────────────────────────

async function fetchCurrentScore(aptName: string, lawdCd: string): Promise<number | null> {
  try {
    // 1. apt lookup
    const sigunguCd = lawdCd.slice(0, 5)
    const lookupRes = await fetch(
      `${GATE_URL}/apt/lookup?apt_nm=${encodeURIComponent(aptName)}&sigungu_cd=${sigunguCd}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!lookupRes.ok) return null
    const { apt_id } = await lookupRes.json()
    if (!apt_id) return null

    // 2. apt score
    const scoreRes = await fetch(`${GATE_URL}/apt/${apt_id}?horizon=6`, { signal: AbortSignal.timeout(8000) })
    if (!scoreRes.ok) return null
    const data = await scoreRes.json()
    return data?.oreulji_score ?? data?.risk_score ?? null
  } catch {
    return null
  }
}

// ────────────────────────────────────────────
// 즐겨찾기 + 내 아파트 실거래가 체크
// ────────────────────────────────────────────

interface CheckTarget {
  userEmail: string
  aptName: string
  address: string
  lawdCd: string
  dealTypes: string[]
  areaFilter: number[]
  priceMin?: number | null
  priceMax?: number | null
  scoreThreshold: number
  lastScore?: number | null
  favoriteId?: string   // 즐겨찾기면 id, 내 아파트면 undefined
}

// ────────────────────────────────────────────
// 아파트명 매칭 헬퍼
// ────────────────────────────────────────────

function normalizeAptName(name: string): string {
  return name.replace(/\s+/g, "").replace(/아파트|APT|apt/gi, "").toLowerCase()
}

/** 정규화된 토큰 단위 비교로 false positive 방지 */
function aptNamesMatch(a: string, b: string): boolean {
  const tokenize = (s: string) =>
    s.split(/\s+/).filter(Boolean).map((t) => normalizeAptName(t))

  const aTokens = tokenize(a)
  const bTokens = tokenize(b)
  const [shorter, longer] =
    aTokens.length <= bTokens.length ? [aTokens, bTokens] : [bTokens, aTokens]
  return shorter.every((t) => longer.includes(t))
}

/** 최근 3개월 실거래 평균가 계산 (같은 단지, 같은 dealType) */
async function calcRecentAvg(lawdCd: string, aptName: string, dealType: "매매" | "전세" | "월세"): Promise<number | null> {
  const now = new Date()
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
  })

  const prices: number[] = []
  for (const month of months) {
    const deals = await fetchDeals(lawdCd, month, dealType)
    for (const d of deals) {
      if (!aptNamesMatch(d.아파트, aptName)) continue
      const rawPrice = (d.거래금액 || d.보증금액 || "").replace(/,/g, "")
      const price = parseInt(rawPrice) || 0
      if (price > 0) prices.push(price)
    }
  }

  if (prices.length === 0) return null
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
}

async function checkTradesForTarget(target: CheckTarget): Promise<number> {
  const now = new Date()
  const months = [
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`,
    (() => {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
    })(),
  ]

  // 기존 알림에서 이미 처리된 trade key 수집
  const existing = await prisma.alert.findMany({
    where: { userEmail: target.userEmail, aptName: target.aptName, type: "trade" },
    select: { dealType: true, area: true, floor: true, price: true, dealYear: true, dealMonth: true, dealDay: true },
  })
  const existingKeys = new Set(
    existing.map((a) =>
      buildTradeKey(
        a.dealType ?? "",
        String(a.area ?? ""),
        a.floor ?? "",
        String(a.price ?? ""),
        a.dealYear ?? "",
        a.dealMonth ?? "",
        a.dealDay ?? "",
      )
    )
  )

  let newCount = 0

  // 최근 3개월 평균가 — dealType당 1회만 계산
  const recentAvgByType: Record<string, number | null> = {}
  for (const dealType of target.dealTypes) {
    recentAvgByType[dealType] = await calcRecentAvg(
      target.lawdCd,
      target.aptName,
      dealType as "매매" | "전세" | "월세",
    )
  }

  for (const month of months) {
    for (const dealType of target.dealTypes) {
      const deals = await fetchDeals(target.lawdCd, month, dealType as "매매" | "전세" | "월세")
      const recentAvg = recentAvgByType[dealType]

      for (const d of deals) {
        if (!aptNamesMatch(d.아파트, target.aptName)) continue

        const area = parseFloat(d.전용면적)
        const rawPrice = (d.거래금액 || d.보증금액 || "").replace(/,/g, "")
        const price = parseInt(rawPrice) || 0
        const monthlyRent = d.월세금액 ? parseInt(d.월세금액.replace(/,/g, "")) : null

        if (target.areaFilter.length > 0) {
          if (!target.areaFilter.some((a) => Math.abs(a - area) < 3)) continue
        }
        if (target.priceMin && price < target.priceMin) continue
        if (target.priceMax && price > target.priceMax) continue

        const key = buildTradeKey(dealType, String(area), d.층, String(price), d.년, d.월, d.일)
        if (existingKeys.has(key)) continue
        existingKeys.add(key)

        // 최근 평균 대비 가격 인사이트
        let priceInsight = ""
        if (recentAvg && recentAvg > 0 && price > 0) {
          const diffPct = Math.round(((price - recentAvg) / recentAvg) * 100)
          if (diffPct <= -5) priceInsight = ` 📉 평균 대비 ${Math.abs(diffPct)}% 저렴`
          else if (diffPct <= -2) priceInsight = ` 평균 대비 ${Math.abs(diffPct)}% 낮음`
          else if (diffPct >= 5) priceInsight = ` 📈 평균 대비 ${diffPct}% 높음`
        }

        // Alert DB 저장
        await prisma.alert.create({
          data: {
            userEmail: target.userEmail,
            favoriteId: target.favoriteId ?? null,
            aptName: d.아파트 || target.aptName,
            address: target.address,
            type: "trade",
            dealType,
            area,
            floor: d.층,
            price,
            monthlyRent,
            dealYear: d.년,
            dealMonth: d.월.padStart(2, "0"),
            dealDay: d.일.padStart(2, "0"),
          },
        })

        // 웹푸시 발송
        const priceStr = formatPrice(price)
        const avgStr = recentAvg ? ` (평균 ${formatPrice(recentAvg)})` : ""
        const body = `${d.아파트 || target.aptName} ${area}㎡ ${d.층}층 ${dealType} ${priceStr}${avgStr}${priceInsight}`

        // 평균 대비 5% 이상 저렴한 경우 특별 알림 제목
        const isBargin = recentAvg && price > 0 && ((recentAvg - price) / recentAvg) >= 0.05
        await sendPushToUser(target.userEmail, {
          title: isBargin ? `💰 시세 대비 저렴한 실거래 감지!` : `🏠 새 실거래가 등록`,
          body,
          tag: `trade-${target.aptName}`,
          url: buildDashboardUrl(target.aptName, target.lawdCd, target.address),
        })

        newCount++
      }
    }
  }

  return newCount
}

// ────────────────────────────────────────────
// 점수 변동 체크
// ────────────────────────────────────────────

async function checkScoreForTarget(target: CheckTarget): Promise<boolean> {
  const currentScore = await fetchCurrentScore(target.aptName, target.lawdCd)
  if (currentScore === null) return false

  const lastScore = target.lastScore
  if (lastScore === null || lastScore === undefined) {
    // 처음 체크 — 점수만 기록, 알림 없음
    if (target.favoriteId) {
      await prisma.favorite.update({
        where: { id: target.favoriteId },
        data: { lastScore: currentScore },
      })
    }
    return false
  }

  const delta = Math.abs(currentScore - lastScore)
  if (delta < target.scoreThreshold) return false

  const isDownturn = currentScore < lastScore

  // 행동형 알림 — 점수 하락 시 actionType/actionMessage 생성
  let actionType: string | null = null
  let actionMessage: string | null = null
  if (isDownturn && delta >= 10) {
    actionType = "compare_alternative"
    actionMessage = "대체 단지 비교를 고려하세요. 리스크가 크게 상승했습니다."
  } else if (isDownturn && delta >= 5) {
    actionType = "review_timing"
    actionMessage = "리스크 상향, 매도 타임라인 재검토 필요"
  }

  // 점수 변동 알림
  await prisma.alert.create({
    data: {
      userEmail: target.userEmail,
      favoriteId: target.favoriteId ?? null,
      aptName: target.aptName,
      address: target.address,
      type: "score",
      scoreBefore: lastScore,
      scoreAfter: currentScore,
      actionType,
      actionMessage,
    },
  })

  const direction = currentScore > lastScore ? "상승 ▲" : "하락 ▼"
  const pushBody = actionMessage
    ? `${target.aptName} ${lastScore}점 → ${currentScore}점 · ${actionMessage}`
    : `${target.aptName} ${lastScore}점 → ${currentScore}점 (${delta > 0 ? "+" : ""}${currentScore - lastScore}점)`
  await sendPushToUser(target.userEmail, {
    title: `📊 오를지 점수 ${direction}`,
    body: pushBody,
    tag: `score-${target.aptName}`,
    url: buildDashboardUrl(target.aptName, target.lawdCd, target.address),
  })

  // lastScore 갱신
  if (target.favoriteId) {
    await prisma.favorite.update({
      where: { id: target.favoriteId },
      data: { lastScore: currentScore, lastCheckedAt: new Date() },
    })
  }

  return true
}

// ────────────────────────────────────────────
// 전체 체크 (cron 진입점)
// ────────────────────────────────────────────

export interface CheckSummary {
  userEmail: string
  aptName: string
  source: "favorite" | "property"
  newTrades: number
  scoreChanged: boolean
}

export async function checkAllForAllUsers(): Promise<CheckSummary[]> {
  fetchDealsCache.clear()
  const summaries: CheckSummary[] = []

  // 구독 중인 사용자 목록 가져오기 (웹푸시 구독자)
  const pushSubs = await prisma.pushSubscription.findMany({
    select: { userEmail: true },
    distinct: ["userEmail"],
  })
  const subscribedEmails = new Set(pushSubs.map((s) => s.userEmail))

  // 1. 즐겨찾기 체크
  const favorites = await prisma.favorite.findMany()

  for (const fav of favorites) {
    // 웹푸시 구독 안 한 유저는 알림 발송 스킵 (DB 알림만 저장)
    const hasPush = subscribedEmails.has(fav.userEmail)
    const dealTypes: string[] = JSON.parse(fav.dealTypes || "[]")
    if (dealTypes.length === 0) continue

    const target: CheckTarget = {
      userEmail:      fav.userEmail,
      aptName:        fav.aptName,
      address:        fav.address,
      lawdCd:         fav.lawdCd,
      dealTypes,
      areaFilter:     JSON.parse(fav.areaFilter || "[]"),
      priceMin:       fav.priceMin,
      priceMax:       fav.priceMax,
      scoreThreshold: fav.scoreThreshold,
      lastScore:      fav.lastScore,
      favoriteId:     fav.id,
    }

    const newTrades    = await checkTradesForTarget(target)
    const scoreChanged = await checkScoreForTarget(target)

    // lastCheckedAt 갱신
    await prisma.favorite.update({
      where: { id: fav.id },
      data: { lastCheckedAt: new Date() },
    })

    summaries.push({ userEmail: fav.userEmail, aptName: fav.aptName, source: "favorite", newTrades, scoreChanged })
  }

  // 2. 내 아파트 체크 (Property 모델)
  const properties = await prisma.property.findMany({ include: { user: true } })

  for (const prop of properties) {
    if (!prop.lawdCd) continue
    const email = prop.user.email

    const target: CheckTarget = {
      userEmail:      email,
      aptName:        prop.aptName,
      address:        prop.address,
      lawdCd:         prop.lawdCd,
      dealTypes:      ["매매", "전세"],  // 내 아파트는 매매+전세 기본 추적
      areaFilter:     [],
      scoreThreshold: 5,                 // 기본 임계값
      lastScore:      null,              // Property는 별도 lastScore 없음 — 추후 확장 가능
    }

    const newTrades = await checkTradesForTarget(target)

    summaries.push({ userEmail: email, aptName: prop.aptName, source: "property", newTrades, scoreChanged: false })
  }

  return summaries
}

// ────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────

export function formatPrice(price: number): string {
  if (price >= 10000) {
    const 억 = Math.floor(price / 10000)
    const 천 = price % 10000
    if (천 === 0) return `${억}억`
    if (천 < 1000) return `${억}억 ${천}만`
    return `${억}억 ${Math.floor(천 / 1000)}천만`
  }
  if (price >= 1000) return `${Math.floor(price / 1000)}천만`
  return `${price}만`
}
