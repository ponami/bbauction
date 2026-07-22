// lib/getSessionUser.ts
// Supabase Auth (쿠키 기반, @supabase/ssr) 세션 헬퍼
// 모든 API 라우트에서 이걸 사용

import { prisma } from "./prisma"
import { createSupabaseServerClient } from "./supabase-server"

/** email로 Prisma User upsert (없으면 자동 생성) */
async function upsertUser(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, plan: "free" },
  })
}

/** Supabase 쿠키 기반 인증 사용자 반환. 미인증 시 null */
export async function getSessionUser() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      return upsertUser(user.email)
    }
  } catch (e) { console.error("[getSessionUser] Supabase 오류:", e) }

  return null
}
