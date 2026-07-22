"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, Suspense } from "react"
import { supabase } from "@/lib/supabaseClient"

const C = {
  brand: "#0F9D6B",
  inkSoft: "#48586A",
  card: "#FFFFFF",
  line: "#E7E0D2",
}

const NAV_ITEMS = [
  { href: "/",              icon: "🏠", label: "홈" },
  { href: "/map",           icon: "🗺️", label: "지도" },
  { href: "/auction",       icon: "⚖️", label: "경매" },
  { href: "/auction?tab=wish", icon: "❤️", label: "관심" },
  { href: "/mypage",        icon: "👤", label: "마이" },
]

function NavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /** 현재 경로가 해당 탭과 일치하는지 (쿼리 파라미터 포함) */
  function isActive(item: { href: string }) {
    const [itemPath, itemQuery] = item.href.split("?")
    if (pathname !== itemPath) return false
    if (!itemQuery) return true
    // /auction?tab=wish → tab 파라미터 일치 여부
    const params = new URLSearchParams(itemQuery)
    for (const [k, v] of params.entries()) {
      if (searchParams.get(k) !== v) return false
    }
    return true
  }

  return (
    <>
      <div style={{ height: 64 }} />
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 64,
        background: C.card, borderTop: `1px solid ${C.line}`,
        display: "flex", alignItems: "stretch", zIndex: 1200,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.07)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item)
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              textDecoration: "none",
              color: active ? C.brand : C.inkSoft,
              transition: "color 0.15s",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
            }}>
              <span style={{ fontSize: 19, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>
                {item.label}
              </span>
              {active && (
                <div style={{
                  position: "absolute", bottom: 0, width: 28, height: 2,
                  background: C.brand, borderRadius: "2px 2px 0 0",
                }} />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  if (pathname === "/login") return null

  return (
    <Suspense fallback={<div style={{ height: 64 }} />}>
      <NavInner />
    </Suspense>
  )
}
