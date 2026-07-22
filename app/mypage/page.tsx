"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import LeadDetail from "@/components/agent/LeadDetail"
import LeadList from "@/components/agent/LeadList"
import { supabase } from "@/lib/supabaseClient"
import AgentProfileForm from "@/components/agent/AgentProfileForm"
import FunnelSummary from "@/components/admin/FunnelSummary"
import AptSearchInput, { type AptSelection } from "@/components/AptSearchInput"
import AccountDangerZone from "@/components/mypage/AccountDangerZone"
import SubscriptionManagementCard from "@/components/mypage/SubscriptionManagementCard"
import { readAgentMode, saveAgentMode, type AgentModeState } from "@/lib/agentMode"
import { trackAnalyticsEvent } from "@/lib/analytics"
import { triggerPayment } from "@/lib/payment"
import { canSellOnlineOnAndroid } from "@/lib/billing/guards"
import ReferralBanner from "@/components/referral/ReferralBanner"
import type { LeadSummary } from "@/lib/leads"

type Tab = "home" | "property" | "favorites" | "notifications" | "clients"

type Favorite = {
  id: string
  aptName: string
  address: string
  lawdCd: string
  color: string
  createdAt: string
}

type SubscriptionInfo = {
  status: string
  startAt: string
  endAt: string
  billingProvider: "web" | "google_play" | null
}

export default function MyPage() {
  const router = useRouter()
  const [user, setUser]     = useState<{ email: string; name?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState<Tab>("home")

  // 내 아파트
  const [aptSelection, setAptSelection] = useState<AptSelection | null>(null)
  const [purchasePrice, setPurchasePrice] = useState("")
  const [interiorCost, setInteriorCost]   = useState("")
  const [hasProperty, setHasProperty] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  // 즐겨찾기
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [leads, setLeads] = useState<LeadSummary[]>([])
  const [leadLoading, setLeadLoading] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // 알림 설정
  const [notifGranted, setNotifGranted] = useState(false)
  const [notifTrades, setNotifTrades]   = useState(true)
  const [notifScore, setNotifScore]     = useState(true)
  const [notifPresale, setNotifPresale] = useState(true)
  const [threshold, setThreshold]       = useState(5)

  // 구독 상태
  const [plan, setPlan] = useState("free")
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)

  // 중개사 팀
  const [agencyTeam, setAgencyTeam]       = useState<any>(null)
  const [agencyRole, setAgencyRole]       = useState<"owner" | "member" | null>(null)
  const [inviteEmail, setInviteEmail]     = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg]         = useState("")

  // 중개사 프로필 (공유 페이지 표시용)
  const [agentMode, setAgentMode] = useState<AgentModeState>(() => readAgentMode())
  const [profileSaved, setProfileSaved] = useState(false)

  // 결제
  const [payLoading, setPayLoading] = useState<"once" | null>(null)
  const [payError, setPayError]     = useState("")

  // ── 초기화 ──────────────────────────────────────────────
  useEffect(() => {
    if ("Notification" in window) setNotifGranted(Notification.permission === "granted")
    setNotifTrades(localStorage.getItem("notif_enabled_trades") !== "false")
    setNotifScore(localStorage.getItem("notif_enabled_score") !== "false")
    setNotifPresale(localStorage.getItem("notif_enabled_presale") !== "false")
    setThreshold(parseInt(localStorage.getItem("default_score_threshold") || "5"))

    async function loadServerData(email: string, name?: string, role?: string) {
      setUser({ email, name, role })
      try {
        const res = await fetch("/api/my-property")
        if (res.ok) {
          const d = await res.json()
          if (d.aptName) {
            setAptSelection({
              aptId: d.gateAptId ?? 0,
              aptName: d.aptName,
              address: d.address || "",
              lawdCd: d.lawdCd || "",
              pyeong: d.pyeong ?? undefined,
              dong: d.dong ?? undefined,
            })
          }
          setPurchasePrice(d.purchasePrice ? String(d.purchasePrice) : "")
          setInteriorCost(d.interiorCost ? String(d.interiorCost) : "")
          setHasProperty(!!(d.address && d.aptName))
        }
      } catch {}
      try {
        const ps = await fetch("/api/payments/status")
        if (ps.ok) {
          const d = await ps.json()
          setPlan(d.plan || "free")
          setSubscriptionInfo(d.subscription || null)
        }
      } catch {}
      try {
        const ag = await fetch("/api/agency")
        if (ag.ok) {
          const d = await ag.json()
          setAgencyRole(d.role)
          setAgencyTeam(d.team)
        }
      } catch {}
      setLoading(false)
    }

    // onAuthStateChange를 primary 트리거로 사용
    // INITIAL_SESSION / SIGNED_IN 이벤트 발생 시점엔 쿠키가 이미 설정됨
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { router.push("/login"); return }
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        void loadServerData(
          session.user.email ?? "",
          session.user.user_metadata?.full_name as string | undefined,
          session.user.user_metadata?.role as string | undefined,
        )
      }
    })

    // 세션이 없는 경우 처리 (타임아웃 후 로그인 페이지로)
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) router.push("/login")
      })
    }, 3000)

    return () => subscription.unsubscribe()
  }, [router])

  // ── 즐겨찾기 로드 ────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    setFavLoading(true)
    try {
      const res = await fetch("/api/favorites")
      if (res.ok) {
        const d = await res.json()
        setFavorites(d.data || [])
      }
    } catch {}
    setFavLoading(false)
  }, [])

  useEffect(() => {
    if (tab === "favorites") loadFavorites()
  }, [tab, loadFavorites])

  const loadLeads = useCallback(async () => {
    setLeadLoading(true)
    try {
      const res = await fetch("/api/leads")
      if (res.ok) {
        const json = await res.json()
        const nextLeads = (json.data || []) as LeadSummary[]
        setLeads(nextLeads)
        setSelectedLeadId((prev) => prev && nextLeads.some((lead) => lead.id === prev) ? prev : nextLeads[0]?.id ?? null)
      }
    } catch {}
    setLeadLoading(false)
  }, [])

  useEffect(() => {
    if (tab === "clients") loadLeads()
  }, [tab, loadLeads])

  useEffect(() => {
    if ((user?.role === "agent" || plan === "agency") && leads.length === 0) {
      void loadLeads()
    }
  }, [user?.role, plan, leads.length, loadLeads])

  // ── 즐겨찾기 삭제 ────────────────────────────────────────
  async function deleteFavorite(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/favorites?id=${id}`, { method: "DELETE" })
      setFavorites(prev => prev.filter(f => f.id !== id))
    } catch {}
    setDeletingId(null)
  }

  // ── 내 아파트 저장 ───────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!aptSelection) return
    setSaving(true)
    localStorage.setItem("my_address", aptSelection.address)
    localStorage.setItem("my_apt_name", aptSelection.aptName)
    localStorage.setItem("my_lawdcd", aptSelection.lawdCd)
    localStorage.setItem("my_purchase_price", purchasePrice)
    localStorage.setItem("my_interior_cost", interiorCost)
    await fetch("/api/my-property", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: aptSelection.address,
        aptName: aptSelection.aptName,
        lawdCd: aptSelection.lawdCd,
        gateAptId: aptSelection.aptId || null,
        pyeong: aptSelection.pyeong || null,
        dong: aptSelection.dong || null,
        purchasePrice,
        interiorCost,
      }),
    }).catch(() => {})
    setSaving(false); setSaved(true)
    setHasProperty(true)
    setTimeout(() => { setSaved(false); setTab("home") }, 1200)
  }

  // ── 결제 ────────────────────────────────────────────────────
  async function handlePayment() {
    setPayLoading("once")
    setPayError("")
    const sku = "single-report"
    try {
      if (!aptSelection?.aptName) {
        throw new Error("단건 리포트는 먼저 내 아파트를 등록해야 결제할 수 있습니다")
      }

      // Play Store 등록(Google Play Billing) 방어
      // Android에서는 consumer "once" (단건 리포트) 상품만 판매.
      // guards.ts (payment.ts + API)에서 중앙 차단. 여기서는 명시적 주석 + 타입 고정으로 방어.
      // (mypage의 이 흐름은 항상 "once"이므로 통과. agency 등은 호출되지 않음)

      void trackAnalyticsEvent({
        eventType: "product_select",
        funnel: "consumer",
        source: "mypage",
        sku,
        aptId: aptSelection?.aptId,
        aptName: aptSelection?.aptName,
      })

      await triggerPayment({
        sku,
        type: "once",
        aptId: aptSelection?.aptId,
        aptName: aptSelection?.aptName,
        lawdCd: aptSelection?.lawdCd,
      })

      void trackAnalyticsEvent({
        eventType: "payment_complete",
        funnel: "consumer",
        source: "mypage",
        sku,
        aptId: aptSelection?.aptId,
        aptName: aptSelection?.aptName,
      })

      // 결제 성공 → 플랜 갱신
      const ps = await fetch("/api/payments/status")
      if (ps.ok) {
        const d = await ps.json()
        setPlan(d.plan || "free")
        setSubscriptionInfo(d.subscription || null)
      }
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : "결제 중 오류가 발생했습니다")
    } finally {
      setPayLoading(null)
    }
  }

  async function handleDeletedAccount() {
    localStorage.removeItem("my_address")
    localStorage.removeItem("my_apt_name")
    localStorage.removeItem("my_lawdcd")
    localStorage.removeItem("my_purchase_price")
    localStorage.removeItem("my_interior_cost")

    await supabase.auth.signOut().catch(() => {})
    router.replace("/login")
  }

  async function handleManageSubscription(target: "subscription" | "agency") {
    const response = await fetch("/api/payments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || "구독 관리 요청에 실패했습니다")
    }

    if (data.subscription) {
      setSubscriptionInfo(data.subscription)
    }

    if (data.agencyTeam) {
      setAgencyTeam((prev: any) => prev ? { ...prev, ...data.agencyTeam } : data.agencyTeam)
    }

    if (data.managementUrl) {
      window.open(data.managementUrl, "_blank", "noopener,noreferrer")
    }
  }

  // ── 로딩 ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "#6B7280" }}>불러오는 중...</div>
    </div>
  )

  const TAB_ITEMS: { key: Tab; icon: string; label: string }[] = [
    { key: "home",          icon: "🏠", label: "홈" },
    { key: "property",      icon: "📝", label: "내 아파트" },
    ...((user?.role === "agent" || plan === "agency") ? [{ key: "clients" as Tab, icon: "👥", label: "고객" }] : []),
    { key: "favorites",     icon: "⭐", label: "즐겨찾기" },
    { key: "notifications", icon: "🔔", label: "알림" },
  ]
  const isAgentUser = user?.role === "agent" || plan === "agency"
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard', sans-serif" }}>

      {/* 헤더 */}
      <header style={{ height: 56, background: "#fff", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <Link href="/map" style={{ textDecoration: "none" }}>
          <img src="/logo.png" alt="오를지" style={{ height: 32, objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#6B7280" }}>{user?.name || user?.email?.split("@")[0]}</span>
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
            style={{ fontSize: 12, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>
            로그아웃
          </button>
        </div>
      </header>

      {/* 탭 바 */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex" }}>
        {TAB_ITEMS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "12px 4px", border: "none", background: "none", cursor: "pointer",
            borderBottom: tab === t.key ? "2px solid #16A34A" : "2px solid transparent",
            color: tab === t.key ? "#16A34A" : "#9CA3AF",
            fontSize: 11, fontWeight: tab === t.key ? 700 : 500,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 100px" }}>

        {/* ── 홈 탭 ─────────────────────────────────────── */}
        {tab === "home" && (
          <>
            {/* 프로필 카드 */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{user?.name || user?.email?.split("@")[0]}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
              </div>
              <div style={{
                background: plan === "agency" ? "#1E3A5F" : plan === "subscription" ? "#FEF3C7" : "#F3F4F6",
                color: plan === "agency" ? "#FFD700" : plan === "subscription" ? "#B45309" : "#6B7280",
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, flexShrink: 0,
              }}>
                {plan === "agency" ? "레거시 중개사" : plan === "subscription" ? "레거시 구독" : "무료"}
              </div>
            </div>

            {/* 역할 선택 (OAuth 등 role 없는 유저) */}
            {user && !user.role && !loading && (
              <div style={{ background: "#EFF6FF", borderRadius: 16, border: "1px solid #BFDBFE", padding: "18px 20px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1E40AF", marginBottom: 4 }}>🏷️ 사용 유형을 선택해주세요</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12, lineHeight: 1.6 }}>
                  맞춤 기능을 제공하기 위해 필요합니다. 언제든 변경할 수 있습니다.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => {
                    await supabase.auth.updateUser({ data: { role: "regular" } })
                    setUser(u => u ? { ...u, role: "regular" } : u)
                  }} style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #93C5FD",
                    background: "#FFFFFF", fontSize: 13, fontWeight: 700, color: "#1E40AF", cursor: "pointer",
                  }}>
                    😊 일반 사용자
                  </button>
                  <button onClick={async () => {
                    await supabase.auth.updateUser({ data: { role: "agent" } })
                    setUser(u => u ? { ...u, role: "agent" } : u)
                  }} style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #93C5FD",
                    background: "#FFFFFF", fontSize: 13, fontWeight: 700, color: "#1E40AF", cursor: "pointer",
                  }}>
                    🏢 공인중개사
                  </button>
                </div>
              </div>
            )}

            {/* 내 아파트 요약 */}
            <div style={{ background: hasProperty ? "linear-gradient(135deg,#16A34A,#15803D)" : "#fff", borderRadius: 16, border: hasProperty ? "none" : "1px solid #E5E7EB", padding: "20px", marginBottom: 14, color: hasProperty ? "#fff" : "#111827" }}>
              {hasProperty ? (
                <>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>내 아파트</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>{aptSelection?.aptName}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: aptSelection?.pyeong ? 4 : 12 }}>{aptSelection?.address}</div>
                  {aptSelection?.pyeong && (
                    <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 12 }}>
                      {aptSelection.pyeong}평{aptSelection.dong ? ` · ${aptSelection.dong}` : ""}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    {aptSelection?.lawdCd ? (
                      <Link href={`/dashboard?address=${encodeURIComponent(aptSelection?.address || "")}&apt=${encodeURIComponent(aptSelection?.aptName || "")}&lawdCd=${aptSelection.lawdCd}`}
                        style={{ flex: 1, padding: "9px", borderRadius: 10, background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                        AI 분석 보기
                      </Link>
                    ) : (
                      <button onClick={() => setTab("property")}
                        style={{ flex: 1, padding: "9px", borderRadius: 10, background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
                        아파트 등록하기
                      </button>
                    )}
                    <button onClick={() => setTab("property")} style={{ flex: 1, padding: "9px", borderRadius: 10, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
                      수정하기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>내 아파트를 등록해보세요</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>등록하면 AI가 매도 타이밍을 분석해드립니다</div>
                  <button onClick={() => setTab("property")} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "#16A34A", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    + 아파트 등록하기
                  </button>
                </>
              )}
            </div>

            {/* 빠른 메뉴 */}
            <div style={{ display: "grid", gridTemplateColumns: isAgentUser ? "repeat(3, 1fr)" : "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { icon: "⭐", label: "즐겨찾기", desc: `${favorites.length > 0 ? favorites.length + "개" : "관심 단지"}`, tab: "favorites" as Tab },
                { icon: "🔔", label: "알림 설정", desc: "알림 종류 선택", tab: "notifications" as Tab },
                ...(isAgentUser ? [{ icon: "👥", label: "고객 리드", desc: `${leads.length}명 관리`, tab: "clients" as Tab }] : []),
              ].map(m => (
                <button key={m.tab} onClick={() => setTab(m.tab)} style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "16px",
                  display: "flex", flexDirection: "column", gap: 6, cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.desc}</div>
                </button>
                ))}
            </div>

            {isAgentUser && <FunnelSummary />}

            {/* ── 추천 보상 ───────────────────────────────── */}
            <div style={{ marginBottom: 14 }}>
              <ReferralBanner />
            </div>

            {/* ── 플랜 관리 / 결제 ─────────────────────────── */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>💳 단건 결제</div>
              </div>

              {/* 현재 플랜 상태 */}
              <div style={{ padding: "12px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>현재 플랜</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginTop: 2 }}>
                    {plan === "agency" ? "레거시 중개사 플랜" : plan === "subscription" ? "레거시 개인 구독" : "무료"}
                  </div>
                </div>
                <div style={{
                  background: plan === "agency" ? "#1E3A5F" : plan === "subscription" ? "#FEF3C7" : "#F3F4F6",
                  color: plan === "agency" ? "#FFD700" : plan === "subscription" ? "#B45309" : "#6B7280",
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999,
                }}>
                  {plan === "agency" ? "레거시 중개사" : plan === "subscription" ? "레거시 구독" : "무료"}
                </div>
              </div>

              {/* 단건 분석 결제 */}
              <button onClick={() => handlePayment()} disabled={payLoading !== null} style={{
                width: "100%", padding: "14px 18px", border: "none", borderBottom: "1px solid #F3F4F6",
                background: "none", cursor: payLoading ? "not-allowed" : "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {payLoading === "once" ? "결제 진행 중..." : "📄 단건 분석"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>특정 아파트 1개 심층 분석 리포트</div>
                </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1B4FBB" }}>9,900원</div>
              </button>

              {/* 결제 에러 */}
              {payError && (
                <div style={{ padding: "8px 18px", background: "#FEF2F2", color: "#DC2626", fontSize: 12 }}>
                  {payError}
                </div>
              )}

              <div style={{ padding: "10px 18px", fontSize: 11, color: "#6B7280", borderBottom: "1px solid #F3F4F6", lineHeight: 1.7 }}>
                Android 앱에서는 <strong>단건 리포트 상품</strong>만 Google Play Billing으로 구매할 수 있습니다. (single-report, compare-pack, first-home-pack)<br />
                기존 구독 또는 중개사 플랜(Agent Solo/Pro/Office)은 레거시 관리만 가능합니다. (별도 문의: hello@orulzi.com)
              </div>

              {/* 이용약관 링크 */}
              <div style={{ padding: "10px 18px", fontSize: 11, color: "#9CA3AF" }}>
                결제 시{" "}
                <Link href="/terms" target="_blank" style={{ color: "#6366F1", textDecoration: "underline" }}>이용약관</Link>
                {" · "}
                <Link href="/privacy" target="_blank" style={{ color: "#6366F1", textDecoration: "underline" }}>개인정보처리방침</Link>
                에 동의합니다.
              </div>
            </div>

            <SubscriptionManagementCard
              plan={plan}
              subscription={subscriptionInfo}
              agencyRole={agencyRole}
              agency={agencyTeam ? {
                status: agencyTeam.status,
                endAt: agencyTeam.endAt,
                billingProvider: agencyTeam.billingProvider ?? null,
              } : null}
              onManage={handleManageSubscription}
            />

            {/* 중개사 팀 관리 (중개사 플랜 오너) */}
            {plan === "agency" && agencyRole === "owner" && agencyTeam && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "16px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 12 }}>
                  👥 팀 관리 ({agencyTeam.members?.length ?? 0}/4명)
                </div>

                {/* 팀원 목록 */}
                {(agencyTeam.members ?? []).map((m: any) => (
                  <div key={m.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0", borderBottom: "1px solid #F3F4F6", fontSize: 13,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{m.user.name || m.user.email.split("@")[0]}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.user.email}</div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(`${m.user.email}를 팀에서 제거할까요?`)) return
                        await fetch(`/api/agency?memberId=${m.id}`, { method: "DELETE" })
                        setAgencyTeam((prev: any) => ({
                          ...prev,
                          members: prev.members.filter((x: any) => x.id !== m.id),
                        }))
                      }}
                      style={{ background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}
                    >
                      제거
                    </button>
                  </div>
                ))}

                {/* 팀원 초대 */}
                {(agencyTeam.members?.length ?? 0) < 4 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>이메일로 팀원 초대</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="team@example.com"
                        style={{
                          flex: 1, padding: "9px 12px", borderRadius: 8,
                          border: "1px solid #E5E7EB", fontSize: 13, outline: "none",
                        }}
                      />
                      <button
                        disabled={inviteLoading || !inviteEmail}
                        onClick={async () => {
                          setInviteLoading(true)
                          setInviteMsg("")
                          const res = await fetch("/api/agency", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: inviteEmail }),
                          })
                          const d = await res.json()
                          if (res.ok) {
                            setInviteMsg("초대 완료!")
                            setInviteEmail("")
                            // 팀 새로고침
                            fetch("/api/agency").then(r => r.ok ? r.json() : null).then(d => {
                              if (d?.team) setAgencyTeam(d.team)
                            })
                          } else {
                            setInviteMsg(d.error || "실패")
                          }
                          setInviteLoading(false)
                        }}
                        style={{
                          padding: "9px 14px", borderRadius: 8, border: "none",
                          background: inviteLoading || !inviteEmail ? "#E5E7EB" : "#16A34A",
                          color: inviteLoading || !inviteEmail ? "#9CA3AF" : "#fff",
                          fontSize: 12, fontWeight: 700, cursor: inviteLoading || !inviteEmail ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inviteLoading ? "..." : "초대"}
                      </button>
                    </div>
                    {inviteMsg && (
                      <div style={{ fontSize: 11, marginTop: 6, color: inviteMsg === "초대 완료!" ? "#16A34A" : "#EF4444" }}>
                        {inviteMsg}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: 11, color: "#9CA3AF" }}>
                  구독 만료일: {agencyTeam.endAt ? new Date(agencyTeam.endAt).toLocaleDateString("ko-KR") : "-"}
                </div>
              </div>
            )}

            {/* 중개사 팀 소속 멤버 */}
            {plan === "agency" && agencyRole === "member" && agencyTeam && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "16px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 4 }}>👥 소속 팀</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  관리자: {agencyTeam.owner?.email}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                  구독 만료일: {agencyTeam.endAt ? new Date(agencyTeam.endAt).toLocaleDateString("ko-KR") : "-"}
                </div>
              </div>
            )}

            {/* 중개사 프로필 (공유 페이지 표시용) — 공인중개사 role 선택자 전용 */}
            {user?.role === "agent" && (
              <AgentProfileForm
                value={agentMode}
                saved={profileSaved}
                onChange={(next) => {
                  setAgentMode(next)
                  setProfileSaved(false)
                }}
                onSave={() => {
                  saveAgentMode(agentMode)
                  setProfileSaved(true)
                  setTimeout(() => setProfileSaved(false), 2000)
                }}
              />
            )}

            {user && (
              <AccountDangerZone
                userEmail={user.email}
                disabled={loading}
                onDeleted={handleDeletedAccount}
              />
            )}
          </>
        )}

        {/* ── 내 아파트 탭 ──────────────────────────────── */}
        {tab === "property" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                {hasProperty ? "🏠 내 아파트 수정" : "🏠 내 아파트 등록"}
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>
                {hasProperty ? "정보 수정 후 저장하면 AI가 다시 분석합니다" : "주소와 단지명을 입력해주세요"}
              </div>
            </div>
            <form onSubmit={handleSave} style={{ padding: "20px" }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  아파트 검색 *
                </label>
                <AptSearchInput
                  value={aptSelection}
                  onChange={setAptSelection}
                  placeholder="아파트명 또는 주소 입력 (2글자 이상)"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>매수 금액 (만원)</label>
                  <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
                    placeholder="150000"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, background: "#F9FAFB", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>인테리어 비용 (만원)</label>
                  <input type="number" value={interiorCost} onChange={e => setInteriorCost(e.target.value)}
                    placeholder="5000"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, background: "#F9FAFB", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <button type="submit" disabled={saving || saved || !aptSelection} style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: saved ? "#DCFCE7" : (saving || !aptSelection) ? "#9CA3AF" : "#16A34A",
                color: saved ? "#15803D" : "#fff",
                fontSize: 15, fontWeight: 700, cursor: (saving || !aptSelection) ? "not-allowed" : "pointer",
              }}>
                {saved ? "✓ 저장 완료!" : saving ? "저장 중..." : hasProperty ? "수정 저장" : "저장하기"}
              </button>
            </form>
          </div>
        )}

        {/* ── 즐겨찾기 탭 ──────────────────────────────── */}
        {tab === "favorites" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>⭐ 즐겨찾기</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{favorites.length}개 {plan !== "subscription" && plan !== "agency" && "/ 최대 7개"}</div>
            </div>

            {favLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>불러오는 중...</div>
            ) : favorites.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>즐겨찾기가 없습니다</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>지도에서 마커를 클릭하고 ☆ 버튼을 눌러 추가하세요</div>
                <button onClick={() => router.push("/map")} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#16A34A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  지도로 이동
                </button>
              </div>
            ) : (
              <div>
                {favorites.map((fav, i) => (
                  <div key={fav.id} style={{
                    padding: "14px 20px",
                    borderBottom: i < favorites.length - 1 ? "1px solid #F3F4F6" : "none",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: fav.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav.aptName}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav.address}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Link href={`/dashboard?apt=${encodeURIComponent(fav.aptName)}&address=${encodeURIComponent(fav.address)}&lawdCd=${fav.lawdCd}`}
                        style={{ padding: "6px 12px", borderRadius: 8, background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        분석
                      </Link>
                      <button onClick={() => deleteFavorite(fav.id)} disabled={deletingId === fav.id}
                        style={{ padding: "6px 12px", borderRadius: 8, background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                        {deletingId === fav.id ? "..." : "삭제"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "clients" && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "16px 18px" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>👥 고객관리 미니 CRM</div>
              <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
                공유 링크를 보낸 고객의 최근 조회 단지, 공유 리포트, 비교 이력을 모아 보고 상태·메모·태그를 이어서 관리합니다.
              </div>
            </div>

            {leadLoading ? (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "40px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                고객 리드를 불러오는 중...
              </div>
            ) : (
              <>
                <LeadList leads={leads} selectedLeadId={selectedLeadId} onSelect={setSelectedLeadId} />
                <LeadDetail
                  lead={selectedLead}
                  onSave={async (payload) => {
                    const res = await fetch("/api/leads", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    })
                    if (!res.ok) return
                    const json = await res.json()
                    const updatedLead = json.data as LeadSummary
                    setLeads((prev) => prev.map((lead) => lead.id === updatedLead.id ? updatedLead : lead))
                    setSelectedLeadId(updatedLead.id)
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* ── 알림 탭 ───────────────────────────────────── */}
        {tab === "notifications" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>🔔 알림 설정</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>받고 싶은 알림만 선택하세요</div>
            </div>

            <div style={{ padding: "8px 0" }}>
              {[
                { key: "trades",  label: "실거래 감지",  desc: "즐겨찾기 단지에 실거래 발생 시 알림",  val: notifTrades,  set: setNotifTrades },
                { key: "score",   label: "점수 변동",    desc: "오를지 점수가 기준 이상 변동 시 알림", val: notifScore,   set: setNotifScore },
                { key: "presale", label: "청약 알림",    desc: "관심 지역 청약 소식 알림",             val: notifPresale, set: setNotifPresale },
              ].map(item => (
                <div key={item.key} style={{ padding: "14px 20px", borderBottom: "1px solid #F9FAFB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <button onClick={() => {
                    const next = !item.val
                    item.set(next)
                    localStorage.setItem(`notif_enabled_${item.key}`, String(next))
                  }} style={{
                    width: 50, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                    background: item.val ? "#16A34A" : "#D1D5DB",
                    position: "relative", transition: "background 0.2s", flexShrink: 0,
                  }}>
                    <div style={{
                      position: "absolute", top: 4, left: item.val ? 26 : 4,
                      width: 20, height: 20, borderRadius: "50%", background: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              ))}

              {/* 점수 변동 임계값 */}
              {notifScore && (
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #F9FAFB" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                    점수 변동 기준 <span style={{ color: "#16A34A" }}>±{threshold}점</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[3, 5, 10].map(v => (
                      <button key={v} onClick={() => { setThreshold(v); localStorage.setItem("default_score_threshold", String(v)) }}
                        style={{
                          flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
                          background: threshold === v ? "#16A34A" : "#F3F4F6",
                          color: threshold === v ? "#fff" : "#6B7280",
                          fontSize: 13, fontWeight: threshold === v ? 700 : 500,
                        }}>
                        ±{v}점
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 브라우저 푸시 권한 */}
              <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>브라우저 푸시 권한</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                    {notifGranted ? "허용됨 — 알림 수신 가능" : "알림을 받으려면 허용이 필요합니다"}
                  </div>
                </div>
                {notifGranted ? (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", flexShrink: 0 }}>✓ 허용됨</div>
                ) : (
                  <button onClick={async () => {
                    const p = await Notification.requestPermission()
                    setNotifGranted(p === "granted")
                  }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#DBEAFE", color: "#1D4ED8", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    허용하기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
