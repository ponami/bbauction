"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"regular" | "agent">("regular")
  const [licenseNum, setLicenseNum] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"login" | "signup">("login")
  const router = useRouter()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        // 중개사 선택 시 등록번호 필수
        if (role === "agent" && !licenseNum.trim()) {
          throw new Error("공인중개사는 부동산 중개업 등록번호를 입력해야 합니다")
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: role === "agent"
              ? { role, license_num: licenseNum.trim() }
              : { role },
          },
        })
        if (error) throw error
      }
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/dashboard` },
    })
  }

  async function handleKakao() {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${location.origin}/dashboard` },
    })
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard', sans-serif" }}>

      {/* GNB */}
      <header style={{ height: 64, background: "#FFFFFF", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", height: "100%", display: "flex", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", lineHeight: 0 }}>
            <img src="/logo.png" alt="오를지" style={{ width: 44, height: 44, objectFit: "contain", display: "block" }} />
          </Link>
        </div>
      </header>

      {/* 카드 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px" }}>
        <div style={{ width: "100%", maxWidth: 400, background: "#FFFFFF", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.09)", overflow: "hidden" }}>

          {/* 상단 헤더 */}
          <div style={{ background: "linear-gradient(135deg, #1B4FBB, #0A2463)", padding: "28px 32px 24px", textAlign: "center" }}>
            <img src="/logo.png" alt="오를지" style={{ width: 48, height: 48, objectFit: "contain", marginBottom: 10 }} />
            <h1 style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 800, margin: 0 }}>오를지AI</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              내 아파트, 지금 팔아야 할까요?
            </p>
            {/* 서비스 핵심 가치 3줄 */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14 }}>
              {[
                { icon: "🗺", text: "전국 아파트\n지도 분석" },
                { icon: "🤖", text: "ML+AI\n8개 지표" },
                { icon: "📊", text: "24개월\n매도 타이밍" },
              ].map(item => (
                <div key={item.text} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20 }}>{item.icon}</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, marginTop: 3, whiteSpace: "pre-line", lineHeight: 1.4 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "28px 32px 32px" }}>

            {/* 소셜 로그인 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <button onClick={handleGoogle} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "12px", borderRadius: 10,
                background: "#FFFFFF", border: "1px solid #E5E7EB",
                fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              }}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                Google로 계속하기
              </button>

              <button onClick={handleKakao} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "12px", borderRadius: 10,
                background: "#FEE500", border: "none",
                fontSize: 14, fontWeight: 700, color: "#191919", cursor: "pointer",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919"><path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.1 4 6.6l-1 3.6 4.2-2.8c.9.2 1.8.3 2.8.3 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/></svg>
                카카오로 계속하기
              </button>
            </div>

            {/* 구분선 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              <span style={{ fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap" }}>또는 이메일로</span>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            </div>

            {/* 이메일/비번 */}
            <form onSubmit={handleEmailAuth}>
              {error && (
                <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 16, border: "1px solid #FECACA" }}>
                  {error}
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>이메일</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 14, outline: "none", background: "#F9FAFB" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>비밀번호</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 14, outline: "none", background: "#F9FAFB" }} />
              </div>

              {mode === "signup" && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>가입 유형</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setRole("regular")}
                      style={{
                        flex: 1, padding: "10px", borderRadius: 10,
                        border: role === "regular" ? "2px solid #16A34A" : "1px solid #E5E7EB",
                        background: role === "regular" ? "#F0FDF4" : "#FFFFFF",
                        color: role === "regular" ? "#16A34A" : "#6B7280",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}>
                      😊 일반 사용자
                    </button>
                    <button type="button" onClick={() => { setRole("agent"); setLicenseNum("") }}
                      style={{
                        flex: 1, padding: "10px", borderRadius: 10,
                        border: role === "agent" ? "2px solid #1B4FBB" : "1px solid #E5E7EB",
                        background: role === "agent" ? "#EFF6FF" : "#FFFFFF",
                        color: role === "agent" ? "#1B4FBB" : "#6B7280",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}>
                      🏢 공인중개사
                    </button>
                  </div>
                  {role === "agent" && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                        부동산 중개업 등록번호
                      </label>
                      <input type="text" required value={licenseNum} onChange={e => setLicenseNum(e.target.value)}
                        placeholder="예: 서울특별시 제2023-00001호"
                        style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, outline: "none", background: "#F9FAFB", boxSizing: "border-box" }} />
                    </div>
                  )}
                </div>
              )}
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px", borderRadius: 10,
                background: loading ? "#9CA3AF" : "#16A34A", color: "#FFFFFF",
                fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer",
              }}>
                {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
              </button>
            </form>

            {/* 모드 전환 */}
            <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 16 }}>
              {mode === "login" ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
              <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setRole("regular"); setLicenseNum("") }}
                style={{ color: "#16A34A", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                {mode === "login" ? "회원가입" : "로그인"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

