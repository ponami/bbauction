// app/api/neighborhoods/route.ts

import { NextRequest, NextResponse } from "next/server"
import {
  loadNeighborhoods,
  addNeighborhood,
  updateNeighborhood,
  deleteNeighborhood,
  incrementVisit,
  syncFromFavorites,
} from "@/lib/presale"

export async function GET() {
  try {
    try {
      await syncFromFavorites()
    } catch (e) {
      console.warn("[/api/neighborhoods] syncFromFavorites failed:", e)
    }

    let hoods = loadNeighborhoods()
    if (!Array.isArray(hoods)) hoods = []
    // 방어: 필드 기본값 보장 (old data 호환)
    hoods = hoods.map(h => ({
      ...h,
      isFavorited: !!h.isFavorited,
      visitCount: Number(h.visitCount) || 0,
    }))
    hoods.sort((a, b) => {
      if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1
      return (b.visitCount || 0) - (a.visitCount || 0)
    })
    return NextResponse.json({ success: true, data: hoods })
  } catch (e) {
    console.error("[/api/neighborhoods] GET failed:", e)
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, sido, sigungu, bjdCode, isFavorited } = body
  if (!name || !sido || !sigungu || !bjdCode) {
    return NextResponse.json({ success: false, error: "name, sido, sigungu, bjdCode 필수" }, { status: 400 })
  }
  const hood = addNeighborhood({ name, sido, sigungu, bjdCode, isFavorited: !!isFavorited, sources: ["직접 추가"] })
  return NextResponse.json({ success: true, data: hood }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  const action = req.nextUrl.searchParams.get("action")

  if (!id) return NextResponse.json({ success: false, error: "id 필수" }, { status: 400 })

  if (action === "visit") {
    const hood = loadNeighborhoods().find(h => h.id === id)
    if (hood) incrementVisit(hood.bjdCode)
    return NextResponse.json({ success: true })
  }

  const patch = await req.json()
  const updated = updateNeighborhood(id, patch)
  if (!updated) return NextResponse.json({ success: false, error: "없음" }, { status: 404 })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "id 필수" }, { status: 400 })
  const ok = deleteNeighborhood(id)
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 })
}
