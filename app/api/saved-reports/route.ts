// GET  /api/saved-reports     — 저장된 분석 리포트 목록
// POST /api/saved-reports     — 분석 결과 저장 (권한 있는 사용자만)
// GET  /api/saved-reports?id= — 특정 리포트 조회

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/getSessionUser"
import { prisma } from "@/lib/prisma"
import { resolveUserEntitlements } from "@/lib/entitlements"
import { canAccessDeepAnalysisByName } from "@/lib/userTier"

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })
  }

  const userId = user.id
  const id = req.nextUrl.searchParams.get("id")

  if (id) {
    // 특정 리포트 조회
    const report = await prisma.savedReport.findFirst({
      where: { id, userId },
    })
    if (!report) {
      return NextResponse.json({ error: "리포트를 찾을 수 없습니다" }, { status: 404 })
    }
    return NextResponse.json({
      ...report,
      data: JSON.parse(report.data),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    })
  }

  // 전체 목록 (데이터는 제외, 목록만)
  const reports = await prisma.savedReport.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      aptId: true,
      aptName: true,
      address: true,
      lawdCd: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    reports: reports.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })
  }

  const userId = user.id
  const entitlements = await resolveUserEntitlements(userId)
  const body = await req.json()
  const { aptId, aptName, address, lawdCd, data } = body

  if (!aptName || !lawdCd || !data) {
    return NextResponse.json({ error: "aptName, lawdCd, data 필수" }, { status: 400 })
  }

  // 권한 확인
  const access = await canAccessDeepAnalysisByName(userId, aptName, lawdCd)
  if (!access.allowed) {
    return NextResponse.json({ error: "저장 권한이 없습니다", code: "UPGRADE_REQUIRED" }, { status: 403 })
  }

  // 이미 저장된 리포트가 있으면 업데이트, 없으면 생성
  const existing = await prisma.savedReport.findFirst({
    where: { userId, aptName, lawdCd },
  })

  if (existing) {
    const updated = await prisma.savedReport.update({
      where: { id: existing.id },
      data: { data: JSON.stringify(data), address: address ?? existing.address },
    })
    return NextResponse.json({ id: updated.id, updated: true })
  }

  const savedCount = await prisma.savedReport.count({ where: { userId } })
  if (entitlements.limits.maxSavedReports !== null && savedCount >= entitlements.limits.maxSavedReports) {
    return NextResponse.json({ error: "현재 플랜의 저장 리포트 한도를 초과했습니다", code: "LIMIT_EXCEEDED" }, { status: 403 })
  }

  const created = await prisma.savedReport.create({
    data: {
      userId,
      aptId: Number(aptId) || 0,
      aptName,
      address: address ?? "",
      lawdCd,
      data: JSON.stringify(data),
    },
  })
  return NextResponse.json({ id: created.id, created: true }, { status: 201 })
}
