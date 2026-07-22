// app/api/my-property/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/getSessionUser"
import { prisma } from "@/lib/prisma"
import { normalizeAddressText } from "@/lib/address"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser().catch(() => null)

    let address = process.env.MY_ADDRESS || ""
    let aptName = process.env.MY_APT_NAME || ""
    let lawdCd = process.env.LAWD_CD || ""
    let purchasePrice = 0
    let interiorCost = 0

    let gateAptId: number | null = null
    let pyeong: number | null = null
    let dong: string | null = null

    if (user) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { property: true } })
        if (dbUser && dbUser.property) {
          address = normalizeAddressText(dbUser.property.address) || address
          aptName = dbUser.property.aptName || aptName
          lawdCd = dbUser.property.lawdCd || lawdCd
          purchasePrice = dbUser.property.purchasePrice
          interiorCost = dbUser.property.interiorCost
          gateAptId = (dbUser.property as any).gateAptId ?? null
          pyeong = (dbUser.property as any).pyeong ?? null
          dong = (dbUser.property as any).dong ?? null
        }
      } catch (err) {
        // ignore
      }
    }

    return NextResponse.json({ address, aptName, lawdCd, purchasePrice, interiorCost, gateAptId, pyeong, dong })
  } catch (err) {
    console.error("[my-property GET]", err)
    return NextResponse.json({ address: "", aptName: "", lawdCd: "", area: "", error: "내 정보를 불러오는 중 오류가 발생했습니다" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

    const body = await req.json()
    const { address, aptName, lawdCd, gateAptId, pyeong, dong, purchasePrice, interiorCost } = body

    if (!address || !aptName) {
      return NextResponse.json({ error: "address, aptName 필수" }, { status: 400 })
    }

    const commonData = {
      address: normalizeAddressText(address) || address,
      aptName,
      lawdCd: lawdCd ?? "",
      ...(gateAptId != null ? { gateAptId: Number(gateAptId) } : {}),
      ...(pyeong != null ? { pyeong: Number(pyeong) } : { pyeong: null }),
      ...(dong != null ? { dong: String(dong) } : { dong: null }),
      purchasePrice: parseInt(purchasePrice) || 0,
      interiorCost: parseInt(interiorCost) || 0,
    }

    await prisma.property.upsert({
      where: { userId: user.id },
      update: commonData,
      create: { userId: user.id, ...commonData },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[my-property POST]", err)
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다" }, { status: 500 })
  }
}
