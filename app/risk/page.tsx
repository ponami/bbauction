"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import PersonaSheetsAccordion from "@/components/reports/PersonaSheetsAccordion"

// ── 타입 ─────────────────────────────────────────────────────
interface Suggestion {
  addressName: string
  roadAddress: string
  lawdCd: string
}

interface AptSlot {
  address: string
  aptName: string
  lawdCd: string
}

interface TradeRecord {
  price: number
  area: number
  floor: string
  dealDate: string
  label?: string
}

interface PricePoint {
  yyyymm: string
  avg: number
}

interface RiskItem {
  icon: string
  title: string
  level: "HIGH" | "MEDIUM" | "LOW"
  description: string
}

interface SellSignal {
  signal:     "sell" | "hold" | "buy_opportunity"
  emoji:      string
  label:      string
  confidence: number
  reason:     string
  breakdown: {
    oreuljiScore:     number | null
    mlDirectionScore: number | null
    regretPct:        number
    catAvg:           number | null
    horizons12m:      number | null
    horizons24m:      number | null
  }
}

interface RankingData {
  rank:        number
  total:       number
  percentile:  number
  sigungu_nm:  string
  top5: { apt_id: number; apt_nm: string; umd_nm: string; oreulji_score: number; mode: string }[]
}

interface AlternativeApt {
  apt_id:        number
  apt_nm:        string
  sigungu_nm:    string
  umd_nm:        string
  oreulji_score: number
  latest_price:  number | null
  build_year:    number | null
  mode:          string
  score_diff:    number
  price_diff_pct: number | null
}

interface RiskData {
  aptName: string
  lawdCd: string
  safetyScore: number
  regretPct: number
  regionName: string
  trades: TradeRecord[]
  tradesByArea?: Record<string, { avg: number; min: number; max: number; count: number; latest: number; latestDate: string }>
  stats: { avg: number; min: number; max: number; count: number; latest: number; latestDate: string } | null
  priceHistory: PricePoint[]
  mlEngineConnected: boolean
  horizons: { horizon: number; total: number; regionScore: number | null; dirAcc: number }[]
  sellSignal?: SellSignal
  ranking?:    RankingData | null
  alternatives?: AlternativeApt[] | null
  llm: { risks: RiskItem[]; summary: string; alternativeTip: string }
      report?: {
        title?: string
        grade: string
        oneLiner: string
        disclaimer: string
        article?: string
        assumptions?: {
          label: string
          value: string
          note?: string
        }[]
        decisionTables?: {
          id: string
          title: string
          description?: string
          rows?: { label: string; value: string; note?: string }[]
          cards?: {
            title: string
            subtitle?: string
            metrics: { label: string; value: string; note?: string }[]
            note?: string
          }[]
          footnote?: string
        }[]
        personaSheets?: {
          id: string
          persona: "first-home" | "agent" | "investor"
          audienceLabel: string
          defaultOpen?: boolean
          title: string
          summary: string
          metrics: { label: string; value: string; note?: string }[]
          sections: { title: string; items: string[] }[]
          footnote?: string
        }[]
        facts?: {
          latestTrade?: string
          mlScore?: string
          jeonseRatio?: string
          regretPct?: string
          currentAvg?: string
          buildYear?: string
          targetPrice?: string
          marketOffer?: string
          discountPct?: string
          schoolCount?: string
          middleSchoolCount?: string
          highSchoolCount?: string
          academyCount?: string
          closestSchool?: string
          closestMiddleSchool?: string
          closestHighSchool?: string
          choopuma?: string
        }
        sections?: { id: string; heading: string; body: string }[]
      }
}

// ── 유틸 ─────────────────────────────────────────────────────
function fmtManwon(manwon: number) {
  if (!manwon) return "-"
  if (manwon >= 10000) return `${(manwon / 10000).toFixed(1)}억`
  return `${manwon.toLocaleString("ko-KR")}만`
}

// ── 컬러 ─────────────────────────────────────────────────────
const C = {
  danger:    "#F97316",
  dangerHot: "#EF4444",
  dangerMild:"#F59E0B",
  safe:      "#10B981",
  safeBlue:  "#3B82F6",
  brand:     "#16A34A",
}

function scoreToColor(s: number) {
  if (s >= 75) return C.safe
  if (s >= 55) return C.dangerMild
  return C.danger
}

function scoreToLabel(s: number) {
  if (s >= 75) return "안전"
  if (s >= 55) return "주의"
  return "위험"
}

// ── 매도 타이밍 시그널 배너 ───────────────────────────────────
function SellSignalBanner({ signal }: { signal: SellSignal }) {
  const [open, setOpen] = useState(false)

  const BG: Record<string, string> = {
    sell:            "#F0FDF4",
    hold:            "#FEFCE8",
    buy_opportunity: "#FFF1F2",
  }
  const BORDER: Record<string, string> = {
    sell:            "#86EFAC",
    hold:            "#FDE047",
    buy_opportunity: "#FECDD3",
  }
  const TEXT: Record<string, string> = {
    sell:            "#15803D",
    hold:            "#A16207",
    buy_opportunity: "#BE123C",
  }

  return (
    <div style={{
      background: BG[signal.signal],
      border: `1.5px solid ${BORDER[signal.signal]}`,
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{signal.emoji}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: TEXT[signal.signal] }}>
              {signal.label}
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
              {signal.reason}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: TEXT[signal.signal],
            background: BORDER[signal.signal],
            borderRadius: 20, padding: "2px 8px",
          }}>
            신뢰도 {signal.confidence}%
          </span>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              fontSize: 11, color: "#9CA3AF", background: "none",
              border: "none", cursor: "pointer", padding: 0,
            }}
          >
            {open ? "▲" : "▼"}
          </button>
        </div>
      </div>
      {open && (
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: `1px solid ${BORDER[signal.signal]}`,
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
        }}>
          {[
            ["오를지", signal.breakdown.oreuljiScore?.toString() ?? "-"],
            ["리스크지표", `${signal.breakdown.regretPct}%`],
            ["AI카테고리", signal.breakdown.catAvg?.toString() ?? "-"],
            ["오를지방향성", signal.breakdown.mlDirectionScore?.toFixed(2) ?? "-"],
            ["12개월", signal.breakdown.horizons12m?.toFixed(2) ?? "-"],
            ["24개월", signal.breakdown.horizons24m?.toFixed(2) ?? "-"],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "6px 10px" }}>
              <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT[signal.signal] }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 동네 랭킹 배지 ────────────────────────────────────────────
function RankingBadge({ ranking }: { ranking: RankingData }) {
  const [open, setOpen] = useState(false)
  const pct = ranking.percentile

  return (
    <div style={{
      background: "#F8FAFC", border: "1px solid #E2E8F0",
      borderRadius: 12, padding: "10px 14px", marginBottom: 12,
    }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏆</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
              {ranking.sigungu_nm} {ranking.total}개 중 {ranking.rank}위
            </span>
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 700,
              color: pct >= 70 ? "#16A34A" : pct >= 40 ? "#D97706" : "#DC2626",
              background: pct >= 70 ? "#DCFCE7" : pct >= 40 ? "#FEF9C3" : "#FEE2E2",
              borderRadius: 20, padding: "1px 7px",
            }}>
              상위 {100 - pct + 1}%
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", marginBottom: 6 }}>
            {ranking.sigungu_nm} TOP 5
          </div>
          {ranking.top5.map((apt, i) => (
            <div key={apt.apt_id} style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12, padding: "4px 0",
              borderBottom: i < ranking.top5.length - 1 ? "1px solid #F8FAFC" : "none",
            }}>
              <span style={{ color: "#374151" }}>
                <span style={{ fontWeight: 700, color: "#6B7280", marginRight: 6 }}>{i + 1}</span>
                {apt.apt_nm}
              </span>
              <span style={{ fontWeight: 700, color: "#16A34A" }}>{apt.oreulji_score}점</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 대안 단지 카드 ────────────────────────────────────────────
function AlternativesSection({ alternatives }: { alternatives: AlternativeApt[] }) {
  if (!alternatives.length) return null

  const MODE_COLOR: Record<string, string> = {
    safe: "#16A34A", good: "#10B981", neutral: "#D97706", caution: "#F59E0B", danger: "#DC2626",
  }

  return (
    <div style={{
      background: "#FFF", borderRadius: 16, border: "1px solid #E5E7EB",
      padding: "14px 16px", marginBottom: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
        💡 이 지역 대안 단지
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {alternatives.map(apt => (
          <div key={apt.apt_id} style={{
            minWidth: 160, background: "#F9FAFB", border: "1px solid #E5E7EB",
            borderRadius: 12, padding: "12px",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 6, lineHeight: 1.4 }}>
              {apt.apt_nm}
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 8 }}>
              {apt.umd_nm} {apt.build_year ? `· ${apt.build_year}년` : ""}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{
                fontSize: 13, fontWeight: 900,
                color: MODE_COLOR[apt.mode] ?? "#374151",
              }}>
                {apt.oreulji_score}점
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: "#16A34A",
                background: "#DCFCE7", borderRadius: 8, padding: "1px 6px",
              }}>
                +{apt.score_diff}점
              </span>
            </div>
            {apt.latest_price && (
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
                {(apt.latest_price / 10000).toFixed(1)}억
                {apt.price_diff_pct != null && (
                  <span style={{ marginLeft: 4 }}>
                    ({apt.price_diff_pct > 0 ? "+" : ""}{apt.price_diff_pct}%)
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SVG Score Ring ────────────────────────────────────────────
function ScoreRing({ score, size = 96, sw = 8 }: { score: number; size?: number; sw?: number }) {
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = scoreToColor(score)
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={sw} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ - fill}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  )
}

// ── 주소 검색 인풋 ────────────────────────────────────────────
function AptSearchInput({
  label, slot, onChange, onMyProperty,
}: {
  label: string
  slot: AptSlot
  onChange: (s: AptSlot) => void
  onMyProperty?: () => void
}) {
  const [sugg, setSugg] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleInput = useCallback((val: string) => {
    onChange({ ...slot, address: val, lawdCd: "" })
    clearTimeout(timer.current)
    if (val.length < 2) { setSugg([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/kakao-address?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        setSugg(data.documents ?? [])
        setOpen(true)
      } catch { setSugg([]) }
      finally { setLoading(false) }
    }, 350)
  }, [slot, onChange])

  const handleSelect = (s: Suggestion) => {
    onChange({ ...slot, address: s.roadAddress || s.addressName, lawdCd: s.lawdCd })
    setSugg([]); setOpen(false)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div ref={ref} style={{ flex: 1, position: "relative" }}>
          <input
            value={slot.address}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => sugg.length > 0 && setOpen(true)}
            placeholder="예) 서울 강남구 대치동"
            style={{
              width: "100%", padding: "10px 36px 10px 12px",
              border: "1px solid #E5E7EB", borderRadius: 8,
              fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" as const,
            }}
          />
          {loading && (
            <div style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              width: 8, height: 8, borderRadius: "50%", background: C.brand,
              animation: "pulse-dot 1s ease-in-out infinite",
            }} />
          )}
          {slot.lawdCd && !loading && (
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.brand, fontSize: 16 }}>✓</div>
          )}
          {open && sugg.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
              background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.09)", overflow: "hidden", marginTop: 4,
            }}>
              {sugg.slice(0, 5).map((s, i) => (
                <button key={i} onMouseDown={() => handleSelect(s)} style={{
                  display: "block", width: "100%", padding: "10px 12px", textAlign: "left",
                  background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "#111827",
                  borderBottom: i < 4 ? "1px solid #F3F4F6" : "none",
                }}>
                  {s.roadAddress || s.addressName}
                </button>
              ))}
            </div>
          )}
        </div>
        {onMyProperty && (
          <button onClick={onMyProperty} style={{
            background: "#F0FDF4", color: C.brand, border: "1px solid #DCFCE7",
            borderRadius: 8, padding: "10px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>🏠 내 아파트</button>
        )}
      </div>
      <input
        value={slot.aptName}
        onChange={e => onChange({ ...slot, aptName: e.target.value })}
        placeholder="아파트명 (예: 래미안대치팰리스)"
        style={{
          width: "100%", padding: "10px 12px",
          border: "1px solid #E5E7EB", borderRadius: 8,
          fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" as const,
        }}
      />
    </div>
  )
}

// ── 스파크 차트 ───────────────────────────────────────────────
function SparkChart({ data }: { data: PricePoint[] }) {
  if (data.length < 2) return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
      차트 데이터 부족 (거래 데이터가 없는 월은 제외됩니다)
    </div>
  )

  const values = data.map(d => d.avg)
  const W = 320, H = 100
  const pad = { l: 4, r: 4, t: 10, b: 10 }
  const max = Math.max(...values), min = Math.min(...values) - 1000
  const rng = max - min || 1
  const xStep = (W - pad.l - pad.r) / (values.length - 1)
  const yScale = (H - pad.t - pad.b) / rng
  const pts = values.map((v, i) => ({ x: pad.l + i * xStep, y: H - pad.b - (v - min) * yScale }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ")
  const area = `M ${pts[0].x},${H - pad.b} ` + pts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${pts[pts.length - 1].x},${H - pad.b} Z`
  const last = pts[pts.length - 1]
  const latestVal = values[values.length - 1]
  const prevVal   = values[values.length - 2]
  const trendUp   = latestVal >= prevVal

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 2 }}>최근 실거래 평균</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>
            {fmtManwon(latestVal)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: trendUp ? C.safe : C.danger }}>
            {trendUp ? "▲" : "▼"} {fmtManwon(Math.abs(latestVal - prevVal))}
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>전월 대비</div>
        </div>
      </div>
      <svg width={W} height={H} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.safeBlue} stopOpacity=".2" />
            <stop offset="100%" stopColor={C.safeBlue} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#cg1)" />
        <path d={line} fill="none" stroke={C.safeBlue} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r={5} fill={C.safeBlue} stroke="white" strokeWidth={2} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "#9CA3AF" }}>{data[0].yyyymm}</span>
        <span style={{ fontSize: 9, color: "#9CA3AF" }}>{data[data.length - 1].yyyymm}</span>
      </div>
    </div>
  )
}

// ── 리스크 배너 ───────────────────────────────────────────────
function RiskBanner({ data, onCompare }: { data: RiskData; onCompare: () => void }) {
  const { safetyScore, regretPct, llm } = data
  const color = scoreToColor(safetyScore)
  const isHigh = safetyScore < 65

  return (
    <div style={{
      borderRadius: 18,
      padding: "20px 18px 16px",
      background: `linear-gradient(135deg, ${color}12 0%, #F9FAFB 100%)`,
      border: `1px solid ${color}38`,
      marginBottom: 16, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -40, right: -20, width: 140, height: 140, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}16 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* 레이블 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>{isHigh ? "⚠️" : "🛡️"}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          24개월 리스크 지표
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 11, fontWeight: 700, color,
          background: `${color}15`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${color}30`,
        }}>
          {scoreToLabel(safetyScore)}
        </span>
      </div>

      {/* 큰 숫자 + 안전 점수 */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 72, fontWeight: 900, lineHeight: 1,
            background: `linear-gradient(135deg, ${color}, ${isHigh ? C.dangerHot : C.safeBlue})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {regretPct}<span style={{ fontSize: 32 }}>%</span>
          </div>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          background: "white", border: "1px solid #E5E7EB", borderRadius: 14,
          padding: "10px 16px", marginBottom: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ position: "relative" }}>
            <ScoreRing score={safetyScore} size={80} sw={7} />
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{safetyScore}</div>
              <div style={{ fontSize: 8, color: "#9CA3AF" }}>점</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 4 }}>의사결정 안전 점수</div>
        </div>
      </div>

      {/* AI 요약 + 대안 비교 버튼 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
        background: "rgba(0,0,0,0.04)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)",
      }}>
        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.55, flex: 1, margin: 0 }}>
          {llm.alternativeTip}
        </p>
        <button onClick={onCompare} style={{
          background: `linear-gradient(135deg, ${C.danger}, ${C.safe})`,
          border: "none", borderRadius: 10, padding: "9px 14px",
          color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          boxShadow: "0 4px 10px rgba(249,115,22,0.28)", flexShrink: 0,
        }}>
          대안 비교 →
        </button>
      </div>
    </div>
  )
}

// ── 리스크 아이템 ─────────────────────────────────────────────
function RiskItem({ item }: { item: RiskItem }) {
  const cfg = {
    HIGH:   { bg: "#FFF7F0", border: "#FECACA", badge: C.danger,     text: "높음" },
    MEDIUM: { bg: "#FFFBEB", border: "#FDE68A", badge: C.dangerMild, text: "중간" },
    LOW:    { bg: "#F0FDF4", border: "#DCFCE7", badge: C.safe,       text: "낮음" },
  }[item.level]

  return (
    <div style={{
      padding: "14px 16px", background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 12, marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{item.title}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: cfg.badge,
            background: `${cfg.badge}18`, padding: "2px 8px", borderRadius: 6, border: `1px solid ${cfg.badge}28`,
          }}>{cfg.text}</span>
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>{item.description}</p>
      </div>
    </div>
  )
}

// ── ML 호라이즌 바 ────────────────────────────────────────────
function HorizonBars({ horizons }: { horizons: { horizon: number; regionScore: number | null; total: number; dirAcc: number }[] }) {
  return (
    <div>
      {[6, 12, 24, 36].map(h => {
        const row = horizons.find(x => x.horizon === h)
        if (!row) return null
        const score = row.regionScore ?? row.total  // [-1, +1]
        const pct = Math.round((score + 1) / 2 * 100)
        const color = score > 0.1 ? C.safe : score < -0.1 ? C.danger : C.dangerMild
        const label = score > 0.3 ? "리스크 낮음" : score > 0.1 ? "안전 소폭 개선" : score < -0.3 ? "리스크 확대" : score < -0.1 ? "주의 필요" : "중립"
        return (
          <div key={h} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{h}개월 후</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}15`, padding: "2px 8px", borderRadius: 4 }}>{label}</span>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>정확도 {Math.round(row.dirAcc * 100)}%</span>
              </div>
            </div>
            <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: "50%", top: 0, width: 2, height: "100%", background: "#D1D5DB" }} />
              <div style={{
                position: "absolute",
                left: score >= 0 ? "50%" : `${pct}%`,
                width: `${Math.abs(pct - 50)}%`,
                height: "100%", background: color, borderRadius: 4,
                transition: "width .8s ease-out",
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 비교 패널 (A vs B) ────────────────────────────────────────
function ComparePanel({ a, b }: { a: RiskData; b: RiskData }) {
  const riskDiff = a.regretPct - b.regretPct
  const better = riskDiff > 0 ? "B" : riskDiff < 0 ? "A" : "동일"

  const Card = ({ data, side }: { data: RiskData; side: "A" | "B" }) => {
    const isA = side === "A"
    const color = isA ? C.danger : C.safe
    return (
      <div style={{
        flex: 1, borderRadius: 16, padding: "16px 14px",
        background: isA ? "#FFF7F0" : "#F0FDF4",
        border: `1px solid ${isA ? "#FECACA" : "#DCFCE7"}`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -1, left: -1,
          background: color, borderRadius: "16px 0 12px 0",
          padding: "4px 12px", fontSize: 12, fontWeight: 900, color: "white",
        }}>{side}</div>

        <div style={{ textAlign: "center", marginTop: 22, marginBottom: 10 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <ScoreRing score={data.safetyScore} size={72} sw={6} />
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{data.safetyScore}</div>
              <div style={{ fontSize: 8, color: "#9CA3AF" }}>점</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{data.aptName}</div>
          {data.regionName && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{data.regionName}</div>}
        </div>

        <div style={{
          textAlign: "center", padding: "8px",
          background: `${color}12`, borderRadius: 10, border: `1px solid ${color}25`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 2 }}>리스크 지표</div>
          <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{data.regretPct}%</div>
        </div>

        {[
          { label: "평균 시세", value: data.stats ? fmtManwon(data.stats.avg) : "-" },
          { label: "거래 건수", value: `${data.stats?.count ?? 0}건` },
          { label: "오를지 엔진", value: data.mlEngineConnected ? "✅ 연결" : "⚠️ 미연결" },
        ].map((m, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", padding: "6px 0",
            borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none",
          }}>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>{m.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{m.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* 다이나믹 캐치프레이즈 */}
      <div style={{
        borderRadius: 16, padding: "18px 16px", marginBottom: 16, textAlign: "center",
        background: "linear-gradient(135deg, #FFF7F0 0%, #F0FDF4 100%)",
        border: "1px solid #E5E7EB",
        borderLeft: `4px solid ${riskDiff > 0 ? C.safe : C.danger}`,
      }}>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>
          {better === "B" ? "A 대신 B를 선택하면" : better === "A" ? "B 대신 A를 선택하면" : "두 단지의 리스크가 비슷합니다"}
        </div>
        {better !== "동일" && (
          <>
            <div style={{
              fontSize: 44, fontWeight: 900, lineHeight: 1, marginBottom: 4,
              background: `linear-gradient(135deg, ${C.danger}, ${C.safe})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              -{Math.abs(riskDiff)}%
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
              24개월 기준 리스크가 줄어듭니다
            </div>
          </>
        )}
        <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
          {a.llm.summary}
        </p>
      </div>

      {/* A vs B 카드 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <Card data={a} side="A" />
        <Card data={b} side="B" />
      </div>

      {/* CTA */}
      <button style={{
        width: "100%", padding: "16px", borderRadius: 14, border: "none",
        background: `linear-gradient(135deg, ${C.danger} 0%, ${C.safe} 100%)`,
        color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        boxShadow: "0 6px 20px rgba(249,115,22,0.30)",
      }}>
        <span>🔒</span>
        내 1억을 지키는 AI 리스크 헷징 리포트 확인하기
      </button>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
        오를지 엔진 v26.01 · 실거래 기반 · 지역 흐름 + 단지 보정 분석
      </div>
    </div>
  )
}

function NumericReport({ report }: { report?: RiskData["report"] }) {
  if (!report) return null

  const facts = report.facts ?? {}
  const sections = report.sections ?? []
  const assumptions = report.assumptions ?? []
  const decisionTables = report.decisionTables ?? []
  const personaSheets = report.personaSheets ?? []

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#print-report-root) { display: none !important; }
          #print-report-root { display: block !important; }
          .no-print { display: none !important; }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            page-break-inside: avoid;
          }
          @page { margin: 20mm; }
        }
      `}</style>
      <div id="print-report-root" style={{
        background: "#FFF",
        borderRadius: 16,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        overflow: "hidden",
        marginBottom: 16,
      }} className="print-card">
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid #F3F4F6",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{report.title || "전문가 리포트"}</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{report.oneLiner}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handlePrint}
            className="no-print"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#374151",
              background: "#F9FAFB",
              border: "1px solid #D1D5DB",
              borderRadius: 9999,
              padding: "4px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🖨️ PDF 저장
          </button>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#16A34A",
            background: "#F0FDF4",
            border: "1px solid #DCFCE7",
            borderRadius: 9999,
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}>
            {report.grade}
          </span>
        </div>
      </div>

      {report.article && (
        <div style={{ padding: "16px 18px 4px", background: "#FFFFFF" }}>
          {report.article.split(/\n\s*\n/).map((paragraph, i) => (
            <p key={i} style={{
              margin: i === 0 ? "0 0 14px" : "0 0 14px",
              fontSize: 13,
              color: "#111827",
              lineHeight: 1.9,
              whiteSpace: "pre-wrap",
            }}>
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {assumptions.length > 0 && (
        <div style={{ padding: "14px 18px 2px", background: "#FFFFFF" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
            입력 가정
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {assumptions.map((row) => (
              <div key={`${row.label}-${row.value}`} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: "10px 12px", background: "#F9FAFB" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", lineHeight: 1.4 }}>{row.value}</div>
                {row.note && (
                  <div style={{ fontSize: 10, color: "#6B7280", lineHeight: 1.5, marginTop: 4 }}>{row.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "14px 18px", background: "#F9FAFB" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
        }}>
          {[
            ["최근 거래", facts.latestTrade],
            ["방향 점수", facts.mlScore],
            ["전세가율", facts.jeonseRatio],
            ["리스크 지표", facts.regretPct],
            ["최근 평균가", facts.currentAvg],
            ["준공연도", facts.buildYear],
            ["호가 차이", facts.marketOffer],
            ["권장 할인율", facts.targetPrice],
            ["할인 기준", facts.discountPct],
            ["주변 초등학교", facts.schoolCount],
            ["주변 중학교", facts.middleSchoolCount],
            ["주변 고등학교", facts.highSchoolCount],
            ["주변 학원", facts.academyCount],
            ["가장 가까운 초등학교", facts.closestSchool],
            ["가장 가까운 중학교", facts.closestMiddleSchool],
            ["가장 가까운 고등학교", facts.closestHighSchool],
            ["초품아 여부", facts.choopuma],
          ].map(([label, value]) => (
            <div key={label} style={{
              background: "#FFF",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              padding: "10px 12px",
            }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", lineHeight: 1.4 }}>
                {value || "데이터 없음"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {decisionTables.length > 0 && (
        <div style={{ padding: "14px 18px 2px", background: "#FFFFFF" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
            결론형 계산표 / 비교표
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {decisionTables.map((table) => (
              <div key={table.id} style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{table.title}</div>
                  {table.description && (
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, lineHeight: 1.6 }}>
                      {table.description}
                    </div>
                  )}
                </div>
                {table.rows && table.rows.length > 0 && (
                  <div style={{ padding: "8px 14px" }}>
                    {table.rows.map((row) => (
                      <div key={`${table.id}-${row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 3 }}>{row.label}</div>
                          {row.note && <div style={{ fontSize: 10, color: "#9CA3AF", lineHeight: 1.5 }}>{row.note}</div>}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", textAlign: "right", whiteSpace: "nowrap" }}>
                          {row.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {table.cards && table.cards.length > 0 && (
                  <div style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
                    {table.cards.map((card) => (
                      <div key={`${table.id}-${card.title}`} style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 12px", background: "#FFFFFF" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{card.title}</div>
                        {card.subtitle && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{card.subtitle}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
                          {card.metrics.map((metric) => (
                            <div key={`${card.title}-${metric.label}`} style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 9px" }}>
                              <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 3 }}>{metric.label}</div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#111827" }}>{metric.value}</div>
                            </div>
                          ))}
                        </div>
                        {card.note && <div style={{ fontSize: 10, color: "#6B7280", marginTop: 8, lineHeight: 1.6 }}>{card.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {table.footnote && (
                  <div style={{ padding: "0 14px 12px", fontSize: 10, color: "#9CA3AF", lineHeight: 1.6 }}>
                    {table.footnote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {personaSheets.length > 0 && (
        <div style={{ padding: "14px 18px 2px", background: "#FFFFFF" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
            페르소나별 판단 시트
          </div>
          <PersonaSheetsAccordion sheets={personaSheets} />
        </div>
      )}

      <div style={{ padding: "6px 18px 16px" }}>
        {sections.map((section) => (
          <div key={section.id} style={{
            padding: "12px 0",
            borderBottom: "1px solid #F3F4F6",
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
              {section.heading}
            </div>
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8 }}>
              {section.body}
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.6, paddingTop: 10 }}>
          {report.disclaimer}
        </div>
      </div>
    </div>
    </>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function RiskPage() {
  const [step, setStep] = useState<"search" | "detail" | "compare-search" | "compare">("search")
  const [aptA, setAptA] = useState<AptSlot>({ address: "", aptName: "", lawdCd: "" })
  const [aptB, setAptB] = useState<AptSlot>({ address: "", aptName: "", lawdCd: "" })
  const [dataA, setDataA] = useState<RiskData | null>(null)
  const [dataB, setDataB] = useState<RiskData | null>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)
  const [tab, setTab] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const canAnalyzeA = !!(aptA.aptName && aptA.lawdCd)
  const canAnalyzeB = !!(aptB.aptName && aptB.lawdCd)

  // 내 아파트 불러오기
  const handleMyProperty = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch("/api/my-property", token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {})
      const data = await res.json()
      if (data.aptName) setAptA({ address: data.address || "", aptName: data.aptName, lawdCd: data.lawdCd || "" })
    } catch { /* ignore */ }
  }, [])

  const buildRiskAnalysisUrl = useCallback((slot: AptSlot) => {
    const params = new URLSearchParams({
      lawdCd: slot.lawdCd,
      aptName: slot.aptName,
      address: slot.address,
    })
    const currentSearch = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null
    const passthroughKeys = [
      "budget",
      "purpose",
      "reportMode",
      "cash",
      "cashOnHand",
      "loanAmount",
      "ltvPct",
      "interestRate",
      "loanYears",
      "homesOwned",
      "holdYears",
      "moveCost",
      "interiorCost",
      "monthlyFixedCost",
    ]
    passthroughKeys.forEach((key) => {
      const value = currentSearch?.get(key)
      if (value) params.set(key, value)
    })
    return `/api/risk-analysis?${params.toString()}`
  }, [])

  const analyzeA = async () => {
    if (!canAnalyzeA) return
    setLoadingA(true); setError(null)
    try {
      const res = await fetch(buildRiskAnalysisUrl(aptA))
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setDataA(data)
      setStep("detail")
      setTab(0)
    } catch (e) { setError(String(e)) }
    finally { setLoadingA(false) }
  }

  const analyzeB = async () => {
    if (!canAnalyzeB) return
    setLoadingB(true); setError(null)
    try {
      const res = await fetch(buildRiskAnalysisUrl(aptB))
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setDataB(data)
      setStep("compare")
    } catch (e) { setError(String(e)) }
    finally { setLoadingB(false) }
  }

  const tabs = ["24개월 리스크", "실거래 시세", "오를지 엔진 방향 예측"]

  return (
    <>
      <style>{`
        @media (min-width: 640px) { .risk-input-grid { max-width: 560px !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .9s linear infinite; display: inline-block; }
      `}</style>

      <div style={{ background: "#F4F6F9", minHeight: "100vh", paddingBottom: 80 }}>
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
            fontSize: 13, fontWeight: 700, color: C.danger,
            background: "#FFF7F0", padding: "4px 12px", borderRadius: 9999,
            border: "1px solid #FECACA",
          }}>🛡️ AI 리스크 헷징</span>
        </div>

        <div className="risk-input-grid" style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 0" }}>

          {/* ── STEP: 검색 화면 ── */}
          {(step === "search" || step === "detail" || step === "compare-search" || step === "compare") && (
            <div style={{
              background: "#FFF", borderRadius: 16, border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "20px", marginBottom: 16,
            }}>
              <div style={{ marginBottom: 16 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>🛡️ AI 리스크 헷징 분석</h1>
                <p style={{ fontSize: 13, color: "#6B7280", marginTop: 6, marginBottom: 0 }}>
                  이 아파트를 선택했을 때 <strong>24개월 기준 리스크 지표</strong>를 오를지 엔진 + AI가 실 데이터로 분석합니다
                </p>
              </div>

              <AptSearchInput
                label="분석할 아파트"
                slot={aptA}
                onChange={s => { setAptA(s); if (step !== "search") setStep("search") }}
                onMyProperty={handleMyProperty}
              />

              {error && (
                <div style={{
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, marginBottom: 12,
                }}>⚠️ {error}</div>
              )}

              <button
                onClick={analyzeA}
                disabled={!canAnalyzeA || loadingA}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12, border: "none",
                  background: canAnalyzeA && !loadingA ? `linear-gradient(135deg, ${C.danger} 0%, ${C.safe} 100%)` : "#E5E7EB",
                  color: canAnalyzeA && !loadingA ? "white" : "#9CA3AF",
                  fontSize: 15, fontWeight: 700, cursor: canAnalyzeA && !loadingA ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: canAnalyzeA && !loadingA ? "0 4px 14px rgba(249,115,22,0.30)" : "none",
                  transition: "all .2s",
                }}
              >
                {loadingA ? (
                  <><span className="spin">⏳</span> 오를지 엔진 + AI 분석 중... (10~30초)</>
                ) : canAnalyzeA ? (
                  <>🔍 24개월 리스크 분석하기</>
                ) : "주소와 아파트명을 입력해주세요"}
              </button>
            </div>
          )}

          {/* ── STEP: 상세 결과 ── */}
          {step !== "search" && dataA && (
            <div>
              {/* 단지 헤더 */}
              <div style={{
                background: "#FFF", borderRadius: 16, border: "1px solid #E5E7EB",
                padding: "16px 18px", marginBottom: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>분석 대상</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{dataA.aptName}</div>
                    {dataA.regionName && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{dataA.regionName}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>최근 거래</div>
                    {dataA.stats ? (
                      <>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{fmtManwon(dataA.stats.latest)}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{dataA.stats.latestDate}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: "#9CA3AF" }}>거래 없음</div>
                    )}
                  </div>
                </div>
                {dataA.stats && (
                  <div style={{
                    marginTop: 12, paddingTop: 12, borderTop: "1px solid #F3F4F6",
                    display: "flex", gap: 0,
                  }}>
                    {[
                      { label: "24개월 거래", value: `${dataA.stats.count}건` },
                      { label: "평균가", value: fmtManwon(dataA.stats.avg) },
                      { label: "최고가", value: fmtManwon(dataA.stats.max) },
                      { label: "오를지 엔진", value: dataA.mlEngineConnected ? "✅" : "⚠️ 미연결" },
                    ].map((item, i) => (
                      <div key={i} style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 리스크 배너 */}
              <RiskBanner data={dataA} onCompare={() => setStep("compare-search")} />

              {/* AI 분석 섹션 */}
              <div style={{
                background: "#FFF", borderRadius: 16, border: "1px solid #E5E7EB",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 16,
              }}>
                {/* 헤더 */}
                <div style={{
                  padding: "14px 18px", borderBottom: "1px solid #F3F4F6",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                  }}>🤖</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Orulzi AI 24개월 리스크 헷징 분석</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      오를지 엔진 v26.01 · KOSIS 실거래 · Gemini AI · 실시간 분석
                    </div>
                  </div>
                </div>

                {/* 한 줄 요약 */}
                <div style={{ padding: "12px 18px", background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                  <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, margin: 0 }}>
                    이 단지를 선택했을 때 발생할 수 있는{" "}
                    <span style={{ color: C.danger, fontWeight: 700 }}>최악의 시나리오</span>와,
                    더 안전한 대안을 제시합니다
                  </p>
                </div>

                {/* 탭 */}
                <div style={{ display: "flex", padding: "8px 18px", gap: 4, borderBottom: "1px solid #F3F4F6" }}>
                  {tabs.map((t, i) => (
                    <button key={i} onClick={() => setTab(i)} style={{
                      flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
                      background: tab === i
                        ? i === 0 ? C.danger : i === 2 ? C.safeBlue : C.safeBlue
                        : "transparent",
                      color: tab === i ? "white" : "#9CA3AF",
                      fontSize: 11, fontWeight: tab === i ? 700 : 400,
                      cursor: "pointer", transition: "all .15s",
                    }}>{t}</button>
                  ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div style={{ padding: "16px 18px" }}>

                  {/* 탭 0: 리스크 */}
                  {tab === 0 && (
                    <div>
                      {dataA.llm.risks.map((item, i) => (
                        <RiskItem key={i} item={item} />
                      ))}
                    </div>
                  )}

                  {/* 탭 1: 실거래 시세 */}
                  {tab === 1 && (
                    <div>
                      <SparkChart data={dataA.priceHistory} />
                      {dataA.stats && (
                        <div style={{
                          marginTop: 16, paddingTop: 16, borderTop: "1px solid #F3F4F6",
                          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                        }}>
                          {[
                            { label: "평균 거래가", value: fmtManwon(dataA.stats.avg), sub: `${dataA.stats.count}건 기준` },
                            { label: "최고 거래가", value: fmtManwon(dataA.stats.max), sub: "24개월 내" },
                            { label: "최저 거래가", value: fmtManwon(dataA.stats.min), sub: "24개월 내" },
                            { label: "최근 거래가", value: fmtManwon(dataA.stats.latest), sub: dataA.stats.latestDate },
                          ].map((item, i) => (
                            <div key={i} style={{
                              background: "#F9FAFB", borderRadius: 10, padding: "12px",
                              border: "1px solid #E5E7EB",
                            }}>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>{item.label}</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{item.value}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{item.sub}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 최근 실거래 2건 */}
                      {dataA.trades.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 8 }}>최근 실거래</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {dataA.trades.map((t, i) => (
                              <div key={i} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "#F9FAFB", borderRadius: 8, padding: "10px 12px",
                                border: "1px solid #E5E7EB",
                              }}>
                                <div style={{ fontSize: 12, color: "#374151" }}>
                                  {t.label || `${t.dealDate} · ${Math.round(t.area)}㎡ ${t.floor}층`}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>
                                  {fmtManwon(t.price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 평형별 시세 */}
                      {dataA.tradesByArea && Object.keys(dataA.tradesByArea).length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 8 }}>평형별 시세</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {Object.entries(dataA.tradesByArea)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([area, s]) => (
                              <div key={area} style={{
                                background: "#F9FAFB", borderRadius: 8, padding: "10px 12px",
                                border: "1px solid #E5E7EB",
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{area}㎡</div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>평균 {fmtManwon(s.avg)}</div>
                                </div>
                                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>{s.count}건</span>
                                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>최근 {fmtManwon(s.latest)} ({s.latestDate})</span>
                                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>{fmtManwon(s.min)}~{fmtManwon(s.max)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 탭 2: ML 방향 예측 */}
                  {tab === 2 && (
                    <div>
                      {dataA.mlEngineConnected ? (
                        <>
                          <div style={{
                            padding: "10px 12px", background: "#F0FDF4", borderRadius: 8,
                            border: "1px solid #DCFCE7", marginBottom: 14,
                          }}>
                            <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                              오를지 엔진 v26.01 · 실거래 기반 방향 참고 분석
                            </p>
                          </div>
                          <HorizonBars horizons={dataA.horizons} />
                        </>
                      ) : (
                        <div style={{ padding: "20px", textAlign: "center", color: "#9CA3AF" }}>
                          <div style={{ fontSize: 32, marginBottom: 10 }}>🔌</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>오를지 엔진 미연결</div>
                          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                            uvicorn api.main:app --host 0.0.0.0 --port 8000
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 매도 타이밍 시그널 */}
              {dataA.sellSignal && (
                <SellSignalBanner signal={dataA.sellSignal} />
              )}

              {/* 동네 랭킹 */}
              {dataA.ranking && (
                <RankingBadge ranking={dataA.ranking} />
              )}

              {/* 대안 단지 */}
              {dataA.alternatives && dataA.alternatives.length > 0 && (
                <AlternativesSection alternatives={dataA.alternatives} />
              )}

              <NumericReport report={dataA.report} />
            </div>
          )}

          {/* ── STEP: 대안 비교 검색 ── */}
          {step === "compare-search" && (
            <div style={{
              background: "#FFF", borderRadius: 16, border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "20px", marginBottom: 16,
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>
                🛡️ 대안 단지 리스크 비교
              </h2>
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: 0, marginBottom: 16 }}>
                Orulzi가 추천하는 대안 단지를 입력하면 리스크 지표를 나란히 비교합니다
              </p>

              <AptSearchInput
                label="대안 아파트 (B)"
                slot={aptB}
                onChange={setAptB}
              />

              <button
                onClick={analyzeB}
                disabled={!canAnalyzeB || loadingB}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12, border: "none",
                  background: canAnalyzeB && !loadingB ? `linear-gradient(135deg, ${C.safe}, ${C.safeBlue})` : "#E5E7EB",
                  color: canAnalyzeB && !loadingB ? "white" : "#9CA3AF",
                  fontSize: 15, fontWeight: 700,
                  cursor: canAnalyzeB && !loadingB ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loadingB ? (
                  <><span className="spin">⏳</span> 대안 단지 분석 중...</>
                ) : canAnalyzeB ? (
                  "⚖️ A vs B 리스크 비교하기"
                ) : "대안 아파트 주소와 이름을 입력하세요"}
              </button>
            </div>
          )}

          {/* ── STEP: 비교 결과 ── */}
          {step === "compare" && dataA && dataB && (
            <div style={{
              background: "#FFF", borderRadius: 16, border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "20px", marginBottom: 16,
            }}>
              <ComparePanel a={dataA} b={dataB} />
            </div>
          )}

        </div>
      </div>
    </>
  )
}
