// app/api/alerts/check/route.ts
// POST /api/alerts/check  — 수동으로 즐겨찾기 & 내 아파트 체크
// GET  /api/alerts/check  — 즐겨찾기별 마지막 체크 시각

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkAllForAllUsers } from "@/lib/alerts"
import { getSessionUser } from "@/lib/getSessionUser"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const favs = await prisma.favorite.findMany({
    where: { userEmail: user.email },
    select: { id: true, aptName: true, lastCheckedAt: true },
  })

  return NextResponse.json({
    success: true,
    data: favs.map((f) => ({
      id: f.id,
      aptName: f.aptName,
      lastCheckedAt: f.lastCheckedAt?.toISOString() ?? null,
    })),
  })
}

export async function POST() {
  try {
    const results = await checkAllForAllUsers()
    const totalTrades = results.reduce((s, r) => s + r.newTrades, 0)
    return NextResponse.json({
      success: true,
      data: { checked: results.length, newTrades: totalTrades, results, checkedAt: new Date().toISOString() },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: "알림 확인 중 오류가 발생했습니다" }, { status: 500 })
  }
}
