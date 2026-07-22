"use client"

import Link from "next/link"
import AptCompare from "@/components/AptCompare"

export default function ComparePage() {
  return (
    <div style={{
      background: "#F4F6F9",
      minHeight: "100vh",
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
      color: "#111827",
    }}>
      {/* GNB */}
      <div style={{
        background: "#FFF", borderBottom: "1px solid #E5E7EB",
        position: "sticky", top: 0, zIndex: 100,
        padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="오를지" style={{ height: 36, objectFit: "contain" }} />
        </Link>
        <span style={{
          fontSize: 13, fontWeight: 700, color: "#16A34A",
          background: "#F0FDF4", padding: "4px 12px", borderRadius: 9999,
          border: "1px solid #DCFCE7",
        }}>⚖️ 1:1 매물 비교</span>
      </div>

      {/* Main Content */}
      <div style={{ paddingBottom: 64 }}>
        <AptCompare />
      </div>
    </div>
  )
}
