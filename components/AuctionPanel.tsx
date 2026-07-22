"use client"

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import {
  budgetBand,
  cashNeedApprox,
  formatManwonShort,
  isWishlisted,
  toggleWishlist,
  DEFAULT_BUDGET_DELTA,
} from "@/lib/auction/budgetFilter"

type Check = { key: string; label: string; desc: string }
type Stage = { stage: string; icon: string; items: string[] }
type Doc = { doc: string; check: string }
type Right = { n: number; title: string; desc: string }
type Note = { title: string; desc: string }
type DealerType = { axis: string; options: { name: string; fit: string; watch: string }[] }
type DealerGuide = {
  title: string; intro: string; points: { k: string; v: string }[]
  types: DealerType[]; how_to_choose: string[]; note: string
}
type LoanGuide = {
  title: string; intro: string
  basics: { k: string; v: string }[]
  when_blocked: { case: string; how: string }[]
  checklist: string[]; note: string
}
type PriceType = "fixed" | "per_pyeong" | "size_tier" | "options"
type RenoOption = { key: string; label: string; type: PriceType; rate_manwon?: number | null; t59?: number; t84?: number }
type RenoItem = {
  key: string; label: string; type: PriceType
  rate_manwon?: number | null; t59?: number; t84?: number; options?: RenoOption[]
}
type MatchedApt = {
  apt_id: number; apt_nm: string; oreulji_score: number | null
  jeonse_risk_level: string | null; latest_price: number | null; build_year: number | null
}
export type AuctionDetail = {
  id: number; display_no: string; court: string; dept: string; kind: string
  address: string; bld_nm: string; area_m2: number | null
  appraisal_price: number | null; min_bid_price: number | null; fail_count: number
  sale_date: string | null; status: string
  matched_apt: MatchedApt | null; discount_vs_market_pct: number | null
  discount_pct?: number | null
  price_ref_label?: string | null
  housing_market?: {
    market_manwon?: number; kind?: string; n?: number; yyyymm?: string; method?: string
  } | null
  required_checks: Check[]; journey_guide: Stage[]
  review_docs?: Doc[]; rights_analysis?: Right[]
  special_notes?: Note[]; failure_patterns?: string[]
  dealer_guide?: DealerGuide; loan_guide?: LoanGuide; reno_items?: RenoItem[]
  beginner_grade?: { level: string; emoji: string; label: string; reasons: string[]; caution: string }
  bigo_text?: string | null
  bigo_flags?: { key: string; level: "high" | "caution" | "info"; label: string; desc: string }[]
  timeline?: { when: string; tasks: string[] }[]
  acq_tax_note?: string
  floor_info?: string | null; structure?: string | null
  next_min_bid_price?: number | null; next_min_bid_rate?: number | null
  decision_date?: string | null; bid_time?: string | null; bid_place?: string | null
  dept_tel?: string | null; view_count?: number | null; interest_count?: number | null
  occupancy_flag: string; rights_flag: string; disclaimer: string
  lat?: number | null; lon?: number | null
}

const eok = (manwon: number | null) =>
  manwon == null ? "-" : manwon >= 10000 ? `${(manwon / 10000).toFixed(2)}억` : `${manwon.toLocaleString()}만`

function dday(sale?: string | null) {
  if (!sale) return null
  const d = Math.ceil((new Date(sale).getTime() - Date.now()) / 86400000)
  return d >= 0 ? `D-${d}` : `종료`
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

type AuctionPhoto = { seq: number; title: string; dvs_cd: string | null; url: string }
type AuctionDoc = {
  appraisal_points?: { label: string; content: string }[]
  baseline_right?: { date: string | null; type: string | null; raw: string } | null
  spec_remarks?: { spec_remark?: string; assumed_right?: string; surplus_bld?: string; goods_remark?: string }
} | null

export default function AuctionPanel({
  detail,
  onClose,
  budgetManwon = null,
  budgetDelta = DEFAULT_BUDGET_DELTA,
}: {
  detail: AuctionDetail
  onClose: () => void
  /** 리스트/지도 예산 (만원). 있으면 예산 배지 표시 */
  budgetManwon?: number | null
  budgetDelta?: number
}) {
  const [openStage, setOpenStage] = useState<number | null>(0)
  const [openExtra, setOpenExtra] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [wish, setWish] = useState(false)
  const [verdictStuck, setVerdictStuck] = useState(false)
  const verdictRef = useRef<HTMLDivElement | null>(null)
  const pyeong = detail.area_m2 ? Math.round(detail.area_m2 / 3.3058) : null
  const dd = dday(detail.sale_date)
  const band = budgetBand(detail.min_bid_price ?? 0, budgetManwon, budgetDelta)
  const cashApprox = cashNeedApprox(detail.min_bid_price ?? 0)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    setWish(isWishlisted(detail.id))
  }, [detail.id])

  // 사진 (온디맨드 — courtauction pgj15B, 게이트가 캐시)
  const [photos, setPhotos] = useState<AuctionPhoto[]>([])
  const [mainIdx, setMainIdx] = useState(0)
  const [mediaState, setMediaState] = useState<"loading" | "done" | "error">("loading")
  const [doc, setDoc] = useState<AuctionDoc>(null)
  useEffect(() => {
    let alive = true
    setPhotos([]); setMainIdx(0); setMediaState("loading"); setDoc(null)
    fetch(`${GATE_URL}/auction/${detail.id}/media`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return
        setPhotos(Array.isArray(d.photos) ? d.photos : [])
        setDoc(d.doc || null)
        setMediaState("done")
      })
      .catch(() => alive && setMediaState("error"))
    return () => { alive = false }
  }, [detail.id])

  useEffect(() => {
    const el = verdictRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVerdictStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-8px 0px 0px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [detail.id, detail.beginner_grade])

  const g = detail.beginner_grade
  const isRed = g ? (g.level === "고급" || g.emoji === "🔴") : false
  const isGreen = g ? (g.level === "초급" || g.emoji === "🟢") : false
  const verdictTitle = g
    ? (isRed ? "이 경매, 초보 비권장" : isGreen ? "상대적으로 단순 · 서류 필수" : `확인 후 도전 · ${g.label}`)
    : null

  const shellStyle: CSSProperties = isMobile
    ? {
        position: "fixed", left: 0, right: 0, bottom: 0, top: "auto",
        width: "100%", height: "min(92dvh, 100%)", maxHeight: "92dvh",
        borderRadius: "16px 16px 0 0",
        background: "#fff", zIndex: 1200,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", fontFamily: "'Pretendard',sans-serif",
      }
    : {
        position: "fixed", right: 0, top: 0, bottom: 0, width: "min(420px, 100vw)",
        background: "#fff", zIndex: 1200, boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column", fontFamily: "'Pretendard',sans-serif",
      }

  return (
    <>
      {/* 모바일 스크림 */}
      {isMobile && (
        <div
          onClick={onClose}
          aria-hidden
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1199 }}
        />
      )}
    <div style={shellStyle} role="dialog" aria-label="경매 상세">
      {/* 헤더 */}
      <div style={{ background: "linear-gradient(135deg,#991B1B,#B91C1C)", color: "#fff", padding: isMobile ? "8px 18px 14px" : "16px 18px", flexShrink: 0 }}>
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.45)" }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85, display: "flex", gap: 6, alignItems: "center" }}>
              <span>⚖️ 법원경매</span>{detail.kind && <span>· {detail.kind}</span>}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3 }}>{detail.display_no || `물건 ${detail.id}`}</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              {detail.court}{detail.dept ? ` ${detail.dept}` : ""}
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기" style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff",
            width: 36, height: 36, fontSize: 18, cursor: "pointer", flexShrink: 0,
          }}>×</button>
        </div>
        {/* 지도에서 보기 버튼 */}
        {detail.lat != null && detail.lon != null && (
          <button
            onClick={() => { window.location.href = `/map?focus=${detail.id}` }}
            style={{
              marginTop: 8, width: "100%",
              background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8, color: "#fff", padding: "7px 0",
              fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            🗺️ 지도에서 보기
          </button>
        )}
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {dd && (
            <div style={{ display: "inline-flex", gap: 8, alignItems: "center",
              background: "rgba(255,255,255,0.16)", borderRadius: 8, padding: "5px 10px", fontSize: 12 }}>
              <b>{dd}</b><span style={{ opacity: 0.85 }}>매각기일 {detail.sale_date}</span>
            </div>
          )}
          {band.tag === "over" && band.overPct != null && (
            <span style={{ background: "rgba(254,243,199,0.95)", color: "#92400E", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>
              예산 +{band.overPct.toFixed(0)}%
            </span>
          )}
          {(band.tag === "under" || band.tag === "in") && (
            <span style={{ background: "rgba(220,252,231,0.95)", color: "#166534", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>
              예산 창 안
            </span>
          )}
          {band.tag === "over" && band.overPct == null && (
            <span style={{ background: "rgba(254,226,226,0.95)", color: "#991B1B", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>
              예산 밖
            </span>
          )}
        </div>
      </div>

      {/* 스크롤 시 붙는 미니 판정 */}
      {verdictStuck && g && verdictTitle && (
        <div style={{
          flexShrink: 0, padding: "8px 14px", borderBottom: "1px solid #E5E7EB",
          background: isGreen ? "#F0FDF4" : isRed ? "#FEF2F2" : "#FFFBEB",
          display: "flex", alignItems: "center", gap: 8, zIndex: 2,
        }}>
          <span style={{ fontSize: 16 }}>{g.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: isRed ? "#B91C1C" : isGreen ? "#15803D" : "#B45309", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {verdictTitle}
            </div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>최저 {eok(detail.min_bid_price)}</div>
          </div>
        </div>
      )}

      {/* 스크롤 본문 */}
      <div style={{ overflowY: "auto", padding: "16px 18px 12px", flex: 1, WebkitOverflowScrolling: "touch" }}>

        {/* ═══════════════════════════════════════════
            SECTION A: 핵심 정보 (한눈에)
           ═══════════════════════════════════════════ */}
        <div style={{ fontSize: 10, fontWeight: 800, color: "#0F9D6B", letterSpacing: ".08em", marginBottom: 10 }}>
          핵심 정보
        </div>

        {/* 초보용 한줄 요약 */}
        <div style={{
          background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10,
          padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#334155", lineHeight: 1.5,
        }}>
          {(() => {
            const kind = detail.kind || "물건"
            const disc = detail.discount_pct ?? detail.discount_vs_market_pct
            const fail = detail.fail_count ?? 0
            const signal = g?.emoji || ""
            const signalLabel = g?.level === "초급" ? "시세보다 저렴" : g?.level === "고급" ? "서류 위험" : g?.level === "중급" ? "시세보다 비쌈" : ""
            const discStr = disc != null ? `시세 대비 ${Math.abs(disc)}% 저렴` : ""
            const failStr = fail > 0 ? `, ${fail}회 유찰` : ""
            return (
              <span>
                {signal} <b>{kind}</b> — {signalLabel || "분석 중"}{discStr ? ` (${discStr})` : ""}{failStr}
                {fail >= 2 && disc != null && disc >= 20 ? " → 가격 매력 있음" : ""}
                {g?.level === "고급" ? " → 초보 비추천, 전문가 상담 권장" : ""}
              </span>
            )
          })()}
        </div>

        {/* 판정 스트립 — 이 경매 해도 되나? */}
        {g && (() => {
          const bg = isGreen ? "#F0FDF4" : isRed ? "#FEF2F2" : "#FFFBEB"
          const bd = isGreen ? "#BBF7D0" : isRed ? "#FECACA" : "#FDE68A"
          const fg = isGreen ? "#15803D" : isRed ? "#B91C1C" : "#B45309"
          const disc = detail.discount_pct ?? detail.discount_vs_market_pct
          const ref = detail.price_ref_label || (detail.matched_apt ? "시세" : "감정가")
          return (
            <div ref={verdictRef} style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 14, padding: "14px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{g.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: fg, lineHeight: 1.35 }}>{verdictTitle}</div>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 0, listStyle: "none" }}>
                    {g.reasons.slice(0, 3).map((rz, i) => (
                      <li key={i} style={{
                        fontSize: 12.5, lineHeight: 1.45, marginBottom: 4,
                        color: isRed ? "#B91C1C" : "#4B5563",
                        fontWeight: isRed ? 600 : 400,
                      }}>
                        · {rz}
                      </li>
                    ))}
                  </ul>
                  {disc != null && (
                    <div style={{ fontSize: 11.5, color: "#6B7280", marginTop: 8 }}>
                      기준가 대비 {disc > 0 ? "-" : "+"}{Math.abs(disc)}%
                      <span style={{ color: "#9CA3AF" }}> · 기준: {ref}</span>
                      {detail.housing_market?.n != null && (
                        <span style={{ color: "#9CA3AF" }}> · n={detail.housing_market.n}</span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 6, lineHeight: 1.45 }}>{g.caution}</div>
                </div>
              </div>
            </div>
          )
        })()}
        {!g && <div ref={verdictRef} style={{ height: 1, marginBottom: 0 }} />}

        {/* 가격 블록 — 최저가 강조 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <Cell label="최저가" value={eok(detail.min_bid_price)} strong />
          <Cell label="감정가" value={eok(detail.appraisal_price)} />
          <Cell label="유찰" value={`${detail.fail_count}회`} />
          <Cell
            label={`할인 (${detail.price_ref_label || (detail.matched_apt ? "시세" : "감정가")})`}
            value={(detail.discount_pct ?? detail.discount_vs_market_pct) != null
              ? `${(detail.discount_pct ?? detail.discount_vs_market_pct)! > 0 ? "-" : "+"}${Math.abs((detail.discount_pct ?? detail.discount_vs_market_pct)!)}%`
              : "미확인"}
            color={
              (detail.discount_pct ?? detail.discount_vs_market_pct) != null
              && (detail.discount_pct ?? detail.discount_vs_market_pct)! > 0
              && (detail.price_ref_label === "시세" || (detail.price_ref_label || "").startsWith("실거래") || detail.matched_apt)
                ? "#16A34A" : "#6B7280"
            }
          />
        </div>
        {cashApprox != null && (
          <div style={{
            background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10,
            padding: "10px 12px", marginBottom: 12, fontSize: 12.5, color: "#334155", lineHeight: 1.45,
          }}>
            <span style={{ fontWeight: 700, color: "#0F172A" }}>필요 현금 대략 {formatManwonShort(cashApprox)}</span>
            <span style={{ color: "#94A3B8" }}> · 취득세·등기 근사 · 대출·명도 제외</span>
          </div>
        )}
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{detail.address}</div>
        {pyeong && <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>전용 {detail.area_m2}㎡ · 약 {pyeong}평{detail.floor_info ? ` · ${detail.floor_info}` : ""}</div>}

        {/* 물건 사진 (온디맨드 갤러리) */}
        <PhotoGallery photos={photos} mainIdx={mainIdx} setMainIdx={setMainIdx} state={mediaState} isMobile={isMobile} />

        {/* 매각물건명세서 인수권리·비고 (있을 때만, 권리 위험이라 강조) */}
        {doc?.spec_remarks?.assumed_right && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#B91C1C", marginBottom: 5 }}>⚠️ 매수인 인수 권리 (명세서)</div>
            <div style={{ fontSize: 12, color: "#7F1D1D", lineHeight: 1.55 }}>{doc.spec_remarks.assumed_right}</div>
          </div>
        )}
        {(doc?.spec_remarks?.spec_remark || doc?.spec_remarks?.surplus_bld || doc?.spec_remarks?.goods_remark) && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 11.5, color: "#92400E", lineHeight: 1.55 }}>
            {doc.spec_remarks.spec_remark && <div>· 명세서 비고: {doc.spec_remarks.spec_remark}</div>}
            {doc.spec_remarks.surplus_bld && <div>· 제시외: {doc.spec_remarks.surplus_bld}</div>}
            {doc.spec_remarks.goods_remark && <div>· 비고: {doc.spec_remarks.goods_remark}</div>}
          </div>
        )}
        {doc?.baseline_right?.raw && (
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>
            🔑 말소기준권리: <b>{doc.baseline_right.raw}</b> <span style={{ color: "#9CA3AF" }}>(배당 분석에 자동 반영)</span>
          </div>
        )}

        {/* 물건 팩트 (raw_json 상세) */}
        <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 12 }}>
          {detail.next_min_bid_price != null && (
            <Line label={`다음 회차 예상 최저가${detail.next_min_bid_rate ? ` (${detail.next_min_bid_rate}%)` : ""}`}
              value={eok(detail.next_min_bid_price)} color="#B45309" />
          )}
          {detail.bid_time && <Line label="입찰 시각" value={`${detail.sale_date ?? ""} ${detail.bid_time}`} />}
          {detail.bid_place && <Line label="입찰 장소" value={detail.bid_place} />}
          {detail.decision_date && <Line label="매각결정기일" value={detail.decision_date} />}
          {detail.structure && <Line label="구조" value={detail.structure} />}
          {detail.dept_tel && <Line label="담당계" value={`${detail.dept ?? ""} ${detail.dept_tel}`} />}
          {(detail.view_count != null || detail.interest_count != null) && (
            <Line label="관심도" value={`조회 ${detail.view_count ?? 0} · 관심등록 ${detail.interest_count ?? 0}`} />
          )}
        </div>

        {/* 비고 권리 위험 플래그 (신호등 근거) */}
        {detail.bigo_flags && detail.bigo_flags.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 6 }}>⚖️ 법원 비고 · 권리 체크</div>
            {detail.bigo_flags.map((f, i) => {
              const c = f.level === "high" ? { bg: "#FEF2F2", bd: "#FECACA", fg: "#B91C1C", tag: "위험" }
                : f.level === "caution" ? { bg: "#FFFBEB", bd: "#FDE68A", fg: "#B45309", tag: "주의" }
                : { bg: "#F3F4F6", bd: "#E5E7EB", fg: "#6B7280", tag: "참고" }
              return (
                <div key={i} style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 8, padding: "8px 10px", marginBottom: 5 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.fg }}>
                    <span style={{ fontSize: 10, background: c.fg, color: "#fff", borderRadius: 4, padding: "1px 5px", marginRight: 6 }}>{c.tag}</span>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 11, color: c.fg, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
                </div>
              )
            })}
            {detail.bigo_text && (
              <div style={{ fontSize: 10.5, color: "#9CA3AF", lineHeight: 1.5, marginTop: 4 }}>법원 비고 원문: {detail.bigo_text}</div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION B: 사용자 유도 (지도·공유·관심)
           ═══════════════════════════════════════════ */}
        <div style={{ fontSize: 10, fontWeight: 800, color: "#1E40AF", letterSpacing: ".08em", marginTop: 8, marginBottom: 10, paddingTop: 10, borderTop: "1px solid #E5E7EB" }}>
          위치 · 관심 · 공유
        </div>

        {/* 위치 지도 (네이버맵 링크) */}
        {detail.lat != null && detail.lon != null && (
          <div style={{ marginBottom: 12 }}>
            <a
              href={`https://map.naver.com/v5/search/${encodeURIComponent(detail.address || "")}`}
              target="_blank" rel="noreferrer"
              style={{
                display: "block", borderRadius: 10, overflow: "hidden", border: "1px solid #E5E7EB",
                textDecoration: "none", position: "relative",
              }}
            >
              <img
                src={`https://maps.apigw.ntruss.com/map-static/v2/raster-crs/12/${detail.lon},${detail.lat}/15/300x160?scale=2&format=png`}
                alt="위치 지도"
                style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,.5))",
                padding: "20px 10px 8px", color: "#fff", fontSize: 11, fontWeight: 600,
              }}>
                🗺️ 네이버 지도에서 위치 보기
              </div>
            </a>
          </div>
        )}

        {/* 관심 등록 + 공유 버튼 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setWish(toggleWishlist(detail.id))}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 10, border: "1px solid #E5E7EB",
              background: wish ? "#FEF2F2" : "#fff", color: wish ? "#B91C1C" : "#6B7280",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {wish ? "♥" : "♡"} 관심 {wish ? "등록됨" : "등록"}
          </button>
          <button
            onClick={() => {
              const url = `https://bbauction.co.kr/map?focus=${detail.id}`
              if (navigator.share) {
                navigator.share({ title: `비비옥션 ${detail.display_no}`, url }).catch(() => {})
              } else {
                navigator.clipboard?.writeText(url)
                alert("링크가 복사되었습니다")
              }
            }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 10, border: "1px solid #E5E7EB",
              background: "#fff", color: "#6B7280", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            🔗 공유
          </button>
        </div>

        {/* 시세 비교 (matched_apt) */}
        {detail.matched_apt && (
          <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#4338CA", fontWeight: 700, marginBottom: 4 }}>🏠 매칭 단지 — 시세 비교</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{detail.matched_apt.apt_nm}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>
                  {detail.matched_apt.build_year ? `${detail.matched_apt.build_year}년` : ""}
                  {detail.matched_apt.latest_price ? ` · 시세 ${eok(detail.matched_apt.latest_price)}` : ""}
                  {detail.matched_apt.jeonse_risk_level ? ` · 전세 ${detail.matched_apt.jeonse_risk_level}` : ""}
                </div>
              </div>
              {detail.matched_apt.oreulji_score != null && (
                <div style={{ textAlign: "center", background: "#4338CA", color: "#fff", borderRadius: 10, padding: "6px 12px" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{detail.matched_apt.oreulji_score}</div>
                  <div style={{ fontSize: 9, opacity: 0.85 }}>오를지 점수</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION C: 분석 도구 (접어두기)
           ═══════════════════════════════════════════ */}
        <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", letterSpacing: ".08em", marginTop: 8, marginBottom: 10, paddingTop: 10, borderTop: "2px solid #F3F4F6" }}>
          📊 더 분석하기
        </div>

        {/* 입찰 상한 (목표 수익) — 판정 직후 핵심 액션 */}
        <div id="auction-bid-cap" style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: "4px 0 8px" }}>
          🎯 내 입찰 상한 <span style={{ fontWeight: 500, color: "#9CA3AF", fontSize: 11 }}>(목표 수익 역산 · 확정 낙찰가 아님)</span>
        </div>
        <BidBackCalculator
          minBid={detail.min_bid_price}
          marketPrice={detail.matched_apt?.latest_price ?? detail.housing_market?.market_manwon ?? null}
          areaM2={detail.area_m2}
        />

        {/* 참고 낙찰대 자리 (매각결과 쌓이면 채움) */}
        <div style={{
          background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 10,
          padding: "10px 12px", marginBottom: 14, marginTop: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>📊 참고 낙찰대 (지역·평수)</div>
          <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 4, lineHeight: 1.45 }}>
            매각 성립 데이터 수집 후 이 구간이 채워집니다. 지금은 입찰 상한(위)과 시세 할인만 참고하세요.
          </div>
        </div>

        {/* 실제 필요 현금 계산 (초보) */}
        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: "4px 0 8px" }}>💵 실제 필요한 현금</div>
        <CashCalculator
          minBid={detail.min_bid_price}
          discountPct={detail.discount_vs_market_pct ?? null}
          taxNote={detail.acq_tax_note}
        />

        {/* 지금 뭐 해야 하지 — D-day 타임라인 */}
        {detail.timeline && detail.timeline.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: "16px 0 8px" }}>📅 지금부터 할 일</div>
            <div style={{ marginBottom: 16 }}>
              {detail.timeline.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === 0 ? "#B91C1C" : "#D1D5DB", flexShrink: 0, marginTop: 3 }} />
                    {i < detail.timeline!.length - 1 && <div style={{ width: 2, flex: 1, background: "#E5E7EB", marginTop: 2 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#B91C1C" : "#374151" }}>{t.when}</div>
                    {t.tasks.map((tk, j) => (
                      <div key={j} style={{ fontSize: 11.5, color: "#6B7280", lineHeight: 1.5 }}>· {tk}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── 상세 참고자료 (심화) ─── */}

        <Foldable id="rent" title="🏠 임대수익 분석" open={openExtra} setOpen={setOpenExtra}>
          <RentYieldCalculator minBid={detail.min_bid_price} />
        </Foldable>

        {doc?.appraisal_points && doc.appraisal_points.length > 0 && (
          <Foldable id="aee" title="📋 감정평가서 요점" open={openExtra} setOpen={setOpenExtra}>
            <div style={{ fontSize: 12, lineHeight: 1.55 }}>
              {doc.appraisal_points.map((p, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: "#374151", fontSize: 11.5, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ color: "#4B5563", whiteSpace: "pre-line" }}>{p.content}</div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>출처: 법원 감정평가서 요점 (원문 PDF는 대법원 사이트 참조)</div>
            </div>
          </Foldable>
        )}

        <Foldable id="dist" title="⚖️ 배당 분석 · 대항력 임차인 보증금 회수" open={openExtra} setOpen={setOpenExtra}>
          <DistributionCalc auctionId={detail.id} minBid={detail.min_bid_price}
            baseline={doc?.baseline_right?.date || null} />
        </Foldable>

        {/* 핵심 주의점 */}
        {detail.required_checks?.length > 0 && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#B91C1C", marginBottom: 8 }}>⚠️ 입찰 전 꼭 확인하세요</div>
            {detail.required_checks.map((c, i) => (
              <div key={c.key} style={{ marginBottom: i < detail.required_checks.length - 1 ? 8 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7F1D1D" }}>• {c.label}</div>
                <div style={{ fontSize: 11, color: "#991B1B", lineHeight: 1.5, marginLeft: 8 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* 특수 물건 주의 (조건부) */}
        {detail.special_notes && detail.special_notes.length > 0 && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>🔎 이 물건 종류 특수 주의</div>
            {detail.special_notes.map((n, i) => (
              <div key={i} style={{ marginBottom: i < detail.special_notes!.length - 1 ? 6 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>• {n.title}</div>
                <div style={{ fontSize: 11, color: "#B45309", lineHeight: 1.5, marginLeft: 8 }}>{n.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* A to Z 가이드 (아코디언) */}
        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: "4px 0 8px" }}>🧭 경매 A to Z 가이드</div>
        {detail.journey_guide?.map((s, idx) => {
          const open = openStage === idx
          return (
            <div key={idx} style={{ border: "1px solid #E5E7EB", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
              <button onClick={() => setOpenStage(open ? null : idx)} style={{
                width: "100%", textAlign: "left", background: open ? "#F9FAFB" : "#fff", border: "none",
                padding: "11px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between",
                alignItems: "center", fontSize: 13, fontWeight: 700, color: "#1F2937",
              }}>
                <span>{s.icon} {s.stage}</span>
                <span style={{ color: "#9CA3AF", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div style={{ padding: "4px 14px 12px" }}>
                  {s.items.map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, fontSize: 12, color: "#374151", lineHeight: 1.55, marginBottom: 6 }}>
                      <span style={{ color: "#B91C1C", flexShrink: 0 }}>✓</span><span>{it}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* 서류 체크리스트 */}
        {detail.review_docs && detail.review_docs.length > 0 && (
          <Foldable id="docs" title="📋 반드시 볼 서류 (3종+α)" open={openExtra} setOpen={setOpenExtra}>
            {detail.review_docs.map((d, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>
                <b style={{ color: "#1F2937" }}>{d.doc}</b>
                <span style={{ color: "#6B7280" }}> — {d.check}</span>
              </div>
            ))}
          </Foldable>
        )}

        {/* 권리분석 상세 */}
        {detail.rights_analysis && detail.rights_analysis.length > 0 && (
          <Foldable id="rights" title="🔐 권리분석 핵심 (가장 중요)" open={openExtra} setOpen={setOpenExtra}>
            {detail.rights_analysis.map((r) => (
              <div key={r.n} style={{ fontSize: 12, marginBottom: 7, lineHeight: 1.5 }}>
                <b style={{ color: "#B91C1C" }}>{r.n}. {r.title}</b>
                <div style={{ color: "#6B7280", marginLeft: 12 }}>{r.desc}</div>
              </div>
            ))}
          </Foldable>
        )}

        {/* 실패 패턴 */}
        {detail.failure_patterns && detail.failure_patterns.length > 0 && (
          <Foldable id="fail" title="🚫 자주 하는 실수" open={openExtra} setOpen={setOpenExtra}>
            {detail.failure_patterns.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 7, fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 5 }}>
                <span style={{ color: "#DC2626", flexShrink: 0 }}>✗</span><span>{f}</span>
              </div>
            ))}
          </Foldable>
        )}

        {/* 매매사업자 가이드 */}
        {detail.dealer_guide && (
          <Foldable id="dealer" title={`🧾 ${detail.dealer_guide.title}`} open={openExtra} setOpen={setOpenExtra}>
            <div style={{ fontSize: 11.5, color: "#4B5563", lineHeight: 1.6, marginBottom: 10 }}>{detail.dealer_guide.intro}</div>
            {detail.dealer_guide.types.map((t, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{t.axis}</div>
                {t.options.map((o, j) => (
                  <div key={j} style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", marginBottom: 5 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1F2937" }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: "#16A34A", lineHeight: 1.45, marginTop: 2 }}>적합: {o.fit}</div>
                    <div style={{ fontSize: 11, color: "#DC2626", lineHeight: 1.45 }}>주의: {o.watch}</div>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", margin: "6px 0 4px" }}>어떤 걸 고를까</div>
            {detail.dealer_guide.how_to_choose.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 7, fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 5 }}>
                <span style={{ color: "#6366F1", flexShrink: 0 }}>→</span><span>{h}</span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: "#9CA3AF", lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>{detail.dealer_guide.note}</div>
          </Foldable>
        )}

        {/* 경락잔금대출 가이드 */}
        {detail.loan_guide && (
          <Foldable id="loan" title={`🏦 ${detail.loan_guide.title}`} open={openExtra} setOpen={setOpenExtra}>
            <div style={{ fontSize: 11.5, color: "#4B5563", lineHeight: 1.6, marginBottom: 10 }}>{detail.loan_guide.intro}</div>
            {detail.loan_guide.basics.map((b, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>
                <b style={{ color: "#1F2937" }}>{b.k}</b><span style={{ color: "#6B7280" }}> — {b.v}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 800, color: "#B91C1C", margin: "8px 0 5px" }}>규제·소득으로 막힐 때</div>
            {detail.loan_guide.when_blocked.map((w, i) => (
              <div key={i} style={{ background: "#FEF2F2", borderRadius: 8, padding: "7px 10px", marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B" }}>{w.case}</div>
                <div style={{ fontSize: 11, color: "#B45309", lineHeight: 1.45, marginTop: 2 }}>→ {w.how}</div>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", margin: "8px 0 4px" }}>입찰 전 체크</div>
            {detail.loan_guide.checklist.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 7, fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 5 }}>
                <span style={{ color: "#16A34A", flexShrink: 0 }}>✓</span><span>{c}</span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: "#9CA3AF", lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>{detail.loan_guide.note}</div>
          </Foldable>
        )}

        {/* 인테리어·보수 견적 계산기 */}
        {detail.reno_items && detail.reno_items.length > 0 && (
          <Foldable id="reno" title="🎨 인테리어·보수 견적" open={openExtra} setOpen={setOpenExtra}>
            <RenoEstimator items={detail.reno_items} pyeong={pyeong} areaM2={detail.area_m2} />
          </Foldable>
        )}

        {/* 고지 */}
        <div style={{ fontSize: 10, color: "#9CA3AF", lineHeight: 1.5, marginTop: 12, paddingTop: 10, borderTop: "1px solid #F3F4F6" }}>
          {detail.disclaimer}
        </div>
      </div>

      {/* 하단 엄지 존 CTA */}
      <div style={{
        flexShrink: 0, borderTop: "1px solid #E5E7EB", background: "#fff",
        padding: "10px 12px", display: "flex", gap: 8, alignItems: "stretch",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}>
        <button
          type="button"
          aria-label={wish ? "찜 해제" : "찜하기"}
          onClick={() => setWish(toggleWishlist(detail.id))}
          style={{
            width: 48, minWidth: 48, borderRadius: 12, border: "1px solid #E5E7EB",
            background: wish ? "#FEF2F2" : "#fff", color: wish ? "#B91C1C" : "#6B7280",
            fontSize: 18, cursor: "pointer", fontWeight: 700,
          }}
        >
          {wish ? "♥" : "♡"}
        </button>
        <a
          href={detail.lat != null && detail.lon != null
            ? `https://map.kakao.com/link/to/${encodeURIComponent(detail.address || "경매물건")},${detail.lat},${detail.lon}`
            : `https://map.kakao.com/link/search/${encodeURIComponent(detail.address || "")}`}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 12,
            background: "#F3F4F6", color: "#111827", fontWeight: 700, fontSize: 13,
            textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: 44,
          }}
        >
          길안내
        </a>
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("auction-bid-cap")
            el?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          style={{
            flex: 1.4, padding: "12px 8px", borderRadius: 12, border: "none",
            background: "#B91C1C", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
            minHeight: 44,
          }}
        >
          입찰 상한
        </button>
      </div>
    </div>
    </>
  )
}

// ── 낙찰가 역산 (단타 중심) — 순수 로직. UI 바뀌어도 재사용 (2026-07-20) ──
// 양도세 실효율 기본값 (근사 — 세무사 확인 필수). 단타 주택 개인 vs 매매사업자.
export function capitalGainsRate(mode: "personal" | "dealer", months: number): number {
  if (mode === "dealer") return 0.40   // 종합소득세 근사(비교과세·경비인정 변동 큼)
  if (months < 12) return 0.77         // 1년 미만 중과(70%+지방세)
  if (months < 24) return 0.66         // 1~2년(60%+지방세)
  return 0.30                          // 2년+ 기본세율 근사
}

export type BidParams = {
  salePrice: number; targetRoi: number; nth: number; regulated: boolean
  reno: number; eviction: number; loan: number; loanRate: number; months: number; cgRate: number
}
function _totalIn(bid: number, p: BidParams) {
  const tax = bid * acqTaxRate(bid, p.nth, p.regulated)
  const reg = bid * 0.003 + 50
  const interest = p.loan * (p.loanRate / 100) * (p.months / 12)
  return { total: bid + tax + reg + p.reno + p.eviction + interest, tax, reg, interest }
}
function _profit(bid: number, p: BidParams) {
  const { total, tax, reg } = _totalIn(bid, p)
  const saleFee = p.salePrice * 0.005
  const gain = Math.max(p.salePrice - bid - tax - reg - p.reno, 0)  // 양도차익 근사(필요경비 인정분)
  const cgt = gain * p.cgRate
  return { profit: p.salePrice - saleFee - cgt - total, total, cgt }
}
// 목표 수익률(ROI=순이익/총투입)을 만족하는 최대 권장 입찰가 (이진탐색 — ROI는 bid에 단조감소)
export function recommendedBid(p: BidParams) {
  if (p.salePrice <= 0) return null
  let lo = 0, hi = p.salePrice
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2
    const { profit, total } = _profit(mid, p)
    if (profit / total >= p.targetRoi) lo = mid; else hi = mid
  }
  const { profit, total, cgt } = _profit(lo, p)
  return { bid: Math.round(lo), profit: Math.round(profit), totalIn: Math.round(total),
           cgt: Math.round(cgt), cash: Math.round(Math.max(total - p.loan, 0)) }
}

// 취득세율 (2026 기준 개념, 만원 단위 가액). nth=취득 후 나의 주택 수. 교육세·농특세 별도.
function acqTaxRate(priceManwon: number, nth: number, regulated: boolean): number {
  const eok = priceManwon / 10000
  const base = eok <= 6 ? 0.01 : eok >= 9 ? 0.03 : (eok * 2 / 3 - 3) / 100  // 6~9억 슬라이딩
  if (nth <= 1) return base
  if (nth === 2) return regulated ? 0.08 : base
  if (nth === 3) return regulated ? 0.12 : 0.08
  return 0.12  // 4주택 이상
}

function BidBackCalculator({ minBid, marketPrice, areaM2 }: {
  minBid: number | null; marketPrice: number | null; areaM2: number | null
}) {
  const [sale, setSale] = useState<number>(marketPrice ?? Math.round((minBid ?? 0) * 1.25))
  const [roi, setRoi] = useState<number>(20)          // 목표 수익률 %
  const [months, setMonths] = useState<number>(6)     // 보유 개월
  const [reno, setReno] = useState<number>(0)
  const [eviction, setEviction] = useState<number>(0)
  const [nth, setNth] = useState<number>(1)
  const [mode, setMode] = useState<"personal" | "dealer">("personal")

  const cgRate = capitalGainsRate(mode, months)
  const rec = recommendedBid({
    salePrice: sale, targetRoi: roi / 100, nth, regulated: false,
    reno, eviction, loan: 0, loanRate: 0, months, cgRate,
  })
  const won = (m: number) => m >= 10000 ? `${(m / 10000).toFixed(2)}억` : `${m.toLocaleString()}만`

  return (
    <div style={{ background: "#FFF7ED", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
      <NumRow label="예상 매도가 (만원)" v={sale} on={setSale} hint={marketPrice ? "매칭 단지 시세 기본값" : "직접 입력"} />
      <div style={{ display: "flex", gap: 8, margin: "4px 0" }}>
        <NumRow label="목표 수익률 (%)" v={roi} on={setRoi} flex />
        <NumRow label="보유 (개월)" v={months} on={setMonths} flex />
      </div>
      <div style={{ display: "flex", gap: 8, margin: "4px 0" }}>
        <NumRow label="인테리어 (만원)" v={reno} on={setReno} flex />
        <NumRow label="명도비 (만원)" v={eviction} on={setEviction} flex />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 6 }}>
        <label style={{ flex: 1, fontSize: 11, color: "#6B7280" }}>주택 수
          <select value={nth} onChange={e => setNth(Number(e.target.value))} style={selStyle}>
            <option value={1}>1번째</option><option value={2}>2번째</option><option value={3}>3번째</option><option value={4}>4+</option>
          </select>
        </label>
        <label style={{ flex: 1, fontSize: 11, color: "#6B7280" }}>세금 방식
          <select value={mode} onChange={e => setMode(e.target.value as "personal" | "dealer")} style={selStyle}>
            <option value="personal">개인(양도세)</option><option value="dealer">매매사업자</option>
          </select>
        </label>
      </div>
      <div style={{ background: "#B45309", borderRadius: 8, padding: "12px 14px", textAlign: "center", color: "#fff", marginTop: 4 }}>
        <div style={{ fontSize: 11, opacity: 0.9 }}>수익률 {roi}% 내려면 최대</div>
        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{rec ? won(rec.bid) : "-"}</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>이하로 입찰</div>
      </div>
      {rec && (
        <div style={{ marginTop: 6 }}>
          <Line label="예상 순이익" value={won(rec.profit)} color="#16A34A" />
          <Line label="필요 현금(총투입)" value={won(rec.totalIn)} />
          <Line label="예상 양도세/세금" value={won(rec.cgt)} color="#DC2626" />
        </div>
      )}
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, lineHeight: 1.5 }}>
        양도세 실효율은 근사값(단타 1년미만 중과 등). 세무사·법무사 확인 필수. 참고용 추정.
      </div>
    </div>
  )
}

function RentYieldCalculator({ minBid }: { minBid: number | null }) {
  const [buy, setBuy] = useState<number>(minBid ?? 0)      // 매입가(낙찰가)
  const [deposit, setDeposit] = useState<number>(0)         // 보증금
  const [rent, setRent] = useState<number>(0)               // 월세
  const invested = Math.max(buy - deposit, 0)
  const yearRent = rent * 12
  const yieldPct = invested > 0 ? (yearRent / invested * 100) : 0
  const won = (m: number) => m >= 10000 ? `${(m / 10000).toFixed(2)}억` : `${m.toLocaleString()}만`
  return (
    <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
      <NumRow label="매입가/낙찰가 (만원)" v={buy} on={setBuy} />
      <div style={{ display: "flex", gap: 8, margin: "4px 0" }}>
        <NumRow label="보증금 (만원)" v={deposit} on={setDeposit} flex />
        <NumRow label="월세 (만원)" v={rent} on={setRent} flex />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #D1FAE5", marginTop: 8, paddingTop: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>연 임대수익률 (실투자 대비)</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#16A34A" }}>{yieldPct.toFixed(1)}%</span>
      </div>
      <Line label="실투자금 (매입가−보증금)" value={won(invested)} />
      <Line label="연 임대수입" value={won(yearRent)} />
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6 }}>보증금·월세는 인근 시세 기준으로 입력하세요. 참고용.</div>
    </div>
  )
}

const selStyle: CSSProperties = { width: "100%", marginTop: 4, padding: "6px 8px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }

function NumRow({ label, v, on, flex, hint }: { label: string; v: number; on: (n: number) => void; flex?: boolean; hint?: string }) {
  return (
    <label style={{ display: "block", fontSize: 11, color: "#6B7280", flex: flex ? 1 : undefined }}>
      {label}{hint && <span style={{ color: "#9CA3AF", marginLeft: 4 }}>· {hint}</span>}
      <input type="number" value={v || ""} onChange={e => on(Number(e.target.value) || 0)}
        style={{ width: "100%", marginTop: 4, padding: "7px 9px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }} />
    </label>
  )
}

function CashCalculator({ minBid, discountPct, taxNote }: {
  minBid: number | null; discountPct: number | null; taxNote?: string
}) {
  const [bid, setBid] = useState<number>(minBid ?? 0)         // 낙찰가(만원)
  const [nth, setNth] = useState<number>(1)                    // 취득 후 주택 수
  const [regulated, setRegulated] = useState(false)           // 규제(조정대상)지역
  const [loan, setLoan] = useState<number>(0)                  // 대출 예정액(만원)

  const tax = Math.round(bid * acqTaxRate(bid, nth, regulated))
  const regFee = Math.round(bid * 0.003) + 50                  // 등기·법무 대략
  const subtotal = bid + tax + regFee                          // 취득 부대비 포함 (명도·인테리어 제외)
  const cash = Math.max(subtotal - loan, 0)                    // 필요 자기자금
  const won = (m: number) => m >= 10000 ? `${(m / 10000).toFixed(2)}억` : `${m.toLocaleString()}만`

  return (
    <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
      <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 8 }}>
        낙찰가 (만원) {discountPct != null && discountPct > 0 && <span style={{ color: "#16A34A" }}>· 최저가는 시세 대비 -{discountPct}%</span>}
        <input type="number" value={bid || ""} onChange={e => setBid(Number(e.target.value) || 0)}
          style={{ width: "100%", marginTop: 4, padding: "7px 9px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }} />
      </label>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <label style={{ flex: 1, fontSize: 11, color: "#6B7280" }}>
          이 집은 나의
          <select value={nth} onChange={e => setNth(Number(e.target.value))}
            style={{ width: "100%", marginTop: 4, padding: "7px 9px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}>
            <option value={1}>1번째 집 (무주택→1주택)</option>
            <option value={2}>2번째 집</option>
            <option value={3}>3번째 집</option>
            <option value={4}>4번째 이상</option>
          </select>
        </label>
        <label style={{ fontSize: 11, color: "#6B7280", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 8 }}>
          <span style={{ marginBottom: 4 }}>규제지역</span>
          <input type="checkbox" checked={regulated} onChange={e => setRegulated(e.target.checked)} style={{ width: 18, height: 18 }} />
        </label>
      </div>
      <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 10 }}>
        대출 예정액 (만원, 모르면 0)
        <input type="number" value={loan || ""} onChange={e => setLoan(Number(e.target.value) || 0)}
          style={{ width: "100%", marginTop: 4, padding: "7px 9px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }} />
      </label>
      <Line label="낙찰가" value={won(bid)} />
      <Line label={`취득세 (${(acqTaxRate(bid, nth, regulated) * 100).toFixed(1)}%)`} value={won(tax)} />
      <Line label="등기·법무 (대략)" value={won(regFee)} />
      {loan > 0 && <Line label="− 대출" value={won(loan)} color="#2563EB" />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E5E7EB", marginTop: 8, paddingTop: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>필요 현금 (명도·수리 제외)</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#B91C1C" }}>{won(cash)}</span>
      </div>
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, lineHeight: 1.5 }}>
        명도비·인테리어는 아래 계산기에서 더하세요. {taxNote}
      </div>
    </div>
  )
}

function Line({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || "#111827" }}>{value}</span>
    </div>
  )
}

function priceOf(p: { type: PriceType; rate_manwon?: number | null; t59?: number; t84?: number },
                 pyeong: number | null, areaM2: number | null): number | null {
  if (p.type === "fixed") return p.rate_manwon ?? null
  if (p.type === "per_pyeong") return p.rate_manwon != null ? Math.round(p.rate_manwon * (pyeong ?? 0)) : null
  if (p.type === "size_tier" && p.t59 != null && p.t84 != null) {
    const a = Math.min(Math.max(areaM2 ?? 84, 40), 130)   // 극단 평형 보간 방지
    const slope = (p.t84 - p.t59) / (84 - 59)
    return Math.round(p.t59 + slope * (a - 59))
  }
  return null
}

function RenoEstimator({ items, pyeong, areaM2 }: { items: RenoItem[]; pyeong: number | null; areaM2: number | null }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [opt, setOpt] = useState<Record<string, string>>({})   // options 항목의 선택된 옵션 key
  const toggle = (k: string) => setChecked(c => ({ ...c, [k]: !c[k] }))

  const itemCost = (it: RenoItem): number | null => {
    if (it.type === "options") {
      const chosen = it.options?.find(o => o.key === opt[it.key]) ?? it.options?.[0]
      return chosen ? priceOf(chosen, pyeong, areaM2) : null
    }
    return priceOf(it, pyeong, areaM2)
  }

  const total = items.reduce((s, it) => s + (checked[it.key] ? (itemCost(it) ?? 0) : 0), 0)

  return (
    <div>
      {pyeong && <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>전용 {areaM2}㎡ · 약 {pyeong}평 기준</div>}
      {items.map(it => {
        const on = !!checked[it.key]
        const c = itemCost(it)
        return (
          <div key={it.key} style={{ padding: "5px 0", borderBottom: "1px solid #F3F4F6" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={on} onChange={() => toggle(it.key)} />
              <span style={{ flex: 1, color: "#374151" }}>{it.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: on ? "#111827" : "#9CA3AF" }}>
                {c == null ? "-" : `${c.toLocaleString()}만`}
              </span>
            </label>
            {on && it.type === "options" && it.options && (
              <div style={{ display: "flex", gap: 6, marginLeft: 24, marginTop: 4, flexWrap: "wrap" }}>
                {it.options.map(o => {
                  const sel = (opt[it.key] ?? it.options![0].key) === o.key
                  const oc = priceOf(o, pyeong, areaM2)
                  return (
                    <button key={o.key} onClick={() => setOpt(m => ({ ...m, [it.key]: o.key }))} style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: 8, cursor: "pointer",
                      border: sel ? "1.5px solid #B91C1C" : "1px solid #E5E7EB",
                      background: sel ? "#FEF2F2" : "#fff", color: sel ? "#B91C1C" : "#6B7280",
                      fontWeight: sel ? 700 : 500,
                    }}>{o.label} {oc != null ? `${oc.toLocaleString()}만` : ""}</button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>선택 합계</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#B91C1C" }}>{total.toLocaleString()}만원</span>
      </div>
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, lineHeight: 1.5 }}>
        평형별(59·84㎡) 기준가를 면적으로 보정한 추정치입니다. 지역·자재·업체에 따라 다르며 실제 견적이 아닙니다.
      </div>
    </div>
  )
}

function Foldable({ id, title, open, setOpen, children }: {
  id: string; title: string; open: string | null
  setOpen: (v: string | null) => void; children: ReactNode
}) {
  const isOpen = open === id
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
      <button onClick={() => setOpen(isOpen ? null : id)} style={{
        width: "100%", textAlign: "left", background: isOpen ? "#F9FAFB" : "#fff", border: "none",
        padding: "11px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between",
        alignItems: "center", fontSize: 13, fontWeight: 700, color: "#1F2937",
      }}>
        <span>{title}</span>
        <span style={{ color: "#9CA3AF", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && <div style={{ padding: "4px 14px 12px" }}>{children}</div>}
    </div>
  )
}

function Cell({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: strong ? 17 : 14, fontWeight: strong ? 800 : 600, color: color || (strong ? "#B91C1C" : "#111827") }}>{value}</div>
    </div>
  )
}

// 물건 사진 갤러리 — 메인(contain: 작은 사진도 높이 맞춰 확대) + 썸네일 스트립
function PhotoGallery({ photos, mainIdx, setMainIdx, state, isMobile }: {
  photos: AuctionPhoto[]
  mainIdx: number
  setMainIdx: (n: number) => void
  state: "loading" | "done" | "error"
  isMobile: boolean
}) {
  const mainH = isMobile ? 200 : 240
  if (state === "loading") {
    return (
      <div style={{ height: mainH, borderRadius: 10, background: "#F3F4F6", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 12, marginBottom: 12 }}>
        사진 불러오는 중…
      </div>
    )
  }
  if (state === "error" || !photos.length) {
    return (
      <div style={{ height: 56, borderRadius: 10, background: "#F9FAFB", border: "1px dashed #E5E7EB",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 12, marginBottom: 12 }}>
        {state === "error" ? "사진을 불러오지 못했습니다" : "등록된 사진 없음"}
      </div>
    )
  }
  const idx = Math.min(mainIdx, photos.length - 1)
  const main = photos[idx]
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ height: mainH, borderRadius: 10, overflow: "hidden", background: "#F3F4F6",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={GATE_URL + main.url} alt={main.title || "물건 사진"}
          style={{ width: "100%", height: "100%", objectFit: "contain" }} loading="lazy" />
      </div>
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, overflowX: "auto", paddingBottom: 2 }}>
          {photos.map((p, i) => (
            <button key={p.seq} onClick={() => setMainIdx(i)} aria-label={`사진 ${i + 1}`} style={{
              flex: "0 0 auto", width: 54, height: 54, borderRadius: 8, overflow: "hidden",
              border: i === idx ? "2px solid #B91C1C" : "1px solid #E5E7EB",
              background: "#F3F4F6", padding: 0, cursor: "pointer" }}>
              <img src={GATE_URL + p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, textAlign: "right" }}>
        {idx + 1}/{photos.length} · 출처 법원경매
      </div>
    </div>
  )
}

// 배당 분석 계산기 — 매각물건명세서·등기부 값 입력 → 대항력 임차인 보증금 회수/인수 판정
function DistributionCalc({ auctionId, minBid, baseline }: { auctionId: number; minBid: number | null; baseline?: string | null }) {
  const [f, setF] = useState({
    deposit_manwon: "", move_in_date: "", fixed_date: "", baseline_date: baseline || "",
    demanded: "unknown" as "unknown" | "yes" | "no",
    prior_claims_manwon: "", expected_sale_manwon: "",
    exec_cost_manwon: "", priority_wage_manwon: "", priority_charges_manwon: "", current_tax_manwon: "",
  })
  // 말소기준일 자동 반영 (물건 바뀌면 갱신)
  useEffect(() => {
    if (baseline) setF((prev) => ({ ...prev, baseline_date: baseline }))
  }, [baseline])
  const [adv, setAdv] = useState(false)
  const [res, setRes] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })
  const num = (s: string) => (s.trim() === "" ? 0 : Math.max(0, Math.round(Number(s) || 0)))

  const run = async () => {
    setLoading(true); setRes(null)
    try {
      const body = {
        deposit_manwon: num(f.deposit_manwon),
        move_in_date: f.move_in_date || null,
        fixed_date: f.fixed_date || null,
        baseline_date: f.baseline_date || null,
        senior_secured_date: f.baseline_date || null,   // 소액기준=최선순위 담보 설정일 근사
        demanded: f.demanded === "unknown" ? null : f.demanded === "yes",
        prior_claims_manwon: num(f.prior_claims_manwon),
        expected_sale_manwon: f.expected_sale_manwon.trim() === "" ? null : num(f.expected_sale_manwon),
        exec_cost_manwon: num(f.exec_cost_manwon),
        priority_wage_manwon: num(f.priority_wage_manwon),
        priority_charges_manwon: num(f.priority_charges_manwon),
        current_tax_manwon: num(f.current_tax_manwon),
      }
      const r = await fetch(`${GATE_URL}/auction/${auctionId}/distribution`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      setRes(await r.json())
    } catch {
      setRes({ verdict: "error" })
    } finally {
      setLoading(false)
    }
  }

  const inp: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 12.5,
    border: "1px solid #D1D5DB", borderRadius: 7, background: "#fff" }
  const lab: CSSProperties = { fontSize: 10.5, color: "#6B7280", fontWeight: 700, marginBottom: 3, display: "block" }
  const Row = ({ children }: { children: ReactNode }) => (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>{children}</div>
  )
  const Field = ({ k, label, ph, type = "number" }: { k: keyof typeof f; label: string; ph?: string; type?: string }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={lab}>{label}</label>
      <input type={type} value={f[k] as string} onChange={set(k)} placeholder={ph} style={inp} />
    </div>
  )

  const V = res?.verdict as string | undefined
  const vc = V === "safe" || V === "no_issue_no_op"
    ? { bg: "#F0FDF4", bd: "#BBF7D0", fg: "#15803D", txt: "인수 부담 없음 ✅" }
    : V === "partial" ? { bg: "#FFFBEB", bd: "#FDE68A", fg: "#B45309", txt: "일부 인수 ⚠️" }
    : V === "full_assume" ? { bg: "#FEF2F2", bd: "#FECACA", fg: "#B91C1C", txt: "전액 인수 🔴" }
    : V === "unknown" ? { bg: "#F3F4F6", bd: "#E5E7EB", fg: "#6B7280", txt: "정보 부족 — 판정 불가" }
    : { bg: "#FEF2F2", bd: "#FECACA", fg: "#B91C1C", txt: "오류" }

  return (
    <div>
      <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, marginBottom: 10 }}>
        매각물건명세서·등기부의 값을 입력하면, 대항력 임차인이라도 배당으로 보증금이 회수되는지 계산합니다.
        배당순위: 경매비용 → 최우선변제(임금·소액임차인) → 당해세 → 선순위담보·확정일자 임차인.
      </div>
      <Row>
        <Field k="deposit_manwon" label="임차인 보증금(만원)" ph="예 8000" />
        <Field k="expected_sale_manwon" label={`예상 매각가(만원)`} ph={minBid ? `기본 ${minBid.toLocaleString()}` : "낙찰 추정"} />
      </Row>
      <Row>
        <Field k="move_in_date" label="전입일" type="date" />
        <Field k="baseline_date" label="말소기준권리일" type="date" />
      </Row>
      <Row>
        <Field k="fixed_date" label="확정일자" type="date" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={lab}>배당요구</label>
          <select value={f.demanded} onChange={set("demanded")} style={inp}>
            <option value="unknown">모름</option>
            <option value="yes">했음</option>
            <option value="no">안 함</option>
          </select>
        </div>
      </Row>
      <Row>
        <Field k="prior_claims_manwon" label="선순위 담보 합(만원)" ph="확정일자보다 앞선 근저당 등" />
      </Row>
      <button onClick={() => setAdv(!adv)} style={{ background: "none", border: "none", color: "#6B7280",
        fontSize: 11, cursor: "pointer", padding: "2px 0", marginBottom: 6 }}>
        {adv ? "▲ 상세(임금·공과금·당해세) 접기" : "▼ 상세(임금·공과금·당해세·경매비용)"}
      </button>
      {adv && (
        <>
          <Row>
            <Field k="priority_wage_manwon" label="최우선 임금채권(만원)" />
            <Field k="priority_charges_manwon" label="공과금·건강보험(만원)" />
          </Row>
          <Row>
            <Field k="current_tax_manwon" label="당해세(만원)" />
            <Field k="exec_cost_manwon" label="경매비용(만원)" />
          </Row>
        </>
      )}
      <button onClick={run} disabled={loading} style={{ width: "100%", padding: "9px", fontSize: 13, fontWeight: 700,
        color: "#fff", background: loading ? "#9CA3AF" : "#B91C1C", border: "none", borderRadius: 8,
        cursor: loading ? "default" : "pointer", marginTop: 4 }}>
        {loading ? "계산 중…" : "배당 계산"}
      </button>

      {res && (
        <div style={{ marginTop: 12, background: vc.bg, border: `1px solid ${vc.bd}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: vc.fg, marginBottom: 6 }}>{vc.txt}</div>
          {typeof res.recovered_manwon === "number" && (
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
              배당 회수 <b>{(res.recovered_manwon as number).toLocaleString()}만원</b>
              {typeof res.unrecovered_manwon === "number" && (res.unrecovered_manwon as number) > 0 && (
                <span style={{ color: "#B91C1C" }}> · 매수인 인수 <b>{(res.unrecovered_manwon as number).toLocaleString()}만원</b></span>
              )}
            </div>
          )}
          {Array.isArray(res.reasons) && (res.reasons as string[]).map((x, i) => (
            <div key={i} style={{ fontSize: 11.5, color: "#4B5563", lineHeight: 1.55 }}>· {x}</div>
          ))}
          {Array.isArray(res.caveats) && (res.caveats as string[]).map((x, i) => (
            <div key={`c${i}`} style={{ fontSize: 10.5, color: "#9CA3AF", lineHeight: 1.5, marginTop: 2 }}>※ {x}</div>
          ))}
        </div>
      )}
    </div>
  )
}
