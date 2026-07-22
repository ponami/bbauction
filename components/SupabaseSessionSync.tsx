"use client"

// Supabase 세션을 localStorage → cookie로 자동 마이그레이션
// @supabase/ssr 전환 전 로그인한 사용자를 위한 일회성 처리
import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function SupabaseSessionSync() {
  useEffect(() => {
    async function migrateSession() {
      // 1) 이미 쿠키 기반 세션이 있으면 스킵
      const { data: { session: cookieSession } } = await supabase.auth.getSession()
      if (cookieSession) return

      // 2) localStorage에서 구 Supabase 세션 찾기 (sb-<ref>-auth-token)
      const oldKey = Object.keys(localStorage).find(k => k.endsWith("-auth-token"))
      if (!oldKey) return

      try {
        const raw = localStorage.getItem(oldKey)
        if (!raw) return
        const parsed = JSON.parse(raw)
        const access_token: string = parsed.access_token
        const refresh_token: string = parsed.refresh_token
        if (!access_token || !refresh_token) return

        // 3) 세션 복원 → createBrowserClient가 자동으로 쿠키에 저장
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (!error) {
          console.log("[SessionSync] localStorage 세션 → cookie 마이그레이션 완료")
          // 구 localStorage 항목 정리
          localStorage.removeItem(oldKey)
        }
      } catch {
        // 파싱 실패는 무시
      }
    }
    migrateSession()
  }, [])

  return null
}
