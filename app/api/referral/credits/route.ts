// app/api/referral/credits/route.ts
// POST /api/referral/credits — 크레딧 사용

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/getSessionUser"

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const creditType = body?.creditType ?? "single_report"

  // 사용 가능한 크레딧 찾기
  const credit = await prisma.referralCredit.findFirst({
    where: {
      ownerEmail: user.email,
      creditType,
      status: "active",
      AND: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
    orderBy: { createdAt: "asc" },
  })

  // expiresAt이 null인 경우도 함께 체크
  const creditNullExpiry = await prisma.referralCredit.findFirst({
    where: {
      ownerEmail: user.email,
      creditType,
      status: "active",
      expiresAt: null,
    },
    orderBy: { createdAt: "asc" },
  })

  const targetCredit = credit || creditNullExpiry

  if (!targetCredit) {
    return NextResponse.json({ success: false, error: "no_credits" }, { status: 404 })
  }

  // 사용 처리
  await prisma.referralCredit.update({
    where: { id: targetCredit.id },
    data: { status: "used", usedAt: new Date() },
  })

  return NextResponse.json({
    success: true,
    data: {
      creditId: targetCredit.id,
      creditType: targetCredit.creditType,
    },
  })
}
