// GET /api/auth/me — 현재 로그인 사용자 정보 (Supabase + NextAuth 통합)
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/getSessionUser"
import { resolveUserEntitlements } from "@/lib/entitlements"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })
  const entitlements = await resolveUserEntitlements(user.id)
  return NextResponse.json({ id: user.id, email: user.email, name: user.name ?? null, plan: user.plan, entitlements })
}
