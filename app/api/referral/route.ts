// app/api/referral/route.ts
// GET /api/referral — 내 추천 코드 + 통계
// POST /api/referral — 추천 코드 생성

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/getSessionUser"
import { randomBytes } from "crypto"

function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase()
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  }

  // 내 추천 코드
  let code = await prisma.referralCode.findUnique({ where: { userEmail: user.email } })
  if (!code) {
    code = await prisma.referralCode.create({
      data: { userEmail: user.email, code: generateCode() },
    })
  }

  // 내 크레딧 요약
  const credits = await prisma.referralCredit.findMany({
    where: { ownerEmail: user.email },
    orderBy: { createdAt: "desc" },
  })

  const activeCredits = credits.filter(c => c.status === "active")
  const usedCredits = credits.filter(c => c.status === "used")

  // 초대한 사람 수 (referee가 있는 크레딧 중 unique)
  const referredEmails = new Set(credits.map(c => c.refereeEmail).filter(Boolean))

  return NextResponse.json({
    success: true,
    data: {
      code: code.code,
      totalReferred: referredEmails.size,
      credits: {
        active: activeCredits.length,
        used: usedCredits.length,
        total: credits.length,
      },
      creditList: credits.map(c => ({
        id: c.id,
        type: c.creditType,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        expiresAt: c.expiresAt?.toISOString() ?? null,
        usedAt: c.usedAt?.toISOString() ?? null,
      })),
    },
  })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  }

  // Body: { code: string } — 추천 코드 등록
  const body = await req.json().catch(() => ({}))
  const refCode = body?.code?.trim().toUpperCase()

  if (!refCode) {
    return NextResponse.json({ success: false, error: "code_required" }, { status: 400 })
  }

  // 자기 자신 추천 금지
  const existing = await prisma.referralCode.findUnique({ where: { userEmail: user.email } })
  if (existing) {
    return NextResponse.json({ success: false, error: "already_has_code" }, { status: 400 })
  }

  // 코드 소유자 찾기
  const ownerCode = await prisma.referralCode.findUnique({ where: { code: refCode } })
  if (!ownerCode) {
    return NextResponse.json({ success: false, error: "invalid_code" }, { status: 404 })
  }

  if (ownerCode.userEmail === user.email) {
    return NextResponse.json({ success: false, error: "self_referral" }, { status: 400 })
  }

  // 이미 등록된 추천인 확인
  const existingCredit = await prisma.referralCredit.findFirst({
    where: { refereeEmail: user.email },
  })
  if (existingCredit) {
    return NextResponse.json({ success: false, error: "already_referred" }, { status: 400 })
  }

  // 추천인에게 크레딧 지급
  await prisma.referralCredit.create({
    data: {
      ownerEmail: ownerCode.userEmail,
      refereeEmail: user.email,
      creditType: "single_report",
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6개월
    },
  })

  // 추천인에게도 크레딧 지급 (웰컴)
  await prisma.referralCredit.create({
    data: {
      ownerEmail: user.email,
      creditType: "compare_pack",
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3개월
    },
  })

  return NextResponse.json({ success: true })
}
