import { prisma } from "./prisma"
import { ENTITLEMENT_LIMITS } from "./planLimits"
import { isRecurringAccessActive } from "./paymentManagement"

/** 구독자 월 최대 심층 분석 횟수 (어뷰징·크롤링 방지) */
export const SUBSCRIPTION_MONTHLY_LIMIT = parseInt(process.env.SUBSCRIPTION_MONTHLY_LIMIT ?? "10")

/** 사용자 플랜 조회. 구독이 만료되었으면 'free' 반환 후 DB 갱신 */
export async function getUserPlan(userId: string): Promise<"free" | "subscription" | "agency"> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true, agencyOwner: true, agencyMembership: { include: { team: true } } },
  })
  if (!user) return "free"

  const now = new Date()
  const activeAgencyTeam = user.agencyOwner && isRecurringAccessActive(user.agencyOwner.status, user.agencyOwner.endAt, now)
    ? user.agencyOwner
    : user.agencyMembership?.team && isRecurringAccessActive(user.agencyMembership.team.status, user.agencyMembership.team.endAt, now)
    ? user.agencyMembership.team
    : null
  if (activeAgencyTeam) return "agency"

  if (user.plan === "agency") {
    const updates = []

    if (user.agencyOwner && user.agencyOwner.endAt <= now && user.agencyOwner.status !== "expired") {
      updates.push(
        prisma.agencyTeam.update({
          where: { id: user.agencyOwner.id },
          data: { status: "expired" },
        }),
      )
    }

    if (user.agencyMembership?.team && user.agencyMembership.team.endAt <= now && user.agencyMembership.team.status !== "expired") {
      updates.push(
        prisma.agencyTeam.update({
          where: { id: user.agencyMembership.team.id },
          data: { status: "expired" },
        }),
      )
    }

    updates.push(
      prisma.user.update({ where: { id: userId }, data: { plan: "free" } }),
    )

    await prisma.$transaction(updates)
    return "free"
  }

  if (user.plan === "subscription" && user.subscription) {
    if (!isRecurringAccessActive(user.subscription.status, user.subscription.endAt, now)) {
      // 구독 만료 처리
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { plan: "free" } }),
        prisma.subscription.update({
          where: { userId },
          data: { status: "expired" },
        }),
      ])
      return "free"
    }
    return "subscription"
  }

  return "free"
}

/** 특정 아파트에 대한 단건 구매 여부 확인 */
export async function hasPurchasedApt(userId: string, aptId: number): Promise<boolean> {
  const purchase = await prisma.purchase.findFirst({
    where: { userId, aptId, status: "paid" },
  })
  return purchase !== null
}

/** 이번 달 사용량 조회 */
export async function getMonthlyUsageCount(userId: string): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  return prisma.usageLog.count({ where: { userId, usedAt: { gte: startOfMonth } } })
}

/** 구독 사용량 로깅 (분석 시작 전 호출 → 동시 크롤링 방지) */
export async function logUsage(
  userId: string,
  aptName: string,
  lawdCd: string,
  aptId?: number | null,
): Promise<void> {
  await prisma.usageLog.create({ data: { userId, aptName, lawdCd, aptId: aptId ?? null } })
}

/** 아파트 심층 분석 접근 권한 확인 (구독 OR 단건 구매) */
export async function canAccessDeepAnalysis(
  userId: string,
  aptId: number
): Promise<{ allowed: boolean; reason: "subscription" | "agency" | "purchase" | "none" | "limit_exceeded"; used?: number; limit?: number }> {
  const plan = await getUserPlan(userId)
  if (plan === "agency") {
    return { allowed: true, reason: "agency" }
  }
  if (plan === "subscription") {
    const used = await getMonthlyUsageCount(userId)
    if (used >= SUBSCRIPTION_MONTHLY_LIMIT) {
      return { allowed: false, reason: "limit_exceeded", used, limit: SUBSCRIPTION_MONTHLY_LIMIT }
    }
    return { allowed: true, reason: "subscription", used, limit: SUBSCRIPTION_MONTHLY_LIMIT }
  }

  const purchased = await hasPurchasedApt(userId, aptId)
  if (purchased) return { allowed: true, reason: "purchase" }

  return { allowed: false, reason: "none" }
}

/** aptName + lawdCd로 단건 구매 여부 확인 + 구독 슬롯 원자적 획득 (aptId를 모를 때 사용) */
export async function canAccessDeepAnalysisByName(
  userId: string,
  aptName: string,
  lawdCd: string,
  aptId?: number | null,
): Promise<{ allowed: boolean; reason: "subscription" | "agency" | "purchase" | "none" | "limit_exceeded"; used?: number; limit?: number }> {
  const plan = await getUserPlan(userId)
  if (plan === "agency") {
    return { allowed: true, reason: "agency" }
  }
  if (plan === "subscription") {
    // 트랜잭션 내에서 count 체크 + usage 생성 (race condition 방지)
    return tryAcquireUsageSlot(userId, aptName, lawdCd, aptId)
  }

  const purchase = await prisma.purchase.findFirst({
    where: { userId, aptName, lawdCd, status: "paid" },
  })
  if (purchase) return { allowed: true, reason: "purchase" }

  return { allowed: false, reason: "none" }
}

/** 구독 사용량을 트랜잭션으로 원자적 체크&증가 (동시 요청으로 한도 초과 방지) */
async function tryAcquireUsageSlot(
  userId: string,
  aptName: string,
  lawdCd: string,
  aptId?: number | null,
): Promise<{ allowed: boolean; reason: "subscription" | "limit_exceeded"; used: number; limit: number }> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  return prisma.$transaction(async (tx) => {
    const used = await tx.usageLog.count({
      where: { userId, usedAt: { gte: startOfMonth } },
    })
    if (used >= SUBSCRIPTION_MONTHLY_LIMIT) {
      return { allowed: false, reason: "limit_exceeded" as const, used, limit: SUBSCRIPTION_MONTHLY_LIMIT }
    }
    await tx.usageLog.create({ data: { userId, aptName, lawdCd, aptId: aptId ?? null } })
    return { allowed: true, reason: "subscription" as const, used: used + 1, limit: SUBSCRIPTION_MONTHLY_LIMIT }
  })
}

/** 즐겨찾기 추가 가능 여부 확인 (무료: 7개 제한, 구독: 무제한) */
export async function canAddFavorite(userId: string, userEmail: string): Promise<boolean> {
  const plan = await getUserPlan(userId)
  if (plan === "subscription" || plan === "agency") return true

  const count = await prisma.favorite.count({ where: { userEmail } })
  return count < ENTITLEMENT_LIMITS.free.maxFavorites
}
