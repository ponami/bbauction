// app/api/push/presale-regions/route.ts
// PUT /api/push/presale-regions — 청약 알림 관심 지역 저장

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"

async function getUserEmail(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    return user?.email ?? null
  } catch {
    return null
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userEmail = await getUserEmail(req)
    if (!userEmail) {
      return NextResponse.json({ success: false, error: "로그인 필요" }, { status: 401 })
    }

    const { regions } = await req.json()
    if (!Array.isArray(regions)) {
      return NextResponse.json({ success: false, error: "regions 배열 필요" }, { status: 400 })
    }

    const res = await fetch(`${GATE_URL}/push/presale-regions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email: userEmail, regions }),
    })
    if (!res.ok) throw new Error(`Gate 오류: ${res.status}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[push/presale-regions]", e)
    return NextResponse.json({ success: false, error: "관심 지역 저장 중 오류가 발생했습니다" }, { status: 500 })
  }
}
