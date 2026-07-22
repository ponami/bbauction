import { prisma } from "@/lib/prisma"

export interface LookupError {
  id: string
  timestamp: string
  address: string
  aptName: string
  lawdCd: string
  propertyType: string
  reason: string
  naverTitles: string[]
  resolved: boolean
}

export async function reportLookupError(params: {
  address: string
  aptName: string
  lawdCd: string
  propertyType: string
  reason: string
  naverTitles?: string[]
}): Promise<void> {
  try {
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const isDuplicate = await prisma.lookupErrorEntry.findFirst({
      where: {
        address: params.address,
        reason: params.reason,
        createdAt: {
          gt: recent,
        },
      },
      select: { id: true },
    })

    if (isDuplicate) return

    await prisma.lookupErrorEntry.create({
      data: {
        address: params.address,
        aptName: params.aptName,
        lawdCd: params.lawdCd,
        propertyType: params.propertyType,
        reason: params.reason,
        naverTitles: JSON.stringify(params.naverTitles ?? []),
      },
    })

    const overflow = await prisma.lookupErrorEntry.findMany({
      orderBy: { createdAt: "desc" },
      skip: 500,
      select: { id: true },
    })

    if (overflow.length > 0) {
      await prisma.lookupErrorEntry.deleteMany({
        where: {
          id: { in: overflow.map((item) => item.id) },
        },
      })
    }

    console.warn(`[LookupError] ${params.reason} — ${params.address} (${params.aptName})`)
  } catch (err) {
    console.error("[LookupError] 기록 실패:", err)
  }
}
