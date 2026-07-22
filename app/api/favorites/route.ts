// app/api/favorites/route.ts
// GET    /api/favorites       — 즐겨찾기 목록
// POST   /api/favorites       — 즐겨찾기 추가 (무료: 3개 제한, 구독: 무제한)
// DELETE /api/favorites?id=   — 즐겨찾기 삭제
// PATCH  /api/favorites?id=   — 즐겨찾기 수정

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAddFavorite } from "@/lib/userTier"
import { getSessionUser } from "@/lib/getSessionUser"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    // return success to avoid 401 "failed resource" log in unauth map/dashboard
    return NextResponse.json({ success: true, data: [] })
  }

  try {
    const favs = await prisma.favorite.findMany({
      where: { userEmail: user.email },
      orderBy: { createdAt: "desc" },
    })

    const data = favs.map((f) => ({
      ...f,
      dealTypes: JSON.parse(f.dealTypes),
      areaFilter: JSON.parse(f.areaFilter),
      createdAt: f.createdAt.toISOString(),
      lastCheckedAt: f.lastCheckedAt?.toISOString() ?? undefined,
    }))

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다" })
  }

  const body = await req.json()
  const { aptName, address, lawdCd, dealTypes, areaFilter, priceMin, priceMax, color, scoreThreshold, category } = body

  if (!aptName || !lawdCd || !dealTypes?.length) {
    return NextResponse.json({ success: false, error: "aptName, lawdCd, dealTypes 필수" }, { status: 400 })
  }

  // 즐겨찾기 개수 제한 (무료 회원: 7개)
  const allowed = await canAddFavorite(user.id, user.email)
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "즐겨찾기는 최대 7개까지 저장할 수 있습니다. 유료구독 시 무제한 이용 가능합니다.", code: "LIMIT_EXCEEDED" },
      { status: 403 }
    )
  }

  const fav = await prisma.favorite.create({
    data: {
      userEmail:      user.email,
      aptName,
      address:        address ?? "",
      lawdCd,
      dealTypes:      JSON.stringify(dealTypes),
      areaFilter:     JSON.stringify(areaFilter ?? []),
      priceMin:       priceMin ?? null,
      priceMax:       priceMax ?? null,
      color:          color ?? "#1B4FBB",
      scoreThreshold: scoreThreshold ?? 5,
      category:       category ?? "general",
    },
  })

  return NextResponse.json({
    success: true,
    data: { ...fav, dealTypes, areaFilter: areaFilter ?? [], createdAt: fav.createdAt.toISOString() },
  }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다" })
  }

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "id 필수" }, { status: 400 })

  try {
    // 본인 즐겨찾기만 삭제 가능
    await prisma.favorite.delete({ where: { id, userEmail: user.email } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "즐겨찾기 없음" }, { status: 404 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다" })
  }

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "id 필수" }, { status: 400 })

  const patch = await req.json()
  const { dealTypes, areaFilter, lastCheckedAt, createdAt, ...rest } = patch

  // 결정 상태가 변경되면 decisionUpdatedAt 자동 갱신
  if (rest.decisionStatus !== undefined) {
    rest.decisionUpdatedAt = new Date().toISOString()
  }

  try {
    const updated = await prisma.favorite.update({
      where: { id, userEmail: user.email },
      data: {
        ...rest,
        ...(dealTypes !== undefined && { dealTypes: JSON.stringify(dealTypes) }),
        ...(areaFilter !== undefined && { areaFilter: JSON.stringify(areaFilter) }),
        ...(lastCheckedAt !== undefined && { lastCheckedAt: new Date(lastCheckedAt) }),
      },
    })
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        dealTypes: JSON.parse(updated.dealTypes),
        areaFilter: JSON.parse(updated.areaFilter),
        createdAt: updated.createdAt.toISOString(),
        lastCheckedAt: updated.lastCheckedAt?.toISOString() ?? undefined,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "즐겨찾기 없음" }, { status: 404 })
  }
}
