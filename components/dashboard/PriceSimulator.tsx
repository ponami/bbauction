"use client"

import { useState, useMemo, useCallback } from "react"
import type { CategoryId, CategoryResult, DashboardData } from "@/lib/types"

const YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]

const EVENTS = [
  { year: 2026, label: "지역 개발 호재",     pct: 3,  isMetro: false },
  { year: 2027, label: "교통망 착공 기대감", pct: 5,  isMetro: false },
  { year: 2028, label: "광역교통 진행",      pct: 3,  isMetro: false },
  { year: 2030, label: "광역교통 선착공",    pct: 5,  isMetro: false },
  { year: 2033, label: "교통 개통 효과",     pct: 0,  isMetro: true  },
]

interface Params {
  curPrice: number; baseRate: number; metro: number
  school: number; rateDrag: number; supplyDrag: number; policyDrag: number
}
type Scenario = "bear" | "base" | "bull"

function deriveDefaults(categories: Record<CategoryId, CategoryResult>, totalScore: number, invest: number): Params {
  const t  = categories.transport?.score ?? 70
  const sc = categories.school?.score    ?? 70
  const gl = categories.global?.score   ?? 55
  const mk = categories.market?.score   ?? 68
  const po = categories.policy?.score   ?? 58
  return {
    curPrice:   invest + 1000,
    baseRate:   Math.max(1, Math.round(totalScore * 0.06)),
    metro:      Math.round(t * 0.15),
    school:     Math.round(sc * 0.08),
    rateDrag:   Math.max(0, Math.round((100 - gl) * 0.07)),
    supplyDrag: Math.max(0, Math.round((100 - mk) * 0.06)),
    policyDrag: Math.max(0, Math.round((100 - po) * 0.04)),
  }
}

function annualNetRate(p: Params, scenario: Scenario) {
  const bm = scenario === "bear" ? 0.45 : scenario === "bull" ? 1.85 : 1.0
  const em = scenario === "bear" ? 0.40 : scenario === "bull" ? 1.60 : 1.0
  return (p.baseRate * bm + p.school * 0.3 * em - p.rateDrag * 0.6 - p.supplyDrag * 0.5 - p.policyDrag * 0.4) / 100
}

function calcSeries(p: Params, scenario: Scenario, invest: number): number[] {
  const em = scenario === "bear" ? 0.40 : scenario === "bull" ? 1.60 : 1.0
  const annualNet = annualNetRate(p, scenario)
  let price = p.curPrice
  return YEARS.map((yr) => {
    price *= (1 + annualNet)
    const ev = EVENTS.find((e) => e.year === yr)
    if (ev) price *= 1 + (ev.isMetro ? p.metro * em : ev.pct * em * 0.4) / 100
    return Math.round(price)
  })
}

function fmt(v: number) {
  return v >= 10000 ? `${(v / 10000).toFixed(1)}억원` : `${v.toLocaleString("ko-KR")}만원`
}

function fmtDiff(v: number) {
  const sign = v >= 0 ? "+" : ""
  return `${sign}${v >= 10000 ? (v / 10000).toFixed(1) + "억" : v.toLocaleString("ko-KR") + "만"}`
}

function monthlyRateFromAnnual(annual: number) {
  if (annual <= -0.95) return -0.95
  return Math.pow(1 + annual, 1 / 12) - 1
}

// ── SVG 차트 ─────────────────────────────────────────────────────
function LineChart({ bear, base, bull, invest }: { bear: number[]; base: number[]; bull: number[]; invest: number }) {
  const W = 560, H = 220, PL = 72, PR = 16, PT = 12, PB = 32
  const all = [...bear, ...base, ...bull, invest]
  const minV = Math.min(...all) * 0.96
  const maxV = Math.max(...all) * 1.02
  const xS = (i: number) => PL + (i / (YEARS.length - 1)) * (W - PL - PR)
  const yS = (v: number) => PT + (1 - (v - minV) / (maxV - minV)) * (H - PT - PB)
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(" ")
  const ticks = Array.from({ length: 5 }, (_, i) => minV + (i / 4) * (maxV - minV))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* 그리드 */}
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PL} y1={yS(v)} x2={W - PR} y2={yS(v)} stroke="#E8EDF5" strokeWidth="1" />
          <text x={PL - 5} y={yS(v) + 4} textAnchor="end" fontSize="9" fill="#8FA8D0">
            {v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v / 1000)}천`}
          </text>
        </g>
      ))}
      {/* 투자금선 */}
      <line x1={PL} y1={yS(invest)} x2={W - PR} y2={yS(invest)} stroke="#C5D4EC" strokeWidth="1.5" strokeDasharray="5,4" />
      <text x={W - PR - 2} y={yS(invest) - 5} textAnchor="end" fontSize="9" fill="#8FA8D0">투자금</text>
      {/* 시나리오 라인 */}
      <path d={path(bear)} fill="none" stroke="#EF5350" strokeWidth="1.5" />
      <path d={path(bull)} fill="none" stroke="#43A047" strokeWidth="1.5" />
      <path d={path(base)} fill="none" stroke="#1B4FBB" strokeWidth="2.5" />
      {/* 기본 포인트 */}
      {base.map((v, i) => (
        <circle key={i} cx={xS(i)} cy={yS(v)} r="3" fill="#1B4FBB" stroke="#FFF" strokeWidth="1.5" />
      ))}
      {/* X 라벨 */}
      {YEARS.map((yr, i) => (
        <text key={yr} x={xS(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#8FA8D0">{yr}</text>
      ))}
    </svg>
  )
}

// ── 슬라이더 행 ──────────────────────────────────────────────────
function SliderRow({ label, id, min, max, step, value, fmt: fmtFn, onChange, hint, aiScore }: {
  label: string; id: string; min: number; max: number; step: number; value: number
  fmt: (v: number) => string; onChange: (v: number) => void; hint?: string; aiScore?: number
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 12, color: "#4A5568", fontWeight: 600 }}>{label}</span>
          {hint && aiScore !== undefined && (
            <span style={{
              marginLeft: 8, fontSize: 10,
              background: "#EEF3FC", color: "#1B4FBB",
              padding: "2px 7px", borderRadius: 3, fontWeight: 600,
            }}>AI {aiScore}점 반영</span>
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#1B4FBB", fontVariantNumeric: "tabular-nums" }}>
          {fmtFn(value)}
        </span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 4, accentColor: "#1B4FBB" }}
      />
      {hint && <div style={{ fontSize: 10, color: "#A0B0CC", marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

// ── 결과 카드 ────────────────────────────────────────────────────
function ResultCard({ label, value, roi, color, isOptimal }: {
  label: string; value: string; roi: number; color: string; isOptimal?: boolean
}) {
  return (
    <div style={{
      padding: "14px 16px",
      background: isOptimal ? "#FFFBF0" : "#F8FAFF",
      border: `1px solid ${isOptimal ? "#C9A84C" : "#E8EDF5"}`,
      borderRadius: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isOptimal && (
            <span style={{ background: "#C9A84C", color: "#0A2463", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 3 }}>최적</span>
          )}
          <span style={{ fontSize: 12, color: "#4A5568", fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 900, color }}>{roi >= 0 ? "+" : ""}{roi}%</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#1A2B4A" }}>{value}</div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────
export function PriceSimulator({ data }: { data: DashboardData }) {
  const { categories, totalScore, myProperty } = data
  const invest = myProperty.totalInvestment > 0 ? myProperty.totalInvestment : 20000  // 미설정 시 2억원 기본값
  const defaults = useMemo(() => deriveDefaults(categories, totalScore, invest), [categories, totalScore, invest])
  const [p, setP] = useState<Params>(defaults)
  const set = useCallback((k: keyof Params) => (v: number) => setP((prev) => ({ ...prev, [k]: v })), [])

  const [calc, setCalc] = useState({
    sellPrice: defaults.curPrice,
    brokerPct: 0.5,
    taxPct: 10,
    otherCosts: 0,
    loanBalance: 0,
  })

  const bear = useMemo(() => calcSeries(p, "bear", invest), [p, invest])
  const base = useMemo(() => calcSeries(p, "base", invest), [p, invest])
  const bull = useMemo(() => calcSeries(p, "bull", invest), [p, invest])

  const baseFinal  = base[base.length - 1]
  const bearFinal  = bear[bear.length - 1]
  const bullFinal  = bull[bull.length - 1]
  const safe = invest > 0 ? invest : 1
  const baseRoi    = Math.round((baseFinal - invest) / safe * 100)
  const bearRoi    = Math.round((bearFinal - invest) / safe * 100)
  const bullRoi    = Math.round((bullFinal - invest) / safe * 100)

  const gains  = base.map((v, i) => i === 0 ? v - p.curPrice : v - base[i - 1])
  const bestIdx = gains.indexOf(Math.max(...gains))

  const feePct = calc.brokerPct + calc.taxPct
  const fees = Math.round(calc.sellPrice * feePct / 100)
  const netProceeds = Math.round(calc.sellPrice - fees - calc.otherCosts - calc.loanBalance)
  const profit = Math.round(netProceeds - invest)
  const roi = invest > 0 ? Math.round((profit / invest) * 100) : 0

  const horizons = [6, 12, 24]
  const scenarios: Array<{ key: Scenario; label: string; color: string }> = [
    { key: "bear", label: "보수", color: "#EF5350" },
    { key: "base", label: "중립", color: "#1B4FBB" },
    { key: "bull", label: "공격", color: "#43A047" },
  ]
  const scenarioRows = scenarios.map((s) => {
    const annual = annualNetRate(p, s.key)
    const monthly = monthlyRateFromAnnual(annual)
    const prices = horizons.map((m) => Math.round(p.curPrice * Math.pow(1 + monthly, m)))
    return { ...s, prices }
  })

  const netFor = (price: number) => {
    const fee = Math.round(price * feePct / 100)
    return Math.round(price - fee - calc.otherCosts - calc.loanBalance)
  }
  
  // 동적 변수 라벨 (AI 분석 결과 기반)
  const dynamicTransportLabel = categories.transport?.items?.[0]?.name || "핵심 교통 호재"

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .price-simulator-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
    <div className="price-simulator-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>

      {/* 왼쪽: 차트 + 슬라이더 */}
      <div>
        {/* 상단 액션 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2B4A" }}>2026~2035년 예상 가격 추이</div>
            <div style={{ fontSize: 11, color: "#8FA8D0", marginTop: 2 }}>AI 분석 점수가 슬라이더 기본값에 자동 반영됩니다</div>
          </div>
          <button onClick={() => setP(defaults)} style={{
            padding: "7px 14px", borderRadius: 6,
            background: "#EEF3FC", border: "1px solid #D8E4F5",
            color: "#1B4FBB", fontSize: 11, fontWeight: 700,
          }}>↺ AI 기본값으로 초기화</button>
        </div>

        {/* 범례 */}
        <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
          {[
            { color: "#43A047", label: `낙관  ${fmt(bullFinal)}` },
            { color: "#1B4FBB", label: `기본  ${fmt(baseFinal)}` },
            { color: "#EF5350", label: `비관  ${fmt(bearFinal)}` },
          ].map((l) => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6B7FA3" }}>
              <span style={{ width: 22, height: 2.5, background: l.color, borderRadius: 2, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </div>

        {/* 차트 */}
        <div style={{
          background: "#F8FAFF", border: "1px solid #E8EDF5",
          borderRadius: 10, padding: "14px 10px 8px", marginBottom: 20,
        }}>
          <LineChart bear={bear} base={base} bull={bull} invest={invest} />
        </div>

        {/* 슬라이더 영역 */}
        <div style={{
          background: "#F8FAFF", border: "1px solid #E8EDF5",
          borderRadius: 10, padding: "18px 20px",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#6B7FA3",
            letterSpacing: "0.05em", marginBottom: 16,
            paddingBottom: 10, borderBottom: "1px solid #E8EDF5",
          }}>
            변수 조정 (AI 점수 자동 반영 → 직접 수정 가능)
          </div>

          <SliderRow label="현재 추정 시세" id="cur" min={Math.max(5000, Math.round(invest * 0.5))} max={Math.max(50000, Math.round(invest * 3))} step={500} value={p.curPrice}
            fmt={(v) => `${v.toLocaleString("ko-KR")}만원`} onChange={set("curPrice")} />
          <SliderRow label="연간 기본 상승률" id="br" min={1} max={9} step={0.5} value={p.baseRate}
            fmt={(v) => `${v.toFixed(1)}%`} onChange={set("baseRate")}
            hint="종합점수 기반 자동 설정" aiScore={totalScore} />
          <SliderRow label={`${dynamicTransportLabel} 효과`} id="metro" min={0} max={20} step={1} value={p.metro}
            fmt={(v) => `+${v}%`} onChange={set("metro")}
            hint="교통호재 점수 반영" aiScore={categories.transport?.score} />
          <SliderRow label="초품아 프리미엄" id="school" min={0} max={10} step={1} value={p.school}
            fmt={(v) => `+${v}%`} onChange={set("school")}
            hint="초품아·학군 점수 반영" aiScore={categories.school?.score} />
          <SliderRow label="금리 부담 (하락 요인)" id="rate" min={0} max={8} step={1} value={p.rateDrag}
            fmt={(v) => `-${v}%`} onChange={set("rateDrag")}
            hint="세계경제 점수 반영 (역방향)" aiScore={categories.global?.score} />
          <SliderRow label="공급 부담 (하락 요인)" id="supply" min={0} max={8} step={1} value={p.supplyDrag}
            fmt={(v) => `-${v}%`} onChange={set("supplyDrag")}
            hint="부동산시장 점수 반영 (역방향)" aiScore={categories.market?.score} />
          <SliderRow label="정책 규제 부담" id="policy" min={0} max={6} step={1} value={p.policyDrag}
            fmt={(v) => `-${v}%`} onChange={set("policyDrag")}
            hint="부동산정책 점수 반영 (역방향)" aiScore={categories.policy?.score} />
        </div>
      </div>

      {/* 오른쪽: 결과 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 즉시 매도 계산기 */}
        <div style={{ background: "#FFF", border: "1px solid #E8EDF5", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#0A2463", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FFF" }}>즉시 매도 계산기</span>
            <button
              onClick={() => setCalc((prev) => ({ ...prev, sellPrice: p.curPrice }))}
              style={{
                padding: "5px 10px", borderRadius: 5,
                background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.4)",
                color: "#C9A84C", fontSize: 10, fontWeight: 700,
              }}
            >현재 시세 반영</button>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ fontSize: 11, color: "#6B7FA3" }}>
                예상 매도가(만원)
                <input
                  type="number"
                  value={calc.sellPrice}
                  onChange={(e) => setCalc((prev) => ({ ...prev, sellPrice: Number(e.target.value) }))}
                  style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E8EDF5", fontSize: 12 }}
                />
              </label>
              <label style={{ fontSize: 11, color: "#6B7FA3" }}>
                기타 비용(만원)
                <input
                  type="number"
                  value={calc.otherCosts}
                  onChange={(e) => setCalc((prev) => ({ ...prev, otherCosts: Number(e.target.value) }))}
                  style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E8EDF5", fontSize: 12 }}
                />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ fontSize: 11, color: "#6B7FA3" }}>
                중개수수료(%)
                <input
                  type="number"
                  step="0.1"
                  value={calc.brokerPct}
                  onChange={(e) => setCalc((prev) => ({ ...prev, brokerPct: Number(e.target.value) }))}
                  style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E8EDF5", fontSize: 12 }}
                />
              </label>
              <label style={{ fontSize: 11, color: "#6B7FA3" }}>
                세금율(%)
                <input
                  type="number"
                  step="0.1"
                  value={calc.taxPct}
                  onChange={(e) => setCalc((prev) => ({ ...prev, taxPct: Number(e.target.value) }))}
                  style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E8EDF5", fontSize: 12 }}
                />
              </label>
            </div>
            <label style={{ fontSize: 11, color: "#6B7FA3" }}>
              대출 잔액(만원)
              <input
                type="number"
                value={calc.loanBalance}
                onChange={(e) => setCalc((prev) => ({ ...prev, loanBalance: Number(e.target.value) }))}
                style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E8EDF5", fontSize: 12 }}
              />
            </label>

            <div style={{ padding: "10px 12px", background: "#F8FAFF", border: "1px solid #E8EDF5", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7FA3" }}>
                <span>수수료+세금</span>
                <span>{fees.toLocaleString("ko-KR")}만원 ({feePct.toFixed(1)}%)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6 }}>
                <span style={{ color: "#1A2B4A", fontWeight: 700 }}>순수령액</span>
                <span style={{ color: "#1B4FBB", fontWeight: 800 }}>{netProceeds.toLocaleString("ko-KR")}만원</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                <span style={{ color: "#1A2B4A", fontWeight: 700 }}>순이익</span>
                <span style={{ color: profit >= 0 ? "#2E7D32" : "#C62828", fontWeight: 800 }}>
                  {profit >= 0 ? "+" : ""}{profit.toLocaleString("ko-KR")}만원 ({roi}%)
                </span>
              </div>
            </div>

            <div style={{ fontSize: 10, color: "#A0B0CC" }}>
              순이익 = 순수령액 - 총 투자금. 세금율은 사용자 입력 기준입니다.
            </div>
          </div>
        </div>

        {/* 6/12/24개월 시나리오 */}
        <div style={{ background: "#FFF", border: "1px solid #E8EDF5", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#0A2463", padding: "12px 18px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FFF" }}>6·12·24개월 순이익 비교</span>
          </div>
          <div style={{ padding: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 10, color: "#8FA8D0", padding: "6px 8px" }}>가정</th>
                  {horizons.map((m) => (
                    <th key={m} style={{ textAlign: "right", fontSize: 10, color: "#8FA8D0", padding: "6px 8px" }}>
                      {m}개월
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarioRows.map((row) => (
                  <tr key={row.key}>
                    <td style={{ padding: "8px", fontSize: 11, fontWeight: 700, color: row.color }}>{row.label}</td>
                    {row.prices.map((price, i) => {
                      const net = netFor(price)
                      const prof = net - invest
                      return (
                        <td key={i} style={{ padding: "6px 8px", textAlign: "right" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: prof >= 0 ? "#2E7D32" : "#C62828" }}>
                            {prof >= 0 ? "+" : ""}{Math.round(prof).toLocaleString("ko-KR")}만
                          </div>
                          <div style={{ fontSize: 9, color: "#8FA8D0" }}>{Math.round(net).toLocaleString("ko-KR")}만</div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2035년 예측 */}
        <div style={{ background: "#F8FAFF", border: "1px solid #E8EDF5", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#0A2463", padding: "12px 18px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FFF" }}>2035년 예측 결과</span>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <ResultCard label="비관 시나리오" value={fmt(bearFinal)} roi={bearRoi} color="#EF5350" />
            <ResultCard label="기본 시나리오" value={fmt(baseFinal)} roi={baseRoi} color="#1B4FBB" />
            <ResultCard label="낙관 시나리오" value={fmt(bullFinal)} roi={bullRoi} color="#43A047" />
          </div>
        </div>

        {/* 최적 시점 */}
        <div style={{
          background: "#FFFBF0", border: "1px solid #C9A84C",
          borderRadius: 10, padding: "18px",
        }}>
          <div style={{ fontSize: 11, color: "#6B7FA3", marginBottom: 6 }}>AI 산출 최적 매도 시점</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#C9A84C", marginBottom: 6 }}>
            {YEARS[bestIdx]}년
          </div>
          <div style={{ fontSize: 11, color: "#4A5568" }}>
            기본 시나리오 기준 연간 상승폭 최대<br />
            예상가 <strong>{fmt(base[bestIdx])}</strong><br />
            투자 수익 <strong style={{ color: "#2E7D32" }}>{fmtDiff(base[bestIdx] - invest)}</strong>
          </div>
        </div>

        {/* 이벤트 */}
        <div style={{ background: "#F8FAFF", border: "1px solid #E8EDF5", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#0A2463", padding: "12px 18px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FFF" }}>주요 이벤트 효과</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFF" }}>
                {["연도", "이벤트", "효과"].map((h) => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 700, color: "#8FA8D0", padding: "8px 12px", textAlign: "left", border: "1px solid #E8EDF5" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENTS.map((ev, i) => {
                const boost = ev.isMetro ? p.metro : Math.round(ev.pct * 0.4)
                return (
                  <tr key={ev.year} style={{ background: i % 2 === 0 ? "#FFF" : "#FAFBFF" }}>
                    <td style={{ padding: "9px 12px", border: "1px solid #E8EDF5", fontSize: 11, fontWeight: 700, color: "#1A2B4A" }}>{ev.year}</td>
                    <td style={{ padding: "9px 12px", border: "1px solid #E8EDF5", fontSize: 11, color: "#4A5568" }}>{ev.label}</td>
                    <td style={{ padding: "9px 12px", border: "1px solid #E8EDF5", fontSize: 11, fontWeight: 700, color: "#2E7D32" }}>+{boost}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 면책 */}
        <div style={{ fontSize: 10, color: "#A0B0CC", lineHeight: 1.8, padding: "10px 12px", background: "#F8FAFF", border: "1px solid #E8EDF5", borderRadius: 8 }}>
          본 시뮬레이터는 AI 기반 참고용이며 실제 투자 수익을 보장하지 않습니다.
          양도소득세·보유세 등 세무 비용은 별도 계산이 필요합니다.
        </div>
      </div>
    </div>
    </>
  )
}
