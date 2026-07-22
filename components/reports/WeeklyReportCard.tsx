"use client"

import { useEffect, useState } from "react"
import type { WeeklyReport } from "@/lib/types"

const CATEGORY_LABELS: Record<string, string> = {
  transport: "교통",
  policy: "정책",
  politics: "정치",
  global: "세계경제",
  momcafe: "맘카페",
  geo: "지리/입지",
  school: "학군",
}

function fmtDelta(delta: number | null): string {
  if (delta === null) return "-"
  return `${delta > 0 ? "+" : ""}${delta}`
}

function deltaColor(delta: number | null): string {
  if (delta === null) return "#9CA3AF"
  if (delta > 0) return "#16A34A"
  if (delta < 0) return "#DC2626"
  return "#9CA3AF"
}

// 카테고리 점수 차트 표시 (단순 바)
function CategoryBar({ label, score, delta }: { label: string; score: number | null; delta: number | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
      <span style={{ fontSize: 11, color: "#6B7280", width: 50, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
        {score !== null && (
          <div style={{
            width: `${Math.max(2, (score / 100) * 100)}%`,
            height: "100%",
            background: score >= 70 ? "#16A34A" : score >= 50 ? "#F59E0B" : "#DC2626",
            borderRadius: 3,
            transition: "width .5s",
          }} />
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: deltaColor(delta), width: 40, textAlign: "right" }}>
        {delta !== null ? `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}` : ""}
      </span>
    </div>
  )
}

// 개별 아이템 카드
function ReportItemCard({ item }: { item: WeeklyReport["items"][0] }) {
  const hasData = item.thisWeek && item.lastWeek
  const scoreDelta = item.changes.avgScoreDelta

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      border: "1px solid #E5E7EB",
      background: "#fff",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{item.aptName}</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{item.address}</div>
        </div>
        {scoreDelta !== null && (
          <div style={{
            padding: "4px 10px", borderRadius: 6,
            background: scoreDelta > 0 ? "#D1FAE5" : scoreDelta < 0 ? "#FEE2E2" : "#F3F4F6",
            color: deltaColor(scoreDelta),
            fontSize: 13, fontWeight: 800,
          }}>
            {scoreDelta > 0 ? "+" : ""}{scoreDelta}
          </div>
        )}
      </div>

      {/* 주간 점수 변화 */}
      {hasData && (
        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "#F9FAFB" }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 2 }}>{item.thisWeek?.weekLabel}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>{item.thisWeek?.avgScore ?? "-"}</div>
          </div>
          <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "#F9FAFB" }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 2 }}>{item.lastWeek?.weekLabel}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#9CA3AF" }}>{item.lastWeek?.avgScore ?? "-"}</div>
          </div>
        </div>
      )}

      {/* 카테고리별 변화 */}
      {hasData && (
        <div style={{ marginBottom: 10 }}>
          {item.thisWeek!.categories.map(cat => {
            const prev = item.lastWeek?.categories.find(c => c.category === cat.category)
            const delta = cat.score != null && prev != null && prev.score != null ? cat.score - prev.score : null
            return (
              <CategoryBar
                key={cat.category}
                label={CATEGORY_LABELS[cat.category] ?? cat.category}
                score={cat.score}
                delta={delta}
              />
            )
          })}
        </div>
      )}

      {/* 하이라이트 */}
      {item.highlights.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {item.highlights.map((h, i) => (
            <span key={i} style={{
              padding: "2px 8px", borderRadius: 4,
              background: h.includes("상승") ? "#D1FAE5" : "#FEE2E2",
              color: h.includes("상승") ? "#059669" : "#DC2626",
              fontSize: 10, fontWeight: 600,
            }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {/* 권장 액션 */}
      {item.recommendation && (
        <div style={{
          padding: "8px 10px", borderRadius: 6,
          background: "#FFFBEB", border: "1px solid #FDE68A",
          fontSize: 11, color: "#92400E", fontWeight: 600,
        }}>
          💡 {item.recommendation}
        </div>
      )}
    </div>
  )
}

// ─── 메인 주간 리포트 카드 ────────────────────────────
export default function WeeklyReportCard() {
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reports/weekly")
      .then(async res => {
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (json.success) setReport(json)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
        리포트 불러오는 중...
      </div>
    )
  }

  if (!report || report.items.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
          주간 리포트가 없습니다
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
          즐겨찾기를 등록하면<br />
          매주 월요일 요약 리포트를 보내드립니다
        </div>
      </div>
    )
  }

  const upCount = report.items.filter(i => (i.changes.avgScoreDelta ?? 0) > 0).length
  const downCount = report.items.filter(i => (i.changes.avgScoreDelta ?? 0) < 0).length

  return (
    <div>
      {/* 리포트 헤더 */}
      <div style={{
        background: "linear-gradient(135deg,#0A2463,#1B4FBB)",
        borderRadius: 14, padding: "18px 20px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 4 }}>
          {report.weekLabel ?? "주간"} 요약
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
          📬 주간 리포트
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.1)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>상향 </span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#34D399" }}>{upCount}</span>
          </div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.1)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>하향 </span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#F87171" }}>{downCount}</span>
          </div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.1)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>전체 </span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{report.items.length}</span>
          </div>
        </div>
      </div>

      {/* 아이템 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {report.items.map((item, idx) => (
          <ReportItemCard key={idx} item={item} />
        ))}
      </div>
    </div>
  )
}
