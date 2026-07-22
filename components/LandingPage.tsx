"use client"

import Link from "next/link"
import AptCompare from "./AptCompare"
import SearchForm from "./landing/SearchForm"
import TrendingApts from "./landing/TrendingApts"
import NeighborhoodSearch from "./landing/NeighborhoodSearch"
import { AGENT_PLANS, CONSUMER_PRODUCTS, FREE_PAID_BOUNDARY } from "@/lib/pricingCopy"

export default function LandingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F4F6F9",
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
      color: "#111827",
    }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        input:focus { outline: none; }
        select:focus { outline: none; }
        button { font-family: inherit; }
        .nb-scroll::-webkit-scrollbar { display: none; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp .35s ease; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }
        .pulse { animation: pulse 1.2s infinite; }
      `}</style>

      {/* ── GNB ── */}
      <header style={{
        height: 64,
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 20px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0, lineHeight: 0 }}>
            <img src="/logo.png" alt="오를지" style={{ width: 44, height: 44, objectFit: "contain", display: "block" }} />
          </Link>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link
              href="/mypage"
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "8px 16px",
                borderRadius: 8,
                background: "transparent",
                color: "#16A34A",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid #16A34A",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              마이페이지
            </Link>
            <Link
              href="/login"
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "8px 16px",
                borderRadius: 8,
                background: "#16A34A",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      <SearchForm />

      <section style={{ background: "#FFFFFF", padding: "28px 20px 40px", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{
              display: "inline-block",
              background: "#F0FDF4",
              color: "#15803D",
              borderRadius: 9999,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
            }}>상품 구조</span>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 8 }}>
              무료는 후보를 찾고, 유료는 결정을 돕습니다
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>
              {FREE_PAID_BOUNDARY.free} · {FREE_PAID_BOUNDARY.paid}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
            {CONSUMER_PRODUCTS.map((product) => (
              <div key={product.id} style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 16, padding: "18px 16px" }}>
                <div style={{ display: "inline-flex", marginBottom: 10, padding: "4px 10px", borderRadius: 9999, background: product.badge === "지금 이용 가능" ? "#DCFCE7" : "#E0E7FF", color: product.badge === "지금 이용 가능" ? "#166534" : "#4338CA", fontSize: 11, fontWeight: 700 }}>
                  {product.badge}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{product.title}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#16A34A", marginBottom: 8 }}>{product.price}</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{product.summary}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#0F172A", borderRadius: 18, padding: "20px 18px", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#60A5FA", marginBottom: 6 }}>중개사 도입 문의</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>Android 앱에서는 단건 리포트만 판매. 중개사 플랜은 별도 문의</div>
              </div>
              <a href="/pro" style={{ display: "inline-flex", alignItems: "center", padding: "10px 16px", borderRadius: 12, background: "#FFD700", color: "#0F172A", fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>
                중개사 문의 안내 →
              </a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {AGENT_PLANS.map((plan) => (
                <div key={plan.id} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: plan.id === "pro" ? "#FDE68A" : "#93C5FD", marginBottom: 6 }}>{plan.badge}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{plan.title}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#FFD700", marginBottom: 8 }}>{plan.price}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>{plan.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AptCompare Section ── */}
      <section id="compare" style={{ background: "#FFFFFF", padding: "56px 0 48px", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ marginBottom: 8, textAlign: "center" }}>
            <span style={{
              display: "inline-block",
              background: "#EFF6FF", color: "#1D4ED8",
              borderRadius: 9999, padding: "4px 12px",
              fontSize: 12, fontWeight: 600, marginBottom: 12,
            }}>비교로 결정하세요</span>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
              A가 더 위험한가요, B가 더 위험한가요?
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280" }}>
              무료로는 후보를 붙여 보고, 유료 비교팩에서는 결론까지 이어서 확인하세요
            </p>
          </div>
          <div style={{
            background: "#F9FAFB",
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            border: "1px solid #E5E7EB",
            maxWidth: 960,
            margin: "24px auto 0",
            overflow: "hidden",
          }}>
            <AptCompare />
          </div>
        </div>
      </section>

      <TrendingApts />
      <NeighborhoodSearch />

      {/* ── Footer ── */}
      <footer style={{ background: "#111827", padding: "32px 20px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <img src="/logo.png" alt="오를지" style={{ width: 40, height: 40, objectFit: "contain", opacity: 0.9 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>오를지 AI</span>
          </div>
          <p style={{
            fontSize: 11,
            color: "#6B7280",
            lineHeight: 1.6,
            marginTop: 8,
            maxWidth: 600,
          }}>
            본 서비스의 분석 결과는 참고용이며 투자 판단의 최종 책임은 이용자에게 있습니다.
            부동산 거래 시 반드시 전문가와 상담하시기 바랍니다.
          </p>
          <p style={{ fontSize: 12, color: "#4B5563", marginTop: 16 }}>
            © {new Date().getFullYear()} 오를지 AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
