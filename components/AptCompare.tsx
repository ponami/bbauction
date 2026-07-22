"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import AptSearchInput, { type AptSelection } from "@/components/AptSearchInput"
import ChecklistBlock from "@/components/reports/ChecklistBlock"
import DecisionPackCard from "@/components/reports/DecisionPackCard"
import { extractNeighborhoodName } from "@/lib/address"
import { schoolGradeLabel } from "@/lib/schoolGrade"
import { getChecklistPack, getDecisionPack } from "@/lib/reportProducts"
import { trackAnalyticsEvent } from "@/lib/analytics"
import {
  fetchCompareTwo,
  fetchCompareAvailable,
  buildEngineRows,
  type CompareTwoResponse,
  type EngineFields,
  type EngineRow,
} from "@/lib/compareEngine"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

// ── /apt/{id} 기본 정보 (점수 카드 + 비교표 하단 행) ─────────────
interface AptBasics {
  apt_nm?: string
  final_score?: number | null
  oreulji_score?: number | null
  risk_score?: number | null
  risk_level?: string | null
  jeonse_risk_level?: string | null
  school_score?: number | null
  kapt_ho_cnt?: number | null
  price?: number | null
  build_year?: number | null
}

async function fetchAptBasics(aptId: number): Promise<AptBasics | null> {
  try {
    const r = await fetch(`${GATE_URL}/apt/${aptId}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

// ── 실거래 보조 (기존 /api/compare-apts — 근거 섹션 전용) ────────
interface TradeRecord {
  aptName: string
  price: number
  area: number
  floor: string
  dealDate: string
  dong: string
}

interface AptCompareResult {
  name: string
  lawdCd: string
  trades: TradeRecord[]
  stats: { avg: number; min: number; max: number; count: number }
  mainAreas: string[]
  message?: string
}

interface CompareResponse {
  apt1: AptCompareResult
  apt2: AptCompareResult
  error?: string
}

function fmtPrice(manwon: number | null | undefined) {
  if (!manwon) return "-"
  if (manwon >= 10000) return `${(manwon / 10000).toFixed(1)}억`
  return `${manwon.toLocaleString("ko-KR")}만`
}

function buyerHint(score: number, jeonseRisk?: string | null): string {
  if (score >= 75) return "매수 적합"
  if (score >= 64) return "매수 고려 가능"
  if (score >= 56) return "조건부 검토 권장"
  if (score >= 50) {
    if (jeonseRisk === "높음") return "주의 (전세 리스크)"
    return "주의 필요"
  }
  return "매수 재고 권장"
}

function scoreGrad(score: number) {
  if (score >= 75) return "linear-gradient(135deg,#27AE60,#16A34A)"
  if (score >= 64) return "linear-gradient(135deg,#2ECC71,#10B981)"
  if (score >= 56) return "linear-gradient(135deg,#F1C40F,#F59E0B)"
  if (score >= 50) return "linear-gradient(135deg,#E67E22,#F59E0B)"
  return "linear-gradient(135deg,#E74C3C,#DC2626)"
}

// ── 인기 비교 프리셋 — 클릭 시 /apt/search로 apt_id 즉시 확정 ────
// (id 하드코딩 금지: 게이트 DB id 변경에 안전. sgg로 동명 단지 판별)
const PRESET_PAIRS: Array<{ label: string; a: { q: string; sgg: string }; b: { q: string; sgg: string } }> = [
  { label: "은마 vs 잠실엘스", a: { q: "은마", sgg: "11680" }, b: { q: "잠실엘스", sgg: "11710" } },
  { label: "잠실엘스 vs 파크리오", a: { q: "잠실엘스", sgg: "11710" }, b: { q: "파크리오", sgg: "11710" } },
]

async function resolveBySearch(q: string, sgg?: string): Promise<AptSelection | null> {
  try {
    const r = await fetch(`${GATE_URL}/apt/search?q=${encodeURIComponent(q)}&limit=8`)
    if (!r.ok) return null
    const data = await r.json()
    const results: Array<{ apt_id: number; apt_nm: string; sigungu_nm: string; umd_nm: string; sigungu_cd: string }> =
      data.results || []
    const hit = (sgg && results.find(x => x.sigungu_cd === sgg)) || results[0]
    if (!hit) return null
    return {
      aptId: hit.apt_id,
      aptName: hit.apt_nm,
      address: [hit.sigungu_nm, hit.umd_nm].filter(Boolean).join(" "),
      lawdCd: hit.sigungu_cd,
    }
  } catch {
    return null
  }
}

// ── 결과 패널 (실거래 근거 — 기존 유지) ──────────────────────────
function ResultPanel({ result }: { result: AptCompareResult; color: string }) {
  const { stats, trades, mainAreas } = result
  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 12,
      border: "1px solid #E5E7EB",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid #F3F4F6",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {result.name}
        </span>
        <span style={{
          background: "#F4F6F9", color: "#6B7280", borderRadius: 9999,
          padding: "2px 8px", fontSize: 11, fontWeight: 500, flexShrink: 0,
        }}>
          {stats.count}건
        </span>
      </div>

      <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "평균가", value: fmtPrice(stats.avg) },
          { label: "최저가", value: fmtPrice(stats.min) },
          { label: "최고가", value: fmtPrice(stats.max) },
        ].map(item => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{item.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginTop: 2 }}>{item.value}</div>
          </div>
        ))}
        {mainAreas.length > 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#6B7280", marginTop: 4 }}>
            주요 평형: {mainAreas.join(" · ")}
          </div>
        )}
      </div>

      <div style={{ padding: "0 18px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 8 }}>최근 거래</div>
        {trades.length > 0 ? (
          trades.slice(0, 5).map((t, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 0",
              borderBottom: i < Math.min(trades.length, 5) - 1 ? "1px solid #F9FAFB" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{t.dealDate}</span>
                <span style={{ fontSize: 13, color: "#374151", marginLeft: 8 }}>
                  {t.floor}층 · {Math.round(t.area / 3.3058)}평
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                {fmtPrice(t.price)}
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
            {result.message || "최근 거래 데이터가 없습니다"}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 커버리지 배지 — 선택 즉시 정밀 비교 가능 여부 표시 ──────────
function CoverageBadge({ sel, avail }: { sel: AptSelection | null; avail: boolean | null }) {
  if (!sel?.aptId || avail === null) return null
  return avail ? (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
      <span>✓</span><span>정밀 비교 가능 — 후회 신호·전망 순위 제공</span>
    </div>
  ) : (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 12, color: "#B45309", fontWeight: 600 }}>
      <span>ℹ️</span><span>정밀 비교 범위 밖 — 실거래 중심 비교로 제공</span>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function AptCompare() {
  const router = useRouter()
  const [selA, setSelA] = useState<AptSelection | null>(null)
  const [selB, setSelB] = useState<AptSelection | null>(null)
  // 프리셋/내아파트로 선택을 프로그램이 바꿀 때 검색 입력을 리마운트하기 위한 키
  const [slotKey, setSlotKey] = useState(0)

  const [loading, setLoading] = useState(false)
  const [engineData, setEngineData] = useState<CompareTwoResponse | null>(null)
  const [basics, setBasics] = useState<[AptBasics | null, AptBasics | null]>([null, null])
  const [compared, setCompared] = useState<[AptSelection, AptSelection] | null>(null)
  const [trades, setTrades] = useState<CompareResponse | null>(null)
  const [tradesLoading, setTradesLoading] = useState(false)
  const [presetLoading, setPresetLoading] = useState<string | null>(null)
  // 커버리지 사전 확인 배지 (true=정밀 비교 가능, false=범위 밖, null=미확인)
  const [availA, setAvailA] = useState<boolean | null>(null)
  const [availB, setAvailB] = useState<boolean | null>(null)
  const runIdRef = useRef(0)

  useEffect(() => {
    setAvailA(null)
    if (selA?.aptId) void fetchCompareAvailable(selA.aptId).then(setAvailA)
  }, [selA?.aptId])
  useEffect(() => {
    setAvailB(null)
    if (selB?.aptId) void fetchCompareAvailable(selB.aptId).then(setAvailB)
  }, [selB?.aptId])

  const compareDecisionPack = getDecisionPack({ productId: "compare-pack" })
  const compareChecklistPack = getChecklistPack({ productId: "compare-pack" })

  const canCompare = !!(selA?.aptId && selB?.aptId)

  const resetResults = () => {
    setEngineData(null)
    setBasics([null, null])
    setCompared(null)
    setTrades(null)
  }

  // 비교 실행: 엔진(compare/two) + 기본 정보(/apt/{id}×2) 병렬, 실거래는 지연 로드
  const runCompare = useCallback(async (a: AptSelection, b: AptSelection) => {
    const runId = ++runIdRef.current
    setLoading(true)
    resetResults()

    const leadId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("leadId") : null
    void trackAnalyticsEvent({
      eventType: "compare_entry",
      funnel: leadId ? "agent" : "consumer",
      source: "apt-compare",
      meta: { firstApt: a.aptName, secondApt: b.aptName },
    })

    const [engine, basicsA, basicsB] = await Promise.all([
      fetchCompareTwo(a.aptId, b.aptId),
      fetchAptBasics(a.aptId),
      fetchAptBasics(b.aptId),
    ])
    if (runId !== runIdRef.current) return
    setEngineData(engine)
    setBasics([basicsA, basicsB])
    setCompared([a, b])
    setLoading(false)

    if (leadId) {
      fetch("/api/lead-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          type: "compare_view",
          payload: {
            comparedApts: [
              { aptName: a.aptName, lawdCd: a.lawdCd, address: a.address, dong: extractNeighborhoodName(a.address) || undefined },
              { aptName: b.aptName, lawdCd: b.lawdCd, address: b.address, dong: extractNeighborhoodName(b.address) || undefined },
            ],
          },
        }),
      }).catch(() => {})
    }

    // 실거래 근거 — 지연 로드 (실패해도 본 결과에는 영향 없음)
    setTradesLoading(true)
    try {
      const url = `/api/compare-apts?apt1=${encodeURIComponent(a.aptName)}&apt1Lawd=${a.lawdCd}&apt1Address=${encodeURIComponent(a.address)}&apt2=${encodeURIComponent(b.aptName)}&apt2Lawd=${b.lawdCd}&apt2Address=${encodeURIComponent(b.address)}&months=36`
      const res = await fetch(url)
      const data = await res.json()
      if (runId === runIdRef.current && !data.error) setTrades(data)
    } catch {
      // 근거 섹션만 생략
    } finally {
      if (runId === runIdRef.current) setTradesLoading(false)
    }
  }, [])

  const handleCompare = useCallback(() => {
    if (selA && selB) void runCompare(selA, selB)
  }, [selA, selB, runCompare])

  // 프리셋: 검색으로 apt_id 확정 → 즉시 비교
  const handlePreset = useCallback(async (p: typeof PRESET_PAIRS[number]) => {
    setPresetLoading(p.label)
    const [a, b] = await Promise.all([
      resolveBySearch(p.a.q, p.a.sgg),
      resolveBySearch(p.b.q, p.b.sgg),
    ])
    setPresetLoading(null)
    if (!a || !b) return
    setSelA(a)
    setSelB(b)
    setSlotKey(k => k + 1)
    void runCompare(a, b)
  }, [runCompare])

  // 내 아파트 → /apt/lookup으로 apt_id 확정 후 ① 슬롯에
  const handleMyProperty = useCallback(async () => {
    try {
      const res = await fetch("/api/my-property")
      const data = await res.json()
      if (!data.aptName || !data.lawdCd) return
      const r = await fetch(`${GATE_URL}/apt/lookup?apt_nm=${encodeURIComponent(data.aptName)}&sigungu_cd=${data.lawdCd}`)
      if (!r.ok) return
      const apt = await r.json()
      setSelA({
        aptId: apt.apt_id,
        aptName: apt.apt_nm,
        address: [apt.sigungu_nm, apt.umd_nm].filter(Boolean).join(" "),
        lawdCd: apt.sigungu_cd,
      })
      setSlotKey(k => k + 1)
      resetResults()
    } catch {
      // ignore
    }
  }, [])

  // ── 비교표 행 구성: 엔진 행 + 기본 정보 행 ──────────────────────
  const buildAllRows = (): EngineRow[] => {
    const [ba, bb] = basics
    const ea: EngineFields = engineData
      ? {
          regret_score: engineData.regret_score_a,
          apt_position: engineData.apt_position_a,
          national_rank: engineData.national_rank_a,
          short_rank: engineData.short_rank_a,
          apt_rank_national: engineData.apt_rank_national_a,
        }
      : {}
    const eb: EngineFields = engineData
      ? {
          regret_score: engineData.regret_score_b,
          apt_position: engineData.apt_position_b,
          national_rank: engineData.national_rank_b,
          short_rank: engineData.short_rank_b,
          apt_rank_national: engineData.apt_rank_national_b,
        }
      : {}
    const rows: EngineRow[] = [...buildEngineRows(ea, eb)]

    if (ba || bb) {
      if (ba?.price != null || bb?.price != null) {
        rows.push({
          label: "매매가",
          a: fmtPrice(ba?.price),
          b: fmtPrice(bb?.price),
          winner: ba?.price && bb?.price ? (ba.price < bb.price ? "a" : bb.price < ba.price ? "b" : "tie") : undefined,
        })
      }
      if (ba?.risk_score != null || bb?.risk_score != null) {
        rows.push({
          label: "시장 위험도",
          a: ba?.risk_score != null ? `${ba.risk_score}점 (${ba.risk_level || ""})` : "-",
          b: bb?.risk_score != null ? `${bb.risk_score}점 (${bb.risk_level || ""})` : "-",
          winner: ba?.risk_score != null && bb?.risk_score != null
            ? (ba.risk_score < bb.risk_score ? "a" : bb.risk_score < ba.risk_score ? "b" : "tie")
            : undefined,
        })
      }
      if (ba?.jeonse_risk_level || bb?.jeonse_risk_level) {
        rows.push({
          label: "전세 위험도",
          a: ba?.jeonse_risk_level || "-",
          b: bb?.jeonse_risk_level || "-",
          winner:
            ba?.jeonse_risk_level === "낮음" && bb?.jeonse_risk_level !== "낮음" ? "a" :
            bb?.jeonse_risk_level === "낮음" && ba?.jeonse_risk_level !== "낮음" ? "b" : "tie",
        })
      }
      if (ba?.school_score != null || bb?.school_score != null) {
        rows.push({
          label: "학군",
          a: schoolGradeLabel(ba?.school_score) != null ? `${schoolGradeLabel(ba?.school_score)} · ${ba?.school_score}/100` : "-",
          b: schoolGradeLabel(bb?.school_score) != null ? `${schoolGradeLabel(bb?.school_score)} · ${bb?.school_score}/100` : "-",
          winner: ba?.school_score != null && bb?.school_score != null
            ? (ba.school_score > bb.school_score ? "a" : bb.school_score > ba.school_score ? "b" : "tie")
            : undefined,
        })
      }
      if (ba?.kapt_ho_cnt || bb?.kapt_ho_cnt) {
        rows.push({
          label: "세대수",
          a: ba?.kapt_ho_cnt ? `${ba.kapt_ho_cnt.toLocaleString("ko-KR")}세대` : "-",
          b: bb?.kapt_ho_cnt ? `${bb.kapt_ho_cnt.toLocaleString("ko-KR")}세대` : "-",
        })
      }
      if (ba?.build_year || bb?.build_year) {
        rows.push({
          label: "건축연도",
          a: ba?.build_year ? `${ba.build_year}년` : "-",
          b: bb?.build_year ? `${bb.build_year}년` : "-",
          winner: ba?.build_year && bb?.build_year
            ? (ba.build_year > bb.build_year ? "a" : bb.build_year > ba.build_year ? "b" : "tie")
            : undefined,
        })
      }
    }
    return rows
  }

  const btnStyle: React.CSSProperties = loading
    ? { background: "#15803D", color: "#FFFFFF", cursor: "not-allowed" }
    : canCompare
    ? { background: "#16A34A", color: "#FFFFFF", boxShadow: "0 4px 12px rgba(22,163,74,0.3)", cursor: "pointer" }
    : { background: "#E5E7EB", color: "#9CA3AF", cursor: "not-allowed" }

  const showResults = compared !== null && !loading
  const rows = showResults ? buildAllRows() : []
  const winnerIsA = engineData && compared ? engineData.winner_id === compared[0].aptId : null
  const winnerName = engineData && compared ? (winnerIsA ? compared[0].aptName : compared[1].aptName) : null
  const loserName = engineData && compared ? (winnerIsA ? compared[1].aptName : compared[0].aptName) : null

  return (
    <>
      <style>{`
        @media (min-width: 640px) {
          .apt-input-grid { grid-template-columns: 1fr auto 1fr !important; }
          .apt-vs-divider { display: flex !important; }
          .apt-result-grid { grid-template-columns: 1fr 1fr !important; }
          .apt-action-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div style={{ background: "#F4F6F9", padding: "48px 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* Section header */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>
              ⚖️ 아파트 1:1 비교
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 0 }}>
              고민 중인 두 아파트를 나란히 놓고 <strong>후회점수·전망 순위·실거래 근거</strong>로 어느 쪽이 후회가 덜할지 확인합니다
            </p>
          </div>

          {/* 콜드스타트: 인기 비교 프리셋 + 지도 탐색 */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>후보가 아직 없다면 —</span>
            {PRESET_PAIRS.map(p => (
              <button
                key={p.label}
                onClick={() => void handlePreset(p)}
                disabled={presetLoading !== null}
                style={{
                  background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 9999,
                  padding: "6px 12px", fontSize: 12, fontWeight: 600,
                  color: presetLoading === p.label ? "#9CA3AF" : "#374151",
                  cursor: presetLoading ? "default" : "pointer",
                }}
              >
                {presetLoading === p.label ? "불러오는 중…" : p.label}
              </button>
            ))}
            <button
              onClick={() => router.push("/map")}
              style={{
                background: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: 9999,
                padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#15803D", cursor: "pointer",
              }}
            >
              🗺️ 지도에서 후보 찾기
            </button>
          </div>

          {/* Input grid — 검색 기반 apt_id 확보 */}
          <div
            className="apt-input-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, alignItems: "start" }}
          >
            <div style={{
              background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)", padding: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>비교 아파트 ①</span>
                </div>
                <button
                  onClick={() => void handleMyProperty()}
                  style={{
                    background: "#F0FDF4", color: "#15803D", border: "1px solid #DCFCE7",
                    borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  🏠 내 아파트 넣기
                </button>
              </div>
              <AptSearchInput
                key={`a-${slotKey}`}
                value={selA}
                onChange={s => { setSelA(s); resetResults() }}
                placeholder="아파트명 검색 — 예: 은마, 잠실엘스"
              />
              <CoverageBadge sel={selA} avail={availA} />
            </div>

            <div
              className="apt-vs-divider"
              style={{ display: "none", alignItems: "center", justifyContent: "center", marginTop: 48 }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 9999,
                background: "#DCFCE7", color: "#16A34A",
                fontSize: 13, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                VS
              </div>
            </div>

            <div style={{
              background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)", padding: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>비교 아파트 ②</span>
              </div>
              <AptSearchInput
                key={`b-${slotKey}`}
                value={selB}
                onChange={s => { setSelB(s); resetResults() }}
                placeholder="아파트명 검색 — 예: 파크리오"
              />
              <CoverageBadge sel={selB} avail={availB} />
            </div>
          </div>

          {/* 커버리지 사전 안내 — 비교 누르기 전에 알려준다 */}
          {(availA === false || availB === false) && (
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 8,
              background: "#FFFBEB", border: "1px solid #FDE68A",
              fontSize: 12, color: "#92400E", lineHeight: 1.6,
            }}>
              선택한 단지 중 일부는 아직 <strong>정밀 비교(후회 신호·전망 순위) 범위 밖</strong>이에요 —
              주로 거래 이력이 짧은 신축이거나 거래가 적은 단지입니다.
              비교를 누르면 <strong>실거래 중심 비교</strong>로 제공됩니다.
            </div>
          )}

          {/* Compare button */}
          <button
            onClick={handleCompare}
            disabled={!canCompare || loading}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 10,
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              marginTop: 20,
              transition: "all .2s",
              ...btnStyle,
            }}
          >
            {loading ? "🔍 두 후보 비교 분석 중…" : canCompare ? "⚖️ 어느 쪽이 후회가 덜할지 비교하기" : "두 아파트를 검색해서 선택해주세요"}
          </button>

          {/* Results */}
          {showResults && compared && (
            <div>
              {/* ① 히어로 — 엔진 결론 (커버리지 밖이면 안내로 강등) */}
              {engineData ? (
                <div style={{
                  marginTop: 20,
                  background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
                  border: "1.5px solid #86EFAC",
                  borderRadius: 14, padding: "18px 20px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 6 }}>
                    오를지 엔진 분석 결과
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#14532D", lineHeight: 1.4 }}>
                    2년 뒤 기준, <span style={{ color: "#16A34A" }}>{winnerName}</span> 쪽이{" "}
                    {loserName}보다 후회가 덜할 확률{" "}
                    <span style={{ color: "#16A34A", fontSize: 20 }}>{Math.round(engineData.win_probability)}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#15803D", marginTop: 8 }}>
                    확률이 50%에 가까울수록 두 후보의 우열은 통계적으로 구별이 어렵습니다. 특정 부동산의 매매·투자를 권유하지 않습니다.
                  </div>
                </div>
              ) : (
                <div style={{
                  marginTop: 20,
                  background: "#F9FAFB", border: "1px solid #E5E7EB",
                  borderRadius: 14, padding: "16px 20px",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>
                    이 조합은 아직 정밀 비교 대상이 아니에요
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                    두 단지 중 일부가 후회점수 계산 커버리지 밖에 있어, 아래 기본 정보와 실거래 비교만 제공합니다.
                  </div>
                </div>
              )}

              {/* ② 점수 카드 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                {([0, 1] as const).map(i => {
                  const sel = compared[i]
                  const bs = basics[i]
                  const score = bs?.final_score ?? bs?.oreulji_score
                  const isWinner = engineData != null && (i === 0) === !!winnerIsA
                  return (
                    <div key={i} style={{
                      background: "#F9FAFB", borderRadius: 12, padding: "12px 10px",
                      border: isWinner ? "2px solid #16A34A" : "1.5px solid #E5E7EB",
                      position: "relative", textAlign: "center",
                    }}>
                      {isWinner && (
                        <div style={{
                          position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                          background: "#16A34A", color: "#fff", fontSize: 9, fontWeight: 700,
                          padding: "2px 8px", borderRadius: 20,
                        }}>후회 덜할 쪽</div>
                      )}
                      {score != null ? (
                        <div style={{
                          width: 52, height: 52, borderRadius: "50%", background: scoreGrad(score),
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          color: "#fff", margin: "0 auto 8px",
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{score}</div>
                          <div style={{ fontSize: 8, opacity: 0.8 }}>/ 100</div>
                        </div>
                      ) : (
                        <div style={{
                          width: 52, height: 52, borderRadius: "50%", background: "#E5E7EB",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#9CA3AF", margin: "0 auto 8px", fontSize: 16, fontWeight: 800,
                        }}>—</div>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.3, marginBottom: 4 }}>
                        {sel.aptName}
                      </div>
                      <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 6 }}>{sel.address}</div>
                      {score != null && (
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>
                          {buyerHint(score, bs?.jeonse_risk_level)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ③ 비교표 */}
              {rows.length > 0 && (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr",
                    marginTop: 16, marginBottom: 4,
                  }}>
                    <div />
                    <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "right", paddingRight: 8 }}>{compared[0].aptName.slice(0, 10)}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "right", paddingRight: 8 }}>{compared[1].aptName.slice(0, 10)}</div>
                  </div>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #E5E7EB", background: "#fff" }}>
                    {rows.map((row, idx) => (
                      <div key={row.label} style={{
                        display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr",
                        background: idx % 2 === 0 ? "#F9FAFB" : "#fff",
                        borderBottom: idx < rows.length - 1 ? "1px solid #E5E7EB" : "none",
                      }}>
                        <div style={{
                          padding: "9px 8px", fontSize: 11, color: "#6B7280", fontWeight: 600,
                          display: "flex", alignItems: "center",
                        }}>
                          {row.label}
                        </div>
                        <div style={{
                          padding: "9px 8px", fontSize: 12, fontWeight: 700,
                          color: row.winner === "a" ? "#16A34A" : "#374151",
                          display: "flex", alignItems: "center", justifyContent: "flex-end",
                          background: row.winner === "a" ? "rgba(22,163,74,0.06)" : undefined,
                        }}>
                          {row.winner === "a" && <span style={{ marginRight: 3, fontSize: 10 }}>✓</span>}
                          {row.a}
                        </div>
                        <div style={{
                          padding: "9px 8px", fontSize: 12, fontWeight: 700,
                          color: row.winner === "b" ? "#16A34A" : "#374151",
                          display: "flex", alignItems: "center", justifyContent: "flex-end",
                          background: row.winner === "b" ? "rgba(22,163,74,0.06)" : undefined,
                        }}>
                          {row.winner === "b" && <span style={{ marginRight: 3, fontSize: 10 }}>✓</span>}
                          {row.b}
                        </div>
                        {row.note ? (
                          <div style={{
                            gridColumn: "1 / -1", padding: "2px 8px 6px", fontSize: 10, color: "#9CA3AF",
                            fontStyle: "italic",
                          }}>
                            {row.note}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ④ 유료 경계 — 왜 이런 결과인가 */}
              <div style={{
                marginTop: 16, padding: "16px 20px",
                background: "linear-gradient(135deg, #FFF7F0 0%, #F0FDF4 100%)",
                border: "1px solid #E5E7EB", borderRadius: 12,
                borderLeft: "4px solid #16A34A",
              }}>
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, margin: 0 }}>
                  💬 <strong>왜 이런 결과가 나왔을까요?</strong> 원인 분해 · 계약 전 체크포인트 ·
                  가족과 공유할 결론 1페이지는 <strong>비교 결정 리포트</strong>에서 확인할 수 있습니다.
                </p>
              </div>

              <div
                className="apt-action-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 16 }}
              >
                {([0, 1] as const).map(i => {
                  const sel = compared[i]
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const p = new URLSearchParams({ address: sel.address, apt: sel.aptName, lawdCd: sel.lawdCd })
                        router.push(`/dashboard?${p.toString()}`)
                      }}
                      style={{
                        background: i === 0 ? "#FFF7F0" : "#F0FDF4",
                        color: i === 0 ? "#F97316" : "#16A34A",
                        border: i === 0 ? "1px solid #FDE8D0" : "1px solid #DCFCE7",
                        borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      🔒 {i === 0 ? "①" : "②"} {sel.aptName} — AI 리스크 헷징 리포트 →
                    </button>
                  )
                })}
              </div>

              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                <DecisionPackCard
                  title={compareDecisionPack.title}
                  subtitle={compareDecisionPack.subtitle}
                  signals={compareDecisionPack.signals}
                />
                <ChecklistBlock title={compareChecklistPack.title} items={compareChecklistPack.items} />
              </div>

              {/* ⑤ 실거래 근거 (지연 로드) */}
              {tradesLoading && (
                <div style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 20 }}>
                  실거래 근거 불러오는 중…
                </div>
              )}
              {trades && !trades.error && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
                    📄 실거래 근거 <span style={{ fontWeight: 400, color: "#9CA3AF" }}>— 최근 36개월, 참고용</span>
                  </div>
                  <div
                    className="apt-result-grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}
                  >
                    <ResultPanel result={trades.apt1} color="#2563EB" />
                    <ResultPanel result={trades.apt2} color="#D97706" />
                  </div>
                </div>
              )}

              {/* ⑥ 재방문 훅 */}
              <div style={{
                marginTop: 20, textAlign: "center",
                fontSize: 12, color: "#6B7280",
              }}>
                🔄 전망 순위는 <strong>매주 일요일</strong> 갱신됩니다 — 계약 전이라면 갱신 후 한 번 더 확인해 보세요.
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
