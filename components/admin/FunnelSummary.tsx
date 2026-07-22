"use client"

import { useEffect, useState } from "react"
import {
  type AnalyticsFunnelSummary,
  type AnalyticsRecentEvent,
  type AnalyticsSummary,
} from "@/lib/analytics"

function formatCurrency(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function FunnelCard({ summary }: { summary: AnalyticsFunnelSummary }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{summary.label}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
            이벤트 {summary.totalEvents.toLocaleString("ko-KR")}건 · 세션 {summary.uniqueSessions.toLocaleString("ko-KR")}개
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#6B7280" }}>추정 결제액</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#16A34A" }}>{formatCurrency(summary.estimatedRevenue)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {summary.steps.map((step) => (
          <div
            key={step.key}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 10,
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: 12,
              background: "#F9FAFB",
              border: "1px solid #F3F4F6",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{step.label}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                이벤트 {step.events.toLocaleString("ko-KR")} · 세션 {step.sessions.toLocaleString("ko-KR")}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
              {step.conversionRate == null ? "-" : `${step.conversionRate}%`}
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>직전 대비</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {summary.trend.map((point) => (
          <div key={point.date} style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{point.date.slice(5)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>노출 {point.paywallView}</div>
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>선택 {point.productSelect}</div>
            <div style={{ fontSize: 10, color: "#16A34A", marginTop: 2 }}>결제 {point.paymentComplete}</div>
          </div>
        ))}
      </div>

      {summary.topSkus.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
          인기 상품: {summary.topSkus.map((item) => `${item.sku} ${item.count}건`).join(" · ")}
        </div>
      )}
    </div>
  )
}

function RecentEvents({ items }: { items: AnalyticsRecentEvent[] }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "16px 18px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 12 }}>최근 전환 이벤트</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>아직 집계된 이벤트가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background: "#F9FAFB",
                border: "1px solid #F3F4F6",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                  {item.label} · {item.funnel === "consumer" ? "소비자" : "중개사"}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                  {item.source}{item.sku ? ` · ${item.sku}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{formatDateTime(item.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FunnelSummary() {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const res = await fetch("/api/analytics?days=30")
        if (!res.ok) throw new Error("운영 요약을 불러오지 못했습니다")
        const json = await res.json()
        if (active) setData(json)
      } catch (e: unknown) {
        if (active) setError(e instanceof Error ? e.message : "운영 요약을 불러오지 못했습니다")
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "16px 18px", fontSize: 13, color: "#6B7280" }}>
        운영 퍼널 요약을 불러오는 중...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #FECACA", padding: "16px 18px", fontSize: 13, color: "#DC2626" }}>
        {error || "운영 퍼널 요약을 불러오지 못했습니다"}
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gap: 14, marginBottom: 14 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: "16px 18px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>📈 전환 퍼널 요약</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>
          최근 {data.rangeDays}일 기준으로 소비자/중개사 유입, 상품 선택, 결제 완료 흐름을 같이 봅니다.
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <FunnelCard summary={data.funnels.consumer} />
        <FunnelCard summary={data.funnels.agent} />
      </div>

      <RecentEvents items={data.recentEvents} />
    </div>
  )
}

