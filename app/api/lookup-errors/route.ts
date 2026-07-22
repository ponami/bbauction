// GET  /api/lookup-errors          — 미처리 오류 목록
// POST /api/lookup-errors?id=xxx   — 처리 완료 표시

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const rows = await prisma.lookupErrorEntry.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "desc" },
  })
  const unresolved = rows.map((row) => ({
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    address: row.address,
    aptName: row.aptName,
    lawdCd: row.lawdCd,
    propertyType: row.propertyType,
    reason: row.reason,
    naverTitles: JSON.parse(row.naverTitles || "[]"),
    resolved: row.resolved,
  }))
  return NextResponse.json({ total: unresolved.length, errors: unresolved })
}

export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 })

  await prisma.lookupErrorEntry.update({
    where: { id },
    data: { resolved: true },
  })
  return NextResponse.json({ ok: true })
}
