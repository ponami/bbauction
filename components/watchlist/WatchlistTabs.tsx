"use client"

import { useState } from "react"
import type { FavoriteApt } from "@/lib/types"
import DecisionStatusBadge from "./DecisionStatusBadge"

// ─── 카테고리 상수 ───────────────────────────────────
export const CATEGORIES = [
  { key: "all",         label: "전체" },
  { key: "trade_up",    label: "갈아타기 후보" },
  { key: "gap_investment", label: "갭투자 후보" },
  { key: "general",     label: "기타" },
] as const

export type WatchlistCategory = (typeof CATEGORIES)[number]["key"]

// ─── 가격 포매터 ─────────────────────────────────────
function fmt(price: number): string {
  if (price >= 10000) {
    const 억 = Math.floor(price / 10000)
    const 천 = price % 10000
    if (천 === 0) return `${억}억`
    if (천 < 1000) return `${억}억 ${천}만`
    return `${억}억 ${Math.floor(천 / 1000)}천만`
  }
  if (price >= 1000) return `${Math.floor(price / 1000)}천만`
  return `${price}만`
}

const DEAL_COLORS: Record<string, string> = {
  매매: "#1B4FBB",
  전세: "#2E7D32",
  월세: "#E65100",
}

const CATEGORY_LABELS: Record<string, string> = {
  trade_up: "갈아타기",
  gap_investment: "갭투자",
  general: "기타",
}

function Badge({ type }: { type: string }) {
  const bg = DEAL_COLORS[type] ?? "#666"
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px", borderRadius: 4,
      background: bg + "18", border: `1px solid ${bg}40`,
      color: bg, fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {type}
    </span>
  )
}

// ─── 즐겨찾기 카드 ────────────────────────────────────
function FavCard({
  fav,
  onDelete,
  onStatusChange,
}: {
  fav: FavoriteApt
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string, reason: string) => void
}) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 12,
      border: `1.5px solid ${fav.color}30`,
      background: fav.color + "08",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* 아이콘 */}
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: fav.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>🏠</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 아파트명 + 카테고리 태그 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A2B4A" }}>
              {fav.aptName}
            </span>
            {fav.category && fav.category !== "general" && (
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                background: fav.category === "trade_up" ? "#DBEAFE" : "#FEF3C7",
                color: fav.category === "trade_up" ? "#1D4ED8" : "#92400E",
                fontWeight: 600,
              }}>
                {CATEGORY_LABELS[fav.category] ?? fav.category}
              </span>
            )}
          </div>

          <div style={{ fontSize: 11, color: "#8FA8D0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fav.address || "주소 미입력"}
          </div>

          {/* 거래 유형 뱃지 */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {fav.dealTypes.map(t => <Badge key={t} type={t} />)}
            {fav.areaFilter && fav.areaFilter.length > 0 && (
              <span style={{ fontSize: 11, color: "#8FA8D0" }}>
                {fav.areaFilter.map(a => `${a}m²`).join(" · ")}
              </span>
            )}
          </div>

          {/* 결정 상태 */}
          <DecisionStatusBadge
            favoriteId={fav.id}
            currentStatus={fav.decisionStatus ?? "watching"}
            currentReason={fav.decisionReason ?? ""}
            onStatusChange={(status, reason) => onStatusChange(fav.id, status, reason)}
          />
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={() => onDelete(fav.id)}
          style={{
            width: 28, height: 28, borderRadius: 7,
            background: "#FEE2E2", border: "none",
            color: "#C62828", fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
          title="삭제"
        >✕</button>
      </div>
    </div>
  )
}

// ─── 메인 워치리스트 컴포넌트 ──────────────────────────
export default function WatchlistTabs({
  favorites,
  onDelete,
  onRefresh,
}: {
  favorites: FavoriteApt[]
  onDelete: (id: string) => void
  onRefresh: () => void
}) {
  const [activeCategory, setActiveCategory] = useState<WatchlistCategory>("all")

  // 카테고리별 개수
  const counts = CATEGORIES.reduce(
    (acc, cat) => {
      if (cat.key === "all") {
        acc.all = favorites.length
      } else {
        acc[cat.key] = favorites.filter(f => f.category === cat.key).length
      }
      return acc
    },
    {} as Record<string, number>,
  )

  // 필터링
  const filtered = activeCategory === "all"
    ? favorites
    : favorites.filter(f => f.category === activeCategory)

  async function handleStatusChange(id: string, status: string, reason: string) {
    try {
      await fetch(`/api/favorites?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionStatus: status, decisionReason: reason }),
      })
      onRefresh()
    } catch {
      // 무시
    }
  }

  return (
    <div>
      {/* 카테고리 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              padding: "6px 12px", borderRadius: 8, border: "none",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: activeCategory === cat.key ? "#0A2463" : "#E8EDF5",
              color: activeCategory === cat.key ? "#fff" : "#4A5568",
              transition: "all .2s",
            }}
          >
            {cat.label}
            <span style={{
              marginLeft: 4, opacity: 0.7, fontSize: 11,
            }}>
              ({counts[cat.key] ?? 0})
            </span>
          </button>
        ))}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            {activeCategory === "all" ? "🏠" : "📋"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B4A", marginBottom: 7 }}>
            {activeCategory === "all"
              ? "등록된 즐겨찾기가 없어요"
              : "이 카테고리에 등록된 아파트가 없어요"}
          </div>
          <div style={{ fontSize: 12, color: "#8FA8D0", lineHeight: 1.8 }}>
            {activeCategory === "all"
              ? "+ 추가 탭에서 감시할 아파트를 등록하세요"
              : "즐겨찾기 추가 시 카테고리를 선택하거나, 기존 즐겨찾기를 수정하세요"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(f => (
            <FavCard
              key={f.id}
              fav={f}
              onDelete={onDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
