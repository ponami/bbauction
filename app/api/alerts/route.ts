// app/api/alerts/route.ts
// GET    /api/alerts         — 내 알림 목록 (최신 순)
// PATCH  /api/alerts         — 읽음 처리 { ids: string[] }
// DELETE /api/alerts         — 읽음 알림 전체 삭제

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/getSessionUser"

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1"

  const alerts = await prisma.alert.findMany({
    where: { userEmail: user.email, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const unreadCount = await prisma.alert.count({
    where: { userEmail: user.email, isRead: false },
  })

  return NextResponse.json({ success: true, data: alerts, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids 배열 필수" }, { status: 400 })

  await prisma.alert.updateMany({
    where: { id: { in: ids }, userEmail: user.email },
    data: { isRead: true },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  await prisma.alert.deleteMany({
    where: { userEmail: user.email, isRead: true },
  })
  return NextResponse.json({ success: true })
}
