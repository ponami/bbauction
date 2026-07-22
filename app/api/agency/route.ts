// GET  /api/agency  — 내 팀 정보 + 멤버 목록
// POST /api/agency  — 팀원 초대 (이메일로)
// DELETE /api/agency?memberId=xxx — 팀원 제거

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/getSessionUser"
import { isRecurringAccessActive, resolveBillingProvider } from "@/lib/paymentManagement"

function serializeTeam(team: any) {
  return {
    id: team.id,
    ownerId: team.ownerId,
    name: team.name,
    status: team.status,
    startAt: team.startAt,
    endAt: team.endAt,
    billingProvider: resolveBillingProvider(team),
    owner: team.owner,
    members: team.members,
  }
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })

  // 오너인 경우
  const team = await prisma.agencyTeam.findUnique({
    where: { ownerId: user.id },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  })
  if (team) {
    return NextResponse.json({ role: "owner", team: serializeTeam(team) })
  }

  // 멤버인 경우
  const membership = await prisma.agencyMember.findUnique({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          owner: { select: { id: true, email: true, name: true } },
          members: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      },
    },
  })
  if (membership) {
    return NextResponse.json({ role: "member", team: serializeTeam(membership.team) })
  }

  return NextResponse.json({ role: null, team: null })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })

  if (user.plan !== "agency") {
    return NextResponse.json({ error: "중개사 플랜 구독자만 팀원을 초대할 수 있습니다" }, { status: 403 })
  }

  const team = await prisma.agencyTeam.findUnique({
    where: { ownerId: user.id },
    include: { members: true },
  })
  if (!team || !isRecurringAccessActive(team.status, team.endAt)) {
    return NextResponse.json({ error: "활성화된 중개사 팀이 없습니다" }, { status: 403 })
  }
  if (team.members.length >= 4) {
    return NextResponse.json({ error: "팀원은 최대 4명(총 5인)까지 초대할 수 있습니다" }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "이메일 필수" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { email } })
  if (!target) return NextResponse.json({ error: "해당 이메일로 가입된 계정이 없습니다" }, { status: 404 })
  if (target.id === user.id) return NextResponse.json({ error: "자신을 초대할 수 없습니다" }, { status: 400 })

  const alreadyMember = team.members.some(m => m.userId === target.id)
  if (alreadyMember) return NextResponse.json({ error: "이미 팀원입니다" }, { status: 400 })

  // 기존 팀 소속 여부 확인
  const existingMembership = await prisma.agencyMember.findUnique({ where: { userId: target.id } })
  if (existingMembership) return NextResponse.json({ error: "이미 다른 팀에 소속된 사용자입니다" }, { status: 400 })

  await prisma.$transaction([
    prisma.agencyMember.create({
      data: { teamId: team.id, userId: target.id, role: "member" },
    }),
    prisma.user.update({ where: { id: target.id }, data: { plan: "agency" } }),
  ])

  return NextResponse.json({ success: true, email: target.email })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })

  const memberId = req.nextUrl.searchParams.get("memberId")
  if (!memberId) return NextResponse.json({ error: "memberId 필수" }, { status: 400 })

  const team = await prisma.agencyTeam.findUnique({ where: { ownerId: user.id } })
  if (!team) return NextResponse.json({ error: "팀 오너만 팀원을 제거할 수 있습니다" }, { status: 403 })

  const member = await prisma.agencyMember.findFirst({
    where: { id: memberId, teamId: team.id },
  })
  if (!member) return NextResponse.json({ error: "해당 팀원을 찾을 수 없습니다" }, { status: 404 })

  await prisma.$transaction([
    prisma.agencyMember.delete({ where: { id: memberId } }),
    prisma.user.update({ where: { id: member.userId }, data: { plan: "free" } }),
  ])

  return NextResponse.json({ success: true })
}
