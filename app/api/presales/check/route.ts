// app/api/presales/check/route.ts

import { NextResponse } from "next/server"
import { checkPresales, loadNeighborhoods } from "@/lib/presale"

export async function GET() {
  const hoods = loadNeighborhoods()
  return NextResponse.json({ success: true, data: hoods.map(h => ({ id: h.id, name: h.name, lastVisitedAt: h.lastVisitedAt })) })
}

export async function POST() {
  try {
    const result = await checkPresales()
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ success: false, error: "분양 정보 확인 중 오류가 발생했습니다" }, { status: 500 })
  }
}
