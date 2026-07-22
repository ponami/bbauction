// app/api/push/subscribe/route.ts
// POST /api/push/subscribe  — 브라우저 푸시 구독 등록
// DELETE /api/push/subscribe — 구독 해제
// GET  /api/push/subscribe  — VAPID 공개키 반환

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/getSessionUser"
import { resolveUserEntitlements } from "@/lib/entitlements"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()

    // 구독자(유료회원)만 웹푸시 알림 사용 가능
    if (!user) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다" }, { status: 401 })
    }
    const entitlements = await resolveUserEntitlements(user.id)
    if (!entitlements.features.canUsePushAlerts) {
      return NextResponse.json(
        { success: false, error: "푸시 알림은 유료 권한 전용 기능입니다", code: "SUBSCRIPTION_REQUIRED" },
        { status: 403 }
      )
    }

    const { endpoint, keys } = await req.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ success: false, error: "endpoint, keys 필수" }, { status: 400 })
    }

    const res = await fetch(`${GATE_URL}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: user.email, endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    })

    if (!res.ok) throw new Error(`Gate 오류: ${res.status}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[push/subscribe POST]", e)
    return NextResponse.json({ success: false, error: "구독 등록 중 오류가 발생했습니다" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    const res = await fetch(`${GATE_URL}/push/subscribe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    })
    if (!res.ok) throw new Error(`Gate 오류: ${res.status}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[push/subscribe DELETE]", e)
    return NextResponse.json({ success: false, error: "구독 해제 중 오류가 발생했습니다" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || "" })
}
