import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const leadId = typeof body.leadId === "string" ? body.leadId : ""
  const type = typeof body.type === "string" ? body.type : ""

  if (!leadId || !type) {
    return NextResponse.json({ success: false, error: "leadId와 type이 필요합니다" }, { status: 400 })
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) {
    return NextResponse.json({ success: false, error: "리드를 찾을 수 없습니다" }, { status: 404 })
  }

  const aptId = typeof body.aptId === "number" ? body.aptId : null
  const aptName = typeof body.aptName === "string" ? body.aptName.trim() : ""
  const address = typeof body.address === "string" ? body.address.trim() : ""
  const reportPurpose = typeof body.reportPurpose === "string" ? body.reportPurpose.trim() : ""
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {}

  await prisma.$transaction([
    prisma.leadEvent.create({
      data: {
        leadId,
        type,
        aptId,
        aptName: aptName || null,
        address: address || null,
        payload: JSON.stringify({
          ...payload,
          reportPurpose: reportPurpose || undefined,
        }),
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        lastReportPurpose: reportPurpose || undefined,
        lastSharedAptId: aptId ?? undefined,
        lastSharedAptName: aptName || undefined,
        lastSharedAddress: address || undefined,
        ...(type === "share_view" ? { lastViewedAt: new Date() } : {}),
        ...(type === "dashboard_view" ? { lastViewedAt: new Date() } : {}),
        ...(type === "compare_view" ? { lastComparedAt: new Date() } : {}),
      },
    }),
  ])

  return NextResponse.json({ success: true })
}
