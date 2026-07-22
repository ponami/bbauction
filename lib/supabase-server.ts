// 서버 사이드 Supabase 클라이언트 (Next.js App Router cookies() 사용)
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 미설정")

  return createServerClient(url, key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch (e) {
            console.error("[supabase-server] setAll 오류 (Server Component는 무시):", e)
          }
        },
      },
    }
  )
}
