// @supabase/ssr의 createBrowserClient를 사용 → 세션이 쿠키에 저장됨 (서버에서 읽기 가능)
import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
export default supabase
