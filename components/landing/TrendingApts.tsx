"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import ShareButton from "@/components/ShareButton"
import { prefetchDashboard } from "@/lib/prefetch"

const TRENDING_APTS = [
  {
    rank: 1,
    aptName: "은마아파트",
    address: "서울특별시 강남구 대치동",
    lawdCd: "11680",
    area: "84.43",
    recentPrice: 27000,
    changeRate: +8.2,
    reason: "재건축 추진위 설립인가",
    tag: "🔥 재건축",
  },
  {
    rank: 2,
    aptName: "헬리오시티",
    address: "서울특별시 송파구 가락동",
    lawdCd: "11710",
    area: "84.97",
    recentPrice: 23500,
    changeRate: +5.1,
    reason: "대단지 프리미엄·거래량 급증",
    tag: "📈 거래급증",
  },
  {
    rank: 3,
    aptName: "아크로서울포레스트",
    address: "서울특별시 성동구 성수동2가",
    lawdCd: "11200",
    area: "84.97",
    recentPrice: 42000,
    changeRate: +4.3,
    reason: "성수 개발 호재·신고가 경신",
    tag: "✨ 신고가",
  },
  {
    rank: 4,
    aptName: "래미안슈르",
    address: "경기도 과천시 원문동",
    lawdCd: "41290",
    area: "84.83",
    recentPrice: 19800,
    changeRate: +6.7,
    reason: "과천 지식정보타운 개발 진행",
    tag: "🏗 개발호재",
  },
  {
    rank: 5,
    aptName: "마포래미안푸르지오",
    address: "서울특별시 마포구 아현동",
    lawdCd: "11440",
    area: "84.96",
    recentPrice: 18500,
    changeRate: +3.8,
    reason: "신촌·홍대 역세권 수요 꾸준",
    tag: "🚇 역세권",
  },
  {
    rank: 6,
    aptName: "힐스테이트레이크송도",
    address: "인천광역시 연수구 송도동",
    lawdCd: "28185",
    area: "84.99",
    recentPrice: 8900,
    changeRate: +9.4,
    reason: "송도국제도시 바이오클러스터 호재",
    tag: "🌊 인천 핫",
  },
  {
    rank: 7,
    aptName: "미사강변센트럴자이",
    address: "경기도 하남시 망월동",
    lawdCd: "41450",
    area: "84.99",
    recentPrice: 11200,
    changeRate: +4.1,
    reason: "5호선 연장 확정·강동 접근성",
    tag: "📋 교통호재",
  },
]

export default function TrendingApts() {
  const router = useRouter()
  const trendingRef    = useRef<HTMLDivElement>(null)
  const trendingAnimRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const el = trendingRef.current
    if (!el) return
    const CARD_WIDTH = 292

    const startRolling = () => {
      if (trendingAnimRef.current) clearInterval(trendingAnimRef.current)
      trendingAnimRef.current = setInterval(() => {
        if (!trendingRef.current) return
        const { scrollLeft, scrollWidth, clientWidth } = trendingRef.current
        const atEnd = scrollLeft + clientWidth >= scrollWidth - 4
        trendingRef.current.scrollTo({
          left: atEnd ? 0 : scrollLeft + CARD_WIDTH,
          behavior: "smooth",
        })
      }, 3000)
    }
    const stopRolling = () => {
      if (trendingAnimRef.current) clearInterval(trendingAnimRef.current)
    }

    startRolling()
    el.addEventListener("mouseenter", stopRolling)
    el.addEventListener("mouseleave", startRolling)

    let touchStartX = 0
    let touchStartScroll = 0
    let isSwiping = false

    const onTouchStart = (e: TouchEvent) => {
      stopRolling()
      touchStartX = e.touches[0].clientX
      touchStartScroll = el.scrollLeft
      isSwiping = true
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return
      const dx = touchStartX - e.touches[0].clientX
      el.scrollLeft = touchStartScroll + dx
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!isSwiping) return
      isSwiping = false
      const snapped = Math.round(el.scrollLeft / CARD_WIDTH) * CARD_WIDTH
      el.scrollTo({ left: snapped, behavior: "smooth" })
      setTimeout(startRolling, 1500)
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: true })
    el.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      stopRolling()
      el.removeEventListener("mouseenter", stopRolling)
      el.removeEventListener("mouseleave", startRolling)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  const handleTrendingClick = (apt: typeof TRENDING_APTS[0]) => {
    prefetchDashboard(apt.address, apt.aptName, apt.lawdCd)
    const params = new URLSearchParams({
      address: apt.address,
      apt: apt.aptName,
      lawdCd: apt.lawdCd,
      area: apt.area,
    })
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <section style={{ background: "#FFFFFF", padding: "48px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ padding: "0 20px", marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
              전국 인기 아파트 TOP 7
            </h2>
            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
              최근 3개월 거래량 기준 · 클릭하면 리스크 분석
            </p>
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>기준: 2026.03</span>
        </div>

        <div
          ref={trendingRef}
          className="nb-scroll"
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            padding: "0 20px 4px",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style>{`
            .nb-scroll::-webkit-scrollbar { display: none; }
            @media (min-width: 768px) {
              .trending-row {
                display: grid !important;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                overflow-x: unset !important;
              }
            }
          `}</style>
          {TRENDING_APTS.map(apt => (
            <button
              key={apt.rank}
              onClick={() => handleTrendingClick(apt)}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: 16,
                textAlign: "left",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                minWidth: 260,
                flexShrink: 0,
                width: 280,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.09)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 9999,
                  background: "#F0FDF4",
                  color: "#16A34A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {apt.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {apt.aptName}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {apt.address}
                  </div>
                </div>
                <span style={{
                  background: apt.changeRate > 0 ? "#FEE2E2" : "#DBEAFE",
                  color: apt.changeRate > 0 ? "#DC2626" : "#2563EB",
                  fontSize: 12, fontWeight: 700,
                  padding: "3px 8px", borderRadius: 9999, flexShrink: 0,
                }}>
                  +{apt.changeRate}%
                </span>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{apt.area}㎡ 최근 실거래가</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginTop: 2 }}>
                  {apt.recentPrice.toLocaleString("ko-KR")}만원
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  background: "#F0FDF4",
                  color: "#16A34A",
                  fontSize: 11, fontWeight: 600,
                  padding: "3px 8px", borderRadius: 9999,
                }}>
                  {apt.tag}
                </span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{apt.reason.slice(0, 14)}{apt.reason.length > 14 ? "…" : ""}</span>
              </div>
              <div style={{ marginTop: 10, borderTop: "1px solid #F3F4F6", paddingTop: 10 }}
                onClick={e => e.stopPropagation()}>
                <ShareButton aptName={apt.aptName} address={apt.address} size="sm"
                  style={{ width: "100%", justifyContent: "center" }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
