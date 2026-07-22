// app/api/presales/route.ts

import { NextRequest, NextResponse } from "next/server"
import { loadPresales, markPresalesRead } from "@/lib/presale"

export async function GET(req: NextRequest) {
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1"
  let items = loadPresales()
  if (unreadOnly) items = items.filter(p => !p.isRead)
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const unreadCount = items.filter(p => !p.isRead).length
  return NextResponse.json({ success: true, data: items, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const { ids } = await req.json()
  if (!Array.isArray(ids)) return NextResponse.json({ success: false, error: "ids 배열 필수" }, { status: 400 })
  markPresalesRead(ids)
  return NextResponse.json({ success: true })
}
