"use client"

import { useState, useEffect } from "react"
import type { MlForecastData } from "@/lib/types"

const HORIZON_LABELS: Record<number, string> = {
  6: "6개월",
  12: "12개월",
  24: "24개월",
  36: "36개월",
  60: "60개월",
}

// -1~+1 점수를 0~100 으로 변환 (50 = 중립)
function toPercent(score: number): number {
  return Math.round(Math.max(0, Math.min(100, (score + 1) / 2 * 100)))
}

function scoreColor(score: number): string {
  if (score > 0.1)  return "#1B4FBB"   // 상승
  if (score < -0.1) return "#EF5350"   // 하락
  return "#9E9E9E"                      // 중립
}

function scoreBg(score: number): string {
  if (score > 0.1)  return "#EEF3FC"
  if (score < -0.1) return "#FFEBEE"
  return "#F5F5F5"
}

function scoreLabel(score: number): string {
  if (score > 0.3)  return "리스크 낮음 ↑"
  if (score > 0.1)  return "리스크 소폭 감소"
  if (score < -0.3) return "리스크 확대 가능성 ↓"
  if (score < -0.1) return "리스크 소폭 확대"
  return "중립 — 주시 필요"
}

function HorizonRow({
  horizon, total, regionScore, dirAcc, regionName,
}: {
  horizon: number
  total: number
  regionScore: number | null
  dirAcc: number
  regionName?: string
}) {
  const label = HORIZON_LABELS[horizon] ?? `${horizon}개월`
  const refScore = regionScore ?? total
  const pct = toPercent(refScore)
  const color = scoreColor(refScore)
  const bg = scoreBg(refScore)

  return (
    <div style={{
      padding: "14px 20px",
      borderBottom: "1px solid #F0F4FA",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {/* 헤더 행 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 12, fontWeight: 800, color: "#1A2B4A",
            background: "#EEF3FC", borderRadius: 5, padding: "3px 8px", minWidth: 60, textAlign: "center",
          }}>{label}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color,
            background: bg, borderRadius: 4, padding: "2px 8px",
          }}>{scoreLabel(refScore)}</span>
          {regionScore !== null && (
            <span style={{ fontSize: 10, color: "#6B7FA3" }}>
              {regionName || "해당 지역"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {regionScore !== null && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "#A0B0CC" }}>전국</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(total) }}>
                {total > 0 ? "+" : ""}{total.toFixed(2)}
              </div>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#A0B0CC" }}>
              {regionScore !== null ? regionName || "지역" : "전국"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color }}>
              {refScore > 0 ? "+" : ""}{refScore.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 점수 바 */}
      <div style={{ position: "relative", height: 8, background: "#EEF3FC", borderRadius: 4, overflow: "hidden" }}>
        {/* 중앙 기준선 */}
        <div style={{
          position: "absolute", left: "50%", top: 0, width: 2, height: "100%",
          background: "#C5D4EC", transform: "translateX(-50%)",
        }} />
        {/* 점수 바 */}
        <div style={{
          position: "absolute",
          left: refScore >= 0 ? "50%" : `${pct}%`,
          width: `${Math.abs(pct - 50)}%`,
          height: "100%",
          background: color,
          borderRadius: 4,
          transition: "width .8s ease-out",
        }} />
      </div>

      {/* 모델 정확도 */}
      <div style={{ fontSize: 10, color: "#A0B0CC" }}>
        방향 정확도 {Math.round(dirAcc * 100)}%
      </div>
    </div>
  )
}

export function MlForecast({ data: initialData }: { data?: MlForecastData }) {
  const [data, setData] = useState<MlForecastData | undefined>(initialData)
  const [loading, setLoading] = useState(!initialData?.available)

  useEffect(() => {
    if (initialData?.available) {
      setData(initialData)
      setLoading(false)
      return
    }
    // 서버 사이드 데이터가 없으면 클라이언트에서 직접 fetch
    const lawdCd = new URLSearchParams(window.location.search).get("lawdCd") || ""
    fetch(`/api/ml-forecast?lawdCd=${encodeURIComponent(lawdCd)}`)
      .then(r => r.json())
      .then(json => { if (json?.data) setData(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialData])

  if (loading) {
    return (
      <div style={{ background: "#FFF", border: "1px solid #E8EDF5", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: "#0A2463", padding: "16px 24px" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#FFF" }}>🤖 AI 24개월 리스크 헷징 분석</span>
        </div>
        <div style={{ padding: 40, textAlign: "center", color: "#6B7FA3", fontSize: 13 }}>
          오를지 엔진 연결 중...
        </div>
      </div>
    )
  }

  if (!data || !data.available) {
    return (
      <div style={{ background: "#FFF", border: "1px solid #E8EDF5", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: "#0A2463", padding: "16px 24px" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#FFF" }}>🤖 AI 24개월 리스크 헷징 분석</span>
          <span style={{ fontSize: 11, color: "#8FA8D0", marginLeft: 12 }}>
            실거래 기반 시계열 방향 분석 · 지역 흐름 참고
          </span>
        </div>
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔌</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B4A", marginBottom: 8 }}>
            오를지 엔진 미연결
          </div>
          <div style={{ fontSize: 12, color: "#6B7FA3", lineHeight: 1.7 }}>
            게이트 서비스에 연결할 수 없습니다.
          </div>
          {data?.error && (
            <div style={{ marginTop: 16, fontSize: 10, color: "#A0B0CC" }}>
              오류: {data.error.slice(0, 100)}
            </div>
          )}
        </div>
      </div>
    )
  }

  const horizons = data.horizons ?? []
  const h12 = horizons.find(h => h.horizon === 12)
  const h24 = horizons.find(h => h.horizon === 24)
  const h36 = horizons.find(h => h.horizon === 36)
  const summaryText = horizons.length > 0
    ? `이 모델은 12개월 ${h12 ? (h12.regionScore ?? h12.total).toFixed(2) : "데이터 없음"}, 24개월 ${h24 ? (h24.regionScore ?? h24.total).toFixed(2) : "데이터 없음"}, 36개월 ${h36 ? (h36.regionScore ?? h36.total).toFixed(2) : "데이터 없음"}의 흐름을 함께 읽어야 한다고 봅니다. 특히 36개월 방향정확도가 ${h36 ? Math.round(h36.dirAcc * 100) : 0}% 수준이라면, 중기 방향은 단순한 기대가 아니라 실제 매물가와 체결가가 어느 쪽으로 쏠릴지까지 같이 봐야 합니다.`
    : "오를지 엔진이 연결되면 12·24·36개월 방향을 함께 해석할 수 있습니다."
  const allDisplayHorizons = [6, 12, 24, 36, 60].map(h => ({
    data: horizons.find(x => x.horizon === h),
    horizon: h,
  })).filter(x => x.data)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 메인 카드 */}
      <div style={{ background: "#FFF", border: "1px solid #E8EDF5", borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          background: "#0A2463", padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#FFF" }}>🤖 AI 24개월 리스크 헷징 리포트</span>
            <span style={{ fontSize: 11, color: "#8FA8D0", marginLeft: 12 }}>
              시계열 오를지 엔진 · 실거래 기반 방향 참고 분석
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {data.regionName && (
              <span style={{
                background: "#1B4FBB", color: "#FFF",
                fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
              }}>📍 {data.regionName}</span>
            )}
            <span style={{
              background: "#2E7D32", color: "#FFF",
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
            }}>● 연결됨</span>
          </div>
        </div>

        {/* 기준 연월 */}
        {data.timestamp && (
          <div style={{
            padding: "8px 20px", background: "#F8FAFF",
            borderBottom: "1px solid #EEF3FC",
            fontSize: 11, color: "#6B7FA3",
          }}>
            기준: {data.timestamp.slice(0, 4)}년 {data.timestamp.slice(4, 6)}월 예측 결과
            {data.regionName && ` · ${data.regionName} 지역 포함`}
          </div>
        )}

        <div style={{
          padding: "14px 20px",
          background: "#FBFDFF",
          borderBottom: "1px solid #EEF3FC",
          fontSize: 12,
          color: "#1A2B4A",
          lineHeight: 1.8,
        }}>
          {summaryText}
        </div>

        {/* horizon 별 행 — 모두 표시 (블러는 Dashboard에서 처리) */}
        {allDisplayHorizons.map(({ data: h, horizon: hv }) => h && (
          <HorizonRow
            key={hv}
            horizon={hv}
            total={h.total}
            regionScore={h.regionScore}
            dirAcc={h.dirAcc}
            regionName={data.regionName}
          />
        ))}
      </div>

      {/* 범례 */}
      <div style={{
        background: "#FFF", border: "1px solid #E8EDF5", borderRadius: 12,
        padding: "14px 20px",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1A2B4A", marginBottom: 10 }}>리스크 점수 해석 가이드</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            { range: "+0.3 이상", label: "리스크 낮음 ↑", color: "#10B981", bg: "#ECFDF5" },
            { range: "+0.1 ~ +0.3", label: "리스크 소폭 감소", color: "#059669", bg: "#F0FDF4" },
            { range: "-0.1 ~ +0.1", label: "중립 — 주시 필요", color: "#9E9E9E", bg: "#F5F5F5" },
            { range: "-0.3 ~ -0.1", label: "리스크 소폭 확대", color: "#F97316", bg: "#FFF7F0" },
            { range: "-0.3 이하", label: "리스크 확대 가능성 ↓", color: "#EF4444", bg: "#FEF2F2" },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                background: item.bg, color: item.color,
                fontSize: 10, fontWeight: 700,
                padding: "2px 8px", borderRadius: 4,
              }}>{item.label}</span>
              <span style={{ fontSize: 10, color: "#6B7FA3" }}>{item.range}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: "#A0B0CC", lineHeight: 1.7 }}>
          · 점수는 전국 평균 또는 해당 시도 기준 방향성 예측입니다.<br />
          · 방향 정확도는 과거 백테스트 기준이며 미래 수익을 보장하지 않습니다.
        </div>
      </div>
    </div>
  )
}
