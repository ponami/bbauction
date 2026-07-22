"use client"

import type { ReactNode } from "react"
import type {
  CategoryId,
  CategoryResult,
  DashboardData,
  ExplainabilityBreakdownItem,
  ExplainabilityData,
  ExplainabilityNewsItem,
  ExplainabilitySignal,
  ExplainabilityTradeItem,
} from "@/lib/types"
import TrustStrip from "../TrustStrip"

const AI_BREAKDOWN_CATEGORY_ORDER: CategoryId[] = ["transport", "policy", "politics", "global", "momcafe"]

const AI_BREAKDOWN_LABELS: Record<CategoryId, string> = {
  transport: "교통",
  policy: "정책",
  politics: "정치",
  global: "글로벌",
  momcafe: "실거주 수요",
  market: "시장",
  geo: "입지",
  school: "학군",
}

type CategoryNewsSource = {
  title?: string
  link?: string
  pubDate?: string
  pub_date?: string
}

function sanitizeHeadline(value?: string) {
  return value
    ?.replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

function formatPubDateTime(value?: string) {
  if (!value) return ""
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return value.slice(0, 16).replace("T", " ")
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const h = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    return `${y}-${m}-${day} ${h}:${min}`
  } catch {
    return value.slice(0, 16).replace("T", " ")
  }
}

function buildLiveBreakdown(categories?: DashboardData["categories"]): ExplainabilityBreakdownItem[] {
  if (!categories) return []
  return AI_BREAKDOWN_CATEGORY_ORDER.flatMap((id) => {
    const category = categories[id]
    if (!category) return []
    // 무신호 행(뉴스 없음 + 중립 50점)은 노이즈라 숨긴다 (2026-07-18)
    if (category.score === 50 && (!category.summary || category.summary.includes("관련 뉴스 없음"))) return []
    return [{
      category: id,
      label: AI_BREAKDOWN_LABELS[id],
      score: category.score,
      trend: category.trend,
      summary: category.summary,
      updated_at: category.cachedAt || category.updatedAt,
    }]
  })
}

function buildCategoryNews(
  categories?: DashboardData["categories"],
  fallbackNews: ExplainabilityNewsItem[] = [],
): ExplainabilityNewsItem[] {
  const liveNews = AI_BREAKDOWN_CATEGORY_ORDER.flatMap((id) => {
    const category = categories?.[id]
    const raw = category?.rawData as { news?: CategoryNewsSource[] } | undefined
    const news = Array.isArray(raw?.news) ? raw.news : []
    return news.map((item) => ({
      category: id,
      label: AI_BREAKDOWN_LABELS[id],
      title: sanitizeHeadline(item.title) || "제목 없음",
      link: item.link,
      pub_date: item.pubDate || item.pub_date,
    }))
  })

  const merged = [...liveNews, ...fallbackNews]
  const seen = new Set<string>()
  return merged.filter((item) => {
    const key = `${item.label || ""}|${item.link || ""}|${item.title || ""}`
    if (!item.title || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatSignalValue(signal: ExplainabilitySignal) {
  if (signal.value == null) return "-"
  if (signal.kind === "adjustment" && typeof signal.value === "number") {
    return `${signal.value > 0 ? "+" : ""}${signal.value}점`
  }
  if (signal.kind === "score" && typeof signal.value === "number") {
    return `${signal.value}점`
  }
  return `${signal.value}`
}

function signalTone(signal: ExplainabilitySignal) {
  if (signal.kind === "adjustment" && typeof signal.value === "number") {
    if (signal.value > 0) return "#16A34A"
    if (signal.value < 0) return "#DC2626"
  }
  if (signal.kind === "risk") {
    if (signal.value === "낮음") return "#16A34A"
    if (signal.value === "높음") return "#DC2626"
    return "#D97706"
  }
  return "#111827"
}

function trendLabel(value?: string) {
  if (value === "up") return "상승"
  if (value === "down") return "하락"
  if (value === "neutral") return "중립"
  return value
}

function formatTrade(item: ExplainabilityTradeItem) {
  const dealType = item.dealType || "매매"
  return `${dealType} · ${item.ym} · ${item.area_m2}㎡(${item.pyeong}평형) ${item.floor}층`
}

export default function ExplainabilityCard({
  data,
  title = "🧭 상담 근거",
  variant = "full",
}: {
  data: ExplainabilityData & { categories?: Partial<Record<CategoryId, CategoryResult>> }
  title?: string
  variant?: "compact" | "full"
}) {
  const scoreComponents = data.score_components
  const evidence = data.evidence
  const unitProfile = (scoreComponents?.unit_profile || []).slice(0, variant === "compact" ? 3 : 4)
  const synthesizedBreakdown = buildLiveBreakdown(data.categories as DashboardData["categories"] | undefined)
  const topBreakdown = (synthesizedBreakdown.length > 0 ? synthesizedBreakdown : (scoreComponents?.ai_breakdown || []))
    .slice(0, variant === "compact" ? 3 : 5)
  const synthesizedNews = buildCategoryNews(data.categories as DashboardData["categories"] | undefined, evidence?.recent_news || [])
  const topNews = synthesizedNews.slice(0, variant === "compact" ? 3 : 5)
  const topTrades = (evidence?.recent_trades || []).slice(0, variant === "compact" ? 3 : 5)
  const jeonseSummary = evidence?.jeonse_summary
  const schoolSummary = evidence?.school_summary
  const turnoverSummary = evidence?.turnover_summary

  const hasContent = Boolean(
    unitProfile.length ||
    topBreakdown.length ||
    topNews.length ||
    topTrades.length ||
    jeonseSummary?.level ||
    schoolSummary?.school_score != null ||
    turnoverSummary
  )

  if (!hasContent) return null

  const cardBg = variant === "compact" ? "#FFFBEB" : "#FFFFFF"
  const cardBorder = variant === "compact" ? "#FDE68A" : "#E5E7EB"
  const titleColor = variant === "compact" ? "#92400E" : "#111827"
  const subTitleColor = variant === "compact" ? "#A16207" : "#374151"
  const mutedColor = variant === "compact" ? "#6B7280" : "#6B7280"

  // Freshness handled by TrustStrip using existing fields

  return (
    <div style={{
      background: cardBg,
      borderRadius: 12,
      padding: variant === "compact" ? "12px 14px" : "18px 20px",
      border: `1px solid ${cardBorder}`,
    }}>
      <div style={{ fontSize: variant === "compact" ? 11 : 14, fontWeight: 700, color: titleColor, marginBottom: 4 }}>
        {title}
      </div>
      <TrustStrip
        updatedAt={(data as any).updatedAt || (data as any).lastUpdated}
        cachedAt={(data as any).cachedAt}
        lastNewsTime={topNews[0]?.pub_date}
        tradeCount={topTrades.length}
        confidence="보통"
        variant={variant}
      />

      {/* 점수 성분표·구성 설명은 비노출 (2026-07-18 사용자 확정 — 알고리즘 비노출 원칙) */}

      {(jeonseSummary?.level || schoolSummary?.school_score != null || turnoverSummary) && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
        }}>
          {jeonseSummary?.level && (
            <SummaryBadge label="전세 리스크" value={jeonseSummary.level} />
          )}
          {schoolSummary?.school_score != null && (
            <SummaryBadge label="학군" value={`${schoolSummary.school_score}점`} />
          )}
          {turnoverSummary?.turnover_rate_pct != null && (
            <SummaryBadge label="거래회전율" value={`${turnoverSummary.turnover_rate_pct}%`} />
          )}
        </div>
      )}

      {unitProfile.length > 0 && (
        <Section title="단지 기본 정보" titleColor={subTitleColor}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unitProfile.map((item, index) => (
              <SummaryBadge key={`${item.label}-${index}`} label={item.label} value={item.value ?? "-"} />
            ))}
          </div>
        </Section>
      )}

      {topBreakdown.length > 0 && (
        <Section title="지역 이슈 점수" titleColor={subTitleColor}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topBreakdown.map((item, index) => (
              <BreakdownRow key={`${item.category}-${index}`} item={item} />
            ))}
          </div>
        </Section>
      )}

      {/* Prominent global macro (FOMC priority) for freshness and impact awareness */}
      {topBreakdown.some((b: any) => b.category === "global") && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#1E40AF", background: "#DBEAFE", padding: "6px 8px", borderRadius: 6, border: "1px solid #3B82F6" }}>
          🌐 글로벌 매크로 (FOMC 우선): FOMC·환율·유가 영향 최우선 반영. 기준 시각 확인으로 최신성 체크하세요.
        </div>
      )}

      {topNews.length > 0 && (
        <Section title="기사 근거 (최신순, 시간 표시로 신선도 확인)" titleColor={subTitleColor}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topNews.map((item, index) => (
              <NewsRow key={`${item.link || item.title}-${index}`} item={item} />
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 4 }}>
            * 이 시각 이후 나온 뉴스는 아직 반영되지 않았을 수 있습니다.
          </div>
        </Section>
      )}

      {topTrades.length > 0 && (
        <Section title="최근 실거래" titleColor={subTitleColor}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topTrades.map((item, index) => (
              <div
                key={`${item.ym}-${item.area_m2}-${item.floor}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: variant === "compact" ? 11 : 12,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: "#6B7280" }}>{formatTrade(item)}</span>
                <span style={{ color: "#111827", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {(item.price_man / 10000).toFixed(1)}억
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  titleColor,
  children,
}: {
  title: string
  titleColor: string
  children: ReactNode
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: titleColor, marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SummaryBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: 999,
      padding: "5px 9px",
      fontSize: 12,
    }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ fontWeight: 700, color: "#111827" }}>{value}</span>
    </div>
  )
}

function BreakdownRow({ item }: { item: ExplainabilityBreakdownItem }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ color: "#111827", fontWeight: 600 }}>{item.label}</span>
        {item.summary && <span style={{ color: "#6B7280" }}>{item.summary}</span>}
      </div>
      <span style={{ color: "#111827", fontWeight: 700, whiteSpace: "nowrap" }}>
        {item.score}점{item.trend ? ` · ${trendLabel(item.trend)}` : ""}
      </span>
    </div>
  )
}

function NewsRow({ item }: { item: ExplainabilityNewsItem }) {
  const timeStr = item.pub_date ? formatPubDateTime(item.pub_date) : ""
  const body = (
    <>
      <span style={{ fontWeight: 600 }}>[{item.label || "기사"}]</span>{" "}
      <span>{item.title || "제목 없음"}</span>
      {timeStr ? <span style={{ color: "#9CA3AF", fontSize: "0.9em", marginLeft: 4 }}>{timeStr}</span> : null}
      {item.keyword ? <span style={{ color: "#9CA3AF" }}>{` · ${item.keyword}`}</span> : null}
    </>
  )

  if (!item.link) {
    return <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{body}</div>
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      style={{ fontSize: 12, color: "#1D4ED8", lineHeight: 1.5, textDecoration: "none" }}
    >
      {body}
    </a>
  )
}
