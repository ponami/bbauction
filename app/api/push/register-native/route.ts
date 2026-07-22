// app/api/push/register-native/route.ts
// POST /api/push/register-native  — 네이티브 푸시(FCM/APNs) 토큰 등록
// DELETE /api/push/register-native — 네이티브 푸시 토큰 해제

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/getSessionUser"
import { resolveUserEntitlements } from "@/lib/entitlements"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
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

    const { device_token, platform } = await req.json()
    if (!device_token || !platform) {
      return NextResponse.json({ success: false, error: "device_token, platform 필수" }, { status: 400 })
    }

    const res = await fetch(`${GATE_URL}/push/register-native`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: user.email, device_token, platform }),
    })

    if (!res.ok) throw new Error(`Gate 오류: ${res.status}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[push/register-native]", e)
    return NextResponse.json({ success: false, error: "푸시 토큰 등록 중 오류가 발생했습니다" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다" }, { status: 401 })
    }

    const res = await fetch(`${GATE_URL}/push/register-native`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: user.email }),
    })

    if (!res.ok) throw new Error(`Gate 오류: ${res.status}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[push/register-native DELETE]", e)
    return NextResponse.json({ success: false, error: "푸시 토큰 해제 중 오류가 발생했습니다" }, { status: 500 })
  }
}
