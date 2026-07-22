import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/getSessionUser"
import { resolveUserEntitlements } from "@/lib/entitlements"
import { normalizeLeadStatus, normalizeLeadTags, summarizeLeadRecord } from "@/lib/leads"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다" }, { status: 401 })
  }

  const leads = await prisma.lead.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  return NextResponse.json({ success: true, data: leads.map(summarizeLeadRecord) })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다" }, { status: 401 })
  }
  const entitlements = await resolveUserEntitlements(user.id)

  const body = await req.json()
  const leadId = typeof body.leadId === "string" ? body.leadId : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  const reportPurpose = typeof body.reportPurpose === "string" ? body.reportPurpose.trim() : ""
  const aptId = typeof body.aptId === "number" ? body.aptId : null
  const aptName = typeof body.aptName === "string" ? body.aptName.trim() : ""
  const address = typeof body.address === "string" ? body.address.trim() : ""
  const shareUrl = typeof body.shareUrl === "string" ? body.shareUrl.trim() : ""

  const resolvedName = name || "미지정 고객"

  let lead = leadId
    ? await prisma.lead.findFirst({ where: { id: leadId, ownerId: user.id } })
    : await prisma.lead.findFirst({ where: { ownerId: user.id, name: resolvedName }, orderBy: { updatedAt: "desc" } })

  if (lead) {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: resolvedName,
        phone: phone || lead.phone,
        lastReportPurpose: reportPurpose || lead.lastReportPurpose,
        lastSharedAptId: aptId ?? lead.lastSharedAptId,
        lastSharedAptName: aptName || lead.lastSharedAptName,
        lastSharedAddress: address || lead.lastSharedAddress,
        lastSharedAt: new Date(),
      },
    })
  } else {
    if (!entitlements.features.canAccessAgentCrm) {
      return NextResponse.json({ success: false, error: "고객 CRM은 중개사 권한 전용 기능입니다" }, { status: 403 })
    }
    const leadCount = await prisma.lead.count({ where: { ownerId: user.id } })
    if (leadCount >= entitlements.limits.maxClients) {
      return NextResponse.json({ success: false, error: "현재 플랜의 고객 수 한도를 초과했습니다" }, { status: 403 })
    }
    lead = await prisma.lead.create({
      data: {
        ownerId: user.id,
        name: resolvedName,
        phone: phone || null,
        lastReportPurpose: reportPurpose || null,
        lastSharedAptId: aptId,
        lastSharedAptName: aptName || null,
        lastSharedAddress: address || null,
        lastSharedAt: new Date(),
      },
    })
  }

  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      type: "share_sent",
      aptId,
      aptName: aptName || null,
      address: address || null,
      payload: JSON.stringify({
        shareUrl: shareUrl || undefined,
        reportPurpose: reportPurpose || undefined,
      }),
    },
  })

  const fullLead = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: { events: { orderBy: { createdAt: "desc" }, take: 20 } },
  })

  return NextResponse.json({ success: true, data: fullLead ? summarizeLeadRecord(fullLead) : null }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다" }, { status: 401 })
  }
  const entitlements = await resolveUserEntitlements(user.id)
  if (!entitlements.features.canAccessAgentCrm) {
    return NextResponse.json({ success: false, error: "고객 CRM은 중개사 권한 전용 기능입니다" }, { status: 403 })
  }

  const body = await req.json()
  const leadId = typeof body.id === "string" ? body.id : ""
  if (!leadId) {
    return NextResponse.json({ success: false, error: "id가 필요합니다" }, { status: 400 })
  }

  const existing = await prisma.lead.findFirst({ where: { id: leadId, ownerId: user.id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "리드를 찾을 수 없습니다" }, { status: 404 })
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      name: typeof body.name === "string" ? body.name.trim() || existing.name : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() || null : undefined,
      status: body.status !== undefined ? normalizeLeadStatus(body.status) : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      tags: body.tags !== undefined ? JSON.stringify(normalizeLeadTags(body.tags)) : undefined,
      lastReportPurpose: typeof body.lastReportPurpose === "string" ? body.lastReportPurpose.trim() || null : undefined,
    },
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  return NextResponse.json({ success: true, data: summarizeLeadRecord(updated) })
}
