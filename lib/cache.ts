// ============================================================
// 캐시 레이어 — API 호출 횟수 줄여서 비용 절약
// 프로세스 메모리 캐시: Fly 멀티 인스턴스/재배포 환경에서 파일 영속성 착시 방지
// ============================================================

import type { CategoryId } from "./types"

interface CacheFile<T> {
  data: T
  cachedAt: number  // Date.now()
  ttl: number       // 밀리초
}

const globalForCache = globalThis as unknown as {
  oreuljiMemoryCache?: Map<string, CacheFile<unknown>>
}

function getCacheStore() {
  if (!globalForCache.oreuljiMemoryCache) {
    globalForCache.oreuljiMemoryCache = new Map()
  }
  return globalForCache.oreuljiMemoryCache
}

// 카테고리별 TTL (밀리초)
export const CACHE_TTL: Record<CategoryId, number> = {
  transport: 6  * 60 * 60 * 1000,      // 6시간
  policy:    6  * 60 * 60 * 1000,      // 6시간
  politics:  12 * 60 * 60 * 1000,      // 12시간
  global:    1  * 60 * 60 * 1000,      // 1시간 (환율/금리 빠름)
  market:    24 * 60 * 60 * 1000,      // 24시간
  geo:       7  * 24 * 60 * 60 * 1000, // 7일 (거의 안 바뀜)
  school:    7  * 24 * 60 * 60 * 1000, // 7일
  momcafe:   12 * 60 * 60 * 1000,      // 12시간
}

// ─── 저장 ─────────────────────────────────────────────────────
export function setCache<T>(key: string, data: T, ttl: number): void {
  try {
    getCacheStore().set(key, { data, cachedAt: Date.now(), ttl })
  } catch (e) {
    console.error("[cache] 메모리 쓰기 실패:", e)
  }
}

// ─── 조회 ─────────────────────────────────────────────────────
export function getCache<T>(key: string): { data: T; cachedAt: string } | null {
  try {
    const entry = getCacheStore().get(key) as CacheFile<T> | undefined
    if (!entry) return null
    const age = Date.now() - entry.cachedAt

    if (age > entry.ttl) {
      getCacheStore().delete(key)
      return null
    }

    return {
      data: entry.data,
      cachedAt: new Date(entry.cachedAt).toISOString(),
    }
  } catch (e) {
    console.error("[cache] 조회 실패:", e)
    return null
  }
}

// ─── 특정 캐시 무효화 ─────────────────────────────────────────
export function invalidateCache(key: string): void {
  try {
    getCacheStore().delete(key)
  } catch (e) { console.error("[cache] 무효화 실패:", e) }
}

// ─── 전체 캐시 초기화 ─────────────────────────────────────────
export function clearAllCache(): void {
  try {
    getCacheStore().clear()
  } catch (e) { console.error("[cache] 전체 초기화 실패:", e) }
}

// ─── 캐시 상태 조회 (디버그용) ────────────────────────────────
export function getCacheStatus(): Record<string, { ageMin: number; ttlMin: number }> {
  const status: Record<string, { ageMin: number; ttlMin: number }> = {}
  try {
    const now = Date.now()
    for (const [key, entry] of getCacheStore().entries()) {
      status[key] = {
        ageMin: Math.round((now - entry.cachedAt) / 60000),
        ttlMin: Math.round(entry.ttl / 60000),
      }
    }
  } catch (e) { console.error("[cache] 상태 조회 실패:", e) }
  return status
}

// ─── 캐시 래퍼 헬퍼 ──────────────────────────────────────────
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; cached: boolean; cachedAt?: string }> {
  const cached = getCache<T>(key)
  if (cached) {
    return { data: cached.data, cached: true, cachedAt: cached.cachedAt }
  }

  const data = await fetcher()
  setCache(key, data, ttl)
  return { data, cached: false }
}
