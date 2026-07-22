// app/api/cron/weekly-report/route.ts
// POST /api/cron/weekly-report — 모든 유저 주간 리포트 생성 + 푸시 알림
//
// 보안: CRON_SECRET 인증
// 호출 예시: POST /api/cron/weekly-report
//   Header: Authorization: Bearer {CRON_SECRET}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushToUser } from "@/lib/webpush"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "http://localhost:8001"
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3001"

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const started = Date.now()

  try {
    // 모든 유저 이메일 조회 (push 구독 기준)
    const pushSubs = await prisma.pushSubscription.findMany({
      select: { userEmail: true },
      distinct: ["userEmail"],
    })

    let pushSent = 0

    for (const sub of pushSubs) {
      try {
        // 유저의 주간 리포트 조회 (내부 API)
        const res = await fetch(`${BASE_URL}/api/reports/weekly`, {
          headers: {
            "Content-Type": "application/json",
            "x-cron-user-email": sub.userEmail,
          },
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) continue
        const json = await res.json()

        if (!json.items?.length) continue

        // 리포트 요약 생성
        const upCount = json.items.filter((i: { changes: { avgScoreDelta: number | null } }) => (i.changes?.avgScoreDelta ?? 0) > 0).length
        const downCount = json.items.filter((i: { changes: { avgScoreDelta: number | null } }) => (i.changes?.avgScoreDelta ?? 0) < 0).length
        const total = json.items.length

        // 푸시 발송
        const body = downCount > 0
          ? `내 후보 ${total}개 중 리스크 상향 ${downCount}개 / 하향 ${upCount}개`
          : `내 후보 ${total}개 주간 요약이 도착했습니다`

        await sendPushToUser(sub.userEmail, {
          title: "📬 주간 리포트 도착",
          body,
          tag: "weekly-report",
          url: "/dashboard?tab=weekly",
        })

        pushSent++
      } catch {
        // 개별 실패 무시
      }
    }

    return NextResponse.json({
      ok: true,
      usersChecked: pushSubs.length,
      pushSent,
      elapsedMs: Date.now() - started,
    })
  } catch (err) {
    console.error("[cron/weekly-report]", err)
    return NextResponse.json({ ok: false, error: "주간 리포트 생성 중 오류가 발생했습니다" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "cron/weekly-report" })
}
