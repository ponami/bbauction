"use client"

import { useState, useEffect, useRef } from "react"

interface ChartPoint {
  ym: string        // "2024.03"
  avg: number       // 만원
  min: number
  max: number
  count: number
  area_m2: number | null
}

interface PyeongItem {
  pyeong: number
  latest_price: number | null
  latest_yyyymm: string | null
}

interface Props {
  aptId: number
  initialPyeongs?: number[]   // AptDetail.trade_areas
}

type TradeType = "sale" | "jeonse"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

function formatPrice(man: number) {
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rem = man % 10000
    return rem > 0 ? `${eok}억 ${rem.toLocaleString()}만` : `${eok}억`
  }
  return `${man.toLocaleString()}만`
}

export default function PriceChart({ aptId, initialPyeongs }: Props) {
  const [pyeongs,        setPyeongs]        = useState<PyeongItem[]>([])
  const [selectedPyeong, setSelectedPyeong] = useState<number | null>(null)
  const [tradeType,      setTradeType]      = useState<TradeType>("sale")
  const [chart,          setChart]          = useState<ChartPoint[]>([])
  const [jeonseChart,    setJeonseChart]    = useState<ChartPoint[]>([])
  const [loadingList,    setLoadingList]    = useState(true)
  const [loadingChart,   setLoadingChart]   = useState(false)
  const [hoverIdx,       setHoverIdx]       = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const failedRef = useRef<Set<number>>(new Set())

  // 평형 목록 로드 (이미 실패한 aptId는 스킵)
  useEffect(() => {
    if (failedRef.current.has(aptId)) {
      setLoadingList(false)
      return
    }
    setLoadingList(true)
    fetch(`${GATE_URL}/apt/${aptId}/pyeong`)
      .then(r => {
        if (!r.ok) failedRef.current.add(aptId)
        return r.ok ? r.json() : null
      })
      .then(data => {
        if (!data?.pyeongs?.length) return
        setPyeongs(data.pyeongs)
        const first = data.pyeongs[Math.floor(data.pyeongs.length / 2)] ?? data.pyeongs[0]
        setSelectedPyeong(first.pyeong)
      })
      .catch(() => { failedRef.current.add(aptId) })
      .finally(() => setLoadingList(false))
  }, [aptId])

  // 선택 평형 차트 로드 (매매 + 전세 동시)
  useEffect(() => {
    if (!selectedPyeong) return
    setLoadingChart(true)
    setChart([])
    setJeonseChart([])
    setHoverIdx(null)

    const saleP   = fetch(`${GATE_URL}/apt/${aptId}/pyeong/${selectedPyeong}/chart?months=36`)
      .then(r => r.ok ? r.json() : null)
    const jeonseP = fetch(`${GATE_URL}/apt/${aptId}/pyeong/${selectedPyeong}/jeonse-chart?months=36`)
      .then(r => r.ok ? r.json() : null)

    Promise.all([saleP, jeonseP])
      .then(([saleData, jeonseData]) => {
        if (saleData?.chart)   setChart(saleData.chart)
        if (jeonseData?.chart) setJeonseChart(jeonseData.chart)
      })
      .catch(() => {})
      .finally(() => setLoadingChart(false))
  }, [aptId, selectedPyeong])

  if (loadingList) {
    return (
      <div style={{ padding: "12px 0", color: "#9CA3AF", fontSize: 12, textAlign: "center" }}>
        거래 데이터 로딩 중...
      </div>
    )
  }
  if (!pyeongs.length) return null

  const activeChart = tradeType === "sale" ? chart : jeonseChart
  const accentColor = tradeType === "sale" ? "#6366F1" : "#F59E0B"
  const gradId      = tradeType === "sale" ? `cg-sale-${aptId}` : `cg-jeonse-${aptId}`

  // SVG 차트 계산
  const W = 320, H = 56, PAD_L = 36, PAD_R = 6, PAD_T = 6, PAD_B = 14
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const prices = activeChart.map(p => p.avg)
  const minP   = prices.length ? Math.min(...prices) : 0
  const maxP   = prices.length ? Math.max(...prices) : 1
  const range  = maxP - minP || 1

  const px = (i: number) => PAD_L + (i / Math.max(activeChart.length - 1, 1)) * innerW
  const py = (v: number) => PAD_T + innerH - ((v - minP) / range) * innerH

  const polyline = activeChart.map((p, i) => `${px(i)},${py(p.avg)}`).join(" ")

  const xLabels: { i: number; label: string }[] = []
  if (activeChart.length > 0) {
    const step = Math.max(1, Math.floor(activeChart.length / 4))
    for (let i = 0; i < activeChart.length; i += step) {
      const [y, m] = activeChart[i].ym.split(".")
      xLabels.push({ i, label: `${y.slice(2)}.${m}` })
    }
    const last = activeChart.length - 1
    if (xLabels[xLabels.length - 1]?.i !== last) {
      const [y, m] = activeChart[last].ym.split(".")
      xLabels.push({ i: last, label: `${y.slice(2)}.${m}` })
    }
  }

  const yLabels = [minP, minP + range / 2, maxP]
  const hovered = hoverIdx !== null ? activeChart[hoverIdx] : null

  return (
    <div style={{ marginTop: 12 }}>
      {/* 제목 + 탭 + 평형 선택 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        {/* 좌: 제목 + 매매/전세 탭 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
            실거래가 추이 <span style={{ color: "#9CA3AF", fontWeight: 400 }}>최근 3년</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["sale", "jeonse"] as TradeType[]).map(t => (
              <button
                key={t}
                onClick={() => { setTradeType(t); setHoverIdx(null) }}
                style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  background: tradeType === t
                    ? (t === "sale" ? "#EEF2FF" : "#FFFBEB")
                    : "#F3F4F6",
                  color: tradeType === t
                    ? (t === "sale" ? "#4F46E5" : "#D97706")
                    : "#9CA3AF",
                }}
              >
                {t === "sale" ? "매매" : "전세"}
              </button>
            ))}
          </div>
        </div>

        {/* 우: 평형 선택 */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {pyeongs.map(p => {
            const pyeong = p.pyeong
            const sqm = Math.round(pyeong * 3.3058)
            return (
              <button
                key={pyeong}
                onClick={() => setSelectedPyeong(pyeong)}
                style={{
                  padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  border: selectedPyeong === pyeong ? "none" : "1px solid #E5E7EB",
                  background: selectedPyeong === pyeong ? accentColor : "#F9FAFB",
                  color: selectedPyeong === pyeong ? "#fff" : "#374151",
                  cursor: "pointer",
                }}
              >
                {sqm}㎡({pyeong}평)
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택 평형 최근가 */}
      {selectedPyeong && (() => {
        if (tradeType === "sale") {
          const sel = pyeongs.find(p => p.pyeong === selectedPyeong)
          return sel?.latest_price ? (
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
              {selectedPyeong}평 최근 매매가&nbsp;
              <span style={{ color: "#111827", fontWeight: 700, fontSize: 14 }}>
                {formatPrice(sel.latest_price)}
              </span>
              {sel.latest_yyyymm && (
                <span style={{ color: "#9CA3AF" }}>&nbsp;({sel.latest_yyyymm})</span>
              )}
            </div>
          ) : null
        } else {
          const last = jeonseChart[jeonseChart.length - 1]
          return last ? (
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
              {selectedPyeong}평 최근 전세 보증금&nbsp;
              <span style={{ color: "#111827", fontWeight: 700, fontSize: 14 }}>
                {formatPrice(last.avg)}
              </span>
              <span style={{ color: "#9CA3AF" }}>&nbsp;({last.ym})</span>
            </div>
          ) : null
        }
      })()}

      {loadingChart ? (
        <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 12 }}>
          차트 로딩 중...
        </div>
      ) : activeChart.length < 2 ? (
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 12 }}>
          {tradeType === "jeonse" ? "전세 거래 데이터가 없습니다" : "거래 데이터가 부족합니다"}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            ref={svgRef}
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{ overflow: "visible", display: "block" }}
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={e => {
              const rect = svgRef.current?.getBoundingClientRect()
              if (!rect) return
              const relX = ((e.clientX - rect.left) / rect.width) * W - PAD_L
              const idx = Math.round((relX / innerW) * (activeChart.length - 1))
              setHoverIdx(Math.max(0, Math.min(activeChart.length - 1, idx)))
            }}
          >
            {/* 배경 그리드 */}
            {yLabels.map((v, i) => (
              <g key={i}>
                <line
                  x1={PAD_L} y1={py(v)} x2={W - PAD_R} y2={py(v)}
                  stroke="#F3F4F6" strokeWidth={1}
                />
                <text
                  x={PAD_L - 3} y={py(v) + 3}
                  textAnchor="end" fontSize={6} fill="#9CA3AF"
                >
                  {v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${(v / 1000).toFixed(0)}천`}
                </text>
              </g>
            ))}

            {/* 영역 채우기 */}
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.18" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon
              points={[
                `${PAD_L},${PAD_T + innerH}`,
                ...activeChart.map((p, i) => `${px(i)},${py(p.avg)}`),
                `${px(activeChart.length - 1)},${PAD_T + innerH}`,
              ].join(" ")}
              fill={`url(#${gradId})`}
            />

            {/* 라인 */}
            <polyline
              points={polyline}
              fill="none"
              stroke={accentColor}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* X축 레이블 */}
            {xLabels.map(({ i, label }) => (
              <text
                key={i}
                x={px(i)} y={H - 3}
                textAnchor="middle" fontSize={6} fill="#9CA3AF"
              >
                {label}
              </text>
            ))}

            {/* 호버 수직선 + 점 */}
            {hoverIdx !== null && (
              <>
                <line
                  x1={px(hoverIdx)} y1={PAD_T} x2={px(hoverIdx)} y2={PAD_T + innerH}
                  stroke={accentColor} strokeWidth={1} strokeDasharray="3 2" opacity={0.5}
                />
                <circle
                  cx={px(hoverIdx)} cy={py(activeChart[hoverIdx].avg)}
                  r={3} fill={accentColor} stroke="#fff" strokeWidth={1.5}
                />
              </>
            )}
          </svg>

          {/* 호버 툴팁 */}
          {hovered && (
            <div style={{
              position: "absolute",
              left: Math.min(
                Math.max(0, (px(hoverIdx!) / W) * 100 - 15),
                65
              ) + "%",
              top: 0,
              background: "rgba(17,24,39,0.9)",
              color: "#fff",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 10,
            }}>
              <div style={{ fontWeight: 700 }}>
                {tradeType === "jeonse" ? "보증금 " : ""}{formatPrice(hovered.avg)}
              </div>
              <div style={{ color: "#9CA3AF", fontSize: 10 }}>
                {hovered.ym} · {hovered.count}건
              </div>
              {hovered.min !== hovered.max && (
                <div style={{ color: "#9CA3AF", fontSize: 10 }}>
                  {formatPrice(hovered.min)} ~ {formatPrice(hovered.max)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
