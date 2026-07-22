"use client"

import { useState } from "react"
import TradeupScoreCard, { fetchTradeupScore, type TradeupScoreData } from "@/components/dashboard/TradeupScoreCard"
import { schoolGradeLabel } from "@/lib/schoolGrade"
import PresaleCompetitionBadge from "@/components/PresaleCompetitionBadge"
import {
  useCompareTwo,
  mergeEngineFields,
  buildEngineRows,
  type RegretScore,
  type AptPosition,
  type NationalRank,
  type ShortRank,
  type AptRankNational,
  type EngineRow,
} from "@/lib/compareEngine"

interface AptDetail {
  apt_id: number
  apt_nm: string
  sigungu: string
  umd_nm?: string
  sigungu_cd?: string
  mode: string
  oreulji_score: number
  final_score?: number
  risk_score: number
  risk_level: string
  expected_loss: number
  show_rise: boolean
  rise_prob?: number
  regret_prob?: number | null
  downside_regret_prob?: number | null
  opportunity_regret_prob?: number | null
  expected_gain?: number
  price: number | null
  build_year: number | null
  jeonse_risk_level?: string
  school_score?: number
  kapt_ho_cnt?: number
  regret_score?: RegretScore
  apt_position?: AptPosition
  national_rank?: NationalRank
  short_rank?: ShortRank
  apt_rank_national?: AptRankNational
}

interface Props {
  apts: [AptDetail, AptDetail]
  onClose: () => void
}

function scoreGrad(score: number) {
  if (score >= 75) return "linear-gradient(135deg,#27AE60,#16A34A)"
  if (score >= 64) return "linear-gradient(135deg,#2ECC71,#10B981)"
  if (score >= 56) return "linear-gradient(135deg,#F1C40F,#F59E0B)"
  if (score >= 50) return "linear-gradient(135deg,#E67E22,#F59E0B)"
  return "linear-gradient(135deg,#E74C3C,#DC2626)"
}

function scoreColor(score: number) {
  if (score >= 75) return "#16A34A"
  if (score >= 64) return "#059669"
  if (score >= 56) return "#D97706"
  if (score >= 50) return "#EA580C"
  return "#DC2626"
}

function riskColor(level?: string) {
  if (level === "높음") return "#DC2626"
  if (level === "보통") return "#D97706"
  return "#16A34A"
}

function buyerHint(score: number, jeonseRisk?: string): string {
  if (score >= 75) return "매수 적합"
  if (score >= 64) return "매수 고려 가능"
  if (score >= 56) return "조건부 검토 권장"
  if (score >= 50) {
    if (jeonseRisk === "높음") return "주의 (전세 리스크)"
    return "주의 필요"
  }
  return "매수 재고 권장"
}

function formatPrice(price: number | null): string {
  if (!price) return "-"
  return price >= 10000
    ? `${(price / 10000).toFixed(1)}억`
    : `${price.toLocaleString()}만`
}

function getDownsideRegret(apt: AptDetail): number | null {
  const v = apt.downside_regret_prob ?? apt.regret_prob
  return typeof v === "number" ? v : null
}

function getOpportunityRegret(apt: AptDetail): number | null {
  const v = apt.opportunity_regret_prob
  return typeof v === "number" ? v : null
}

function formatRegret(v: number | null): string {
  if (v == null) return "-"
  return `${Math.round(v * 100)}%`
}

type CompareRow = EngineRow

function buildRows(a: AptDetail, b: AptDetail): CompareRow[] {
  const sa = a.final_score ?? a.oreulji_score
  const sb = b.final_score ?? b.oreulji_score
  const rows: CompareRow[] = [
    {
      label: "오를지 점수",
      a: `${sa}점`,
      b: `${sb}점`,
      winner: sa > sb ? "a" : sb > sa ? "b" : "tie",
    },
    // 엔진 행 (후회점수 · 24개월 순위 · 6개월 전망 · 단지 위치) — 공용 빌더
    ...buildEngineRows(a, b),
    {
      label: "매매가",
      a: formatPrice(a.price),
      b: formatPrice(b.price),
      winner: a.price && b.price
        ? (a.price < b.price ? "a" : b.price < a.price ? "b" : "tie")
        : undefined,
    },
    {
      label: "시장 위험도",
      a: `${a.risk_score}점 (${a.risk_level})`,
      b: `${b.risk_score}점 (${b.risk_level})`,
      winner: a.risk_score < b.risk_score ? "a" : b.risk_score < a.risk_score ? "b" : "tie",
    },
    {
      label: "전세 위험도",
      a: a.jeonse_risk_level || "-",
      b: b.jeonse_risk_level || "-",
      winner:
        a.jeonse_risk_level === "낮음" && b.jeonse_risk_level !== "낮음" ? "a" :
        b.jeonse_risk_level === "낮음" && a.jeonse_risk_level !== "낮음" ? "b" : "tie",
    },
    {
      label: "학군",
      a: schoolGradeLabel(a.school_score) != null ? `${schoolGradeLabel(a.school_score)} · ${a.school_score}/100` : "-",
      b: schoolGradeLabel(b.school_score) != null ? `${schoolGradeLabel(b.school_score)} · ${b.school_score}/100` : "-",
      winner:
        a.school_score != null && b.school_score != null
          ? (a.school_score > b.school_score ? "a" : b.school_score > a.school_score ? "b" : "tie")
          : undefined,
    },
    {
      label: "세대수",
      a: a.kapt_ho_cnt ? `${a.kapt_ho_cnt.toLocaleString("ko-KR")}세대` : "-",
      b: b.kapt_ho_cnt ? `${b.kapt_ho_cnt.toLocaleString("ko-KR")}세대` : "-",
    },
    {
      label: "건축연도",
      a: a.build_year ? `${a.build_year}년` : "-",
      b: b.build_year ? `${b.build_year}년` : "-",
      winner:
        a.build_year && b.build_year
          ? (a.build_year > b.build_year ? "a" : b.build_year > a.build_year ? "b" : "tie")
          : undefined,
    },
  ]
  return rows
}

export default function CompareSheet({ apts, onClose }: Props) {
  const [a, b] = apts
  const sa = a.final_score ?? a.oreulji_score
  const sb = b.final_score ?? b.oreulji_score

  // compare/two 공용 훅 — 엔진 필드 병합 (커버리지 밖이면 기존 값 유지)
  const { data: engineData } = useCompareTwo(a.apt_id, b.apt_id)
  const ea: AptDetail = { ...a, ...mergeEngineFields(a, engineData, "a") }
  const eb: AptDetail = { ...b, ...mergeEngineFields(b, engineData, "b") }
  const rows = buildRows(ea, eb)

  const aUrl = `/dashboard?apt=${encodeURIComponent(a.apt_nm)}&address=${encodeURIComponent([a.sigungu, a.umd_nm].filter(Boolean).join(" "))}&lawdCd=${a.sigungu_cd || ""}`
  const bUrl = `/dashboard?apt=${encodeURIComponent(b.apt_nm)}&address=${encodeURIComponent([b.sigungu, b.umd_nm].filter(Boolean).join(" "))}&lawdCd=${b.sigungu_cd || ""}`
  const [tradeupData, setTradeupData] = useState<TradeupScoreData | null>(null)
  const [tradeupLoading, setTradeupLoading] = useState(false)

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "100%", maxWidth: 540,
        background: "#fff", borderRadius: "16px 16px 0 0",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        fontFamily: "-apple-system, sans-serif",
      }}>
        {/* 핸들 */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, background: "#E5E7EB", borderRadius: 2 }} />
        </div>

        {/* 헤더 */}
        <div style={{
          padding: "8px 16px 12px",
          borderBottom: "1px solid #F3F4F6",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>아파트 비교</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, color: "#9CA3AF", cursor: "pointer", lineHeight: 1 }}
          >×</button>
        </div>

        {/* 스크롤 영역 */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 12px 32px" }}>

          {/* === 강렬한 한방: 후회 확률 비교 (1번 핵심) — 실제 데이터 동적 === */}
          {(() => {
            const da = getDownsideRegret(a)
            const db = getDownsideRegret(b)
            const oa = getOpportunityRegret(a)
            const ob = getOpportunityRegret(b)
            const hasData = da != null && db != null
            const betterA = hasData && da! <= db!
            const diff = hasData ? Math.round(Math.abs(da! - db!) * 100) : 0

            const shortA = a.apt_nm.length > 7 ? a.apt_nm.slice(0, 7) + "…" : a.apt_nm
            const shortB = b.apt_nm.length > 7 ? b.apt_nm.slice(0, 7) + "…" : b.apt_nm

            return (
              <div style={{
                background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
                border: "1.5px solid #86EFAC",
                borderRadius: 12,
                padding: "14px 14px 16px",
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 4 }}>
                  이 두 후보의 핵심 비교
                </div>

                {hasData ? (
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#14532D", lineHeight: 1.3, marginBottom: 8 }}>
                    {betterA ? shortA : shortB}를 사면 2년 안에 후회할 확률이<br />
                    {betterA ? shortB : shortA}보다 약 <span style={{ color: "#16A34A", fontSize: 18 }}>{diff}p</span> 낮아요.
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#14532D", lineHeight: 1.3, marginBottom: 8 }}>
                    두 후보의 후회 리스크를 직접 비교하면<br />선택이 훨씬 명확해집니다.
                  </div>
                )}

                {/* 후회 확률 시각 비교 (실제 값) */}
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  {[{ label: "A", apt: a, reg: da, isBetter: hasData && betterA }, { label: "B", apt: b, reg: db, isBetter: hasData && !betterA }].map((item, idx) => (
                    <div key={idx} style={{
                      flex: 1, background: "#fff", borderRadius: 8, padding: "8px 10px",
                      border: item.isBetter ? "1.5px solid #16A34A" : "1px solid #E5E7EB"
                    }}>
                      <div style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>{item.label} · {item.apt.apt_nm.slice(0, 6)}{item.apt.apt_nm.length > 6 ? "…" : ""}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: item.isBetter ? "#16A34A" : "#DC2626" }}>{formatRegret(item.reg)}</div>
                      <div style={{ fontSize: 10, color: "#6B7280" }}>하락 후회 확률</div>
                    </div>
                  ))}
                </div>

                {hasData && (oa != null || ob != null) && (
                  <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.35, marginBottom: 4 }}>
                    기회비용 후회: A {formatRegret(oa)} vs B {formatRegret(ob)}
                  </div>
                )}

                {!hasData && (
                  <div style={{ fontSize: 11, color: "#4B5563", marginBottom: 4 }}>
                    정확한 수치는 데이터가 충분한 경우에 표시됩니다.
                  </div>
                )}

                <div style={{ fontSize: 11, color: "#15803D" }}>
                  → 더 정확한 숫자 + “왜” 설명 + 실행 체크포인트는 비교 리포트에서
                </div>
              </div>
            )
          })()}

          {/* 아파트 이름 + 점수 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {([{ apt: a, score: sa, url: aUrl }, { apt: b, score: sb, url: bUrl }] as const).map(({ apt, score, url }, i) => (
              <div key={i} style={{
                background: "#F9FAFB", borderRadius: 12, padding: "12px 10px",
                border: score === Math.max(sa, sb) && sa !== sb ? "2px solid #16A34A" : "1.5px solid #E5E7EB",
                position: "relative", textAlign: "center",
              }}>
                {score === Math.max(sa, sb) && sa !== sb && (
                  <div style={{
                    position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                    background: "#16A34A", color: "#fff", fontSize: 9, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 20,
                  }}>추천</div>
                )}
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: scoreGrad(score),
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  color: "#fff", margin: "0 auto 8px",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: 8, opacity: 0.8 }}>/ 100</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", lineHeight: 1.3, marginBottom: 4 }}>
                  {apt.apt_nm}
                </div>
                <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 6 }}>
                  {apt.sigungu}{apt.umd_nm ? " " + apt.umd_nm : ""}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: scoreColor(score),
                }}>
                  {buyerHint(score, apt.jeonse_risk_level)}
                </div>
              </div>
            ))}
          </div>

          {/* 비교 테이블 */}
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #E5E7EB" }}>
            {rows.map((row, idx) => (
              <div key={row.label} style={{
                display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr",
                background: idx % 2 === 0 ? "#F9FAFB" : "#fff",
                borderBottom: idx < rows.length - 1 ? "1px solid #E5E7EB" : "none",
              }}>
                {/* 레이블 */}
                <div style={{
                  padding: "9px 8px", fontSize: 11, color: "#6B7280", fontWeight: 600,
                  display: "flex", alignItems: "center",
                }}>
                  {row.label}
                </div>
                {/* A 값 */}
                <div style={{
                  padding: "9px 8px", fontSize: 12, fontWeight: 700,
                  color: row.winner === "a" ? "#16A34A" : "#374151",
                  display: "flex", alignItems: "center", justifyContent: "flex-end",
                  background: row.winner === "a" ? "rgba(22,163,74,0.06)" : undefined,
                }}>
                  {row.winner === "a" && <span style={{ marginRight: 3, fontSize: 10 }}>✓</span>}
                  {row.a}
                </div>
                {/* B 값 */}
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

          {/* 청약 경쟁률 요약 (F1-S3 — 같은 시군구면 1개만) */}
          <PresaleCompetitionBadge sigunguCd={a.sigungu_cd} regionName={a.sigungu} />
          {b.sigungu_cd && b.sigungu_cd !== a.sigungu_cd && (
            <PresaleCompetitionBadge sigunguCd={b.sigungu_cd} regionName={b.sigungu} />
          )}

          {/* 컬럼 헤더 (테이블 위에) */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr",
            marginTop: 8, marginBottom: -8,
          }}>
            <div />
            <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "right", paddingRight: 8 }}>{a.apt_nm.slice(0, 8)}{a.apt_nm.length > 8 ? "…" : ""}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "right", paddingRight: 8 }}>{b.apt_nm.slice(0, 8)}{b.apt_nm.length > 8 ? "…" : ""}</div>
          </div>

          {/* 상세분석 버튼 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 20 }}>
            <a href={aUrl} target="_blank" style={{
              display: "block", padding: "10px 0",
              background: "#6366F1", color: "#fff",
              borderRadius: 10, textAlign: "center",
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}>
              {a.apt_nm.slice(0, 7)}{a.apt_nm.length > 7 ? "…" : ""} 상세분석
            </a>
            <a href={bUrl} target="_blank" style={{
              display: "block", padding: "10px 0",
              background: "#6366F1", color: "#fff",
              borderRadius: 10, textAlign: "center",
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}>
              {b.apt_nm.slice(0, 7)}{b.apt_nm.length > 7 ? "…" : ""} 상세분석
            </a>
          </div>

          {/* 갈아타기 타이밍 분석 */}
          {tradeupData ? (
            <div style={{ marginTop: 16 }}>
              <TradeupScoreCard data={tradeupData} />
            </div>
          ) : (
            <button
              onClick={async () => {
                setTradeupLoading(true)
                const data = await fetchTradeupScore(a.apt_id, b.apt_id)
                if (data) setTradeupData(data)
                setTradeupLoading(false)
              }}
              disabled={tradeupLoading}
              style={{
                display: "block", width: "100%", marginTop: 16,
                padding: "12px", borderRadius: 10, border: "1.5px solid #16A34A",
                background: tradeupLoading ? "#F3F4F6" : "#F0FDF4",
                color: tradeupLoading ? "#9CA3AF" : "#166534",
                fontSize: 13, fontWeight: 700, cursor: tradeupLoading ? "default" : "pointer",
                textAlign: "center",
              }}
            >
              {tradeupLoading ? "분석 중..." : "🔄 갈아타기 타이밍 분석"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
