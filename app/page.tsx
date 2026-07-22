"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate"

type RecoItem = {
  id: number; display_no: string; kind: string; court: string
  appraisal_price: number | null; min_bid_price: number | null
  discount_pct: number | null; price_ref_label: string | null
  signal: string; signal_level: string; round: number
}
const eok = (m: number | null) => m == null ? "-" : m >= 10000 ? `${(m / 10000).toFixed(1)}억` : `${m.toLocaleString()}만`

// 빅 뷰티풀 경매 — 경매 우선 홈 (톤: 크림/딥잉크/에메랄드/골드, 신호등 언어)
const C = {
  paper: "#FAF7F0", card: "#FFFFFF", ink: "#12202E", inkSoft: "#48586A",
  line: "#E7E0D2", brand: "#0F9D6B", brandDeep: "#0B7D54", gold: "#E8A93A",
  green: "#16A34A", amber: "#EA9A0B", red: "#DC2626",
  greenBg: "#E7F6EE", amberBg: "#FCF3DF", redBg: "#FBEAEA",
  shadow: "0 1px 2px rgba(18,32,46,.06),0 8px 24px rgba(18,32,46,.06)",
}
const FONT = "'Pretendard','Apple SD Gothic Neo',-apple-system,system-ui,sans-serif"

export default function Home() {
  const router = useRouter()
  const [budget, setBudget] = useState("3.5")

  const start = () => {
    const b = parseFloat(budget)
    if (!isNaN(b) && b > 0) localStorage.setItem("orulzi_auction_budget_eok", String(b))
    router.push("/auction")
  }

  // 실제 경매 물건 (전국) 로드 → 예산 안에서 시세보다 싸고 안전한 순
  const [items, setItems] = useState<RecoItem[]>([])
  useEffect(() => {
    fetch(`${GATE_URL}/auction/list?lat_min=33&lat_max=39&lon_min=124&lon_max=132&limit=150`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => {})
  }, [])
  const reco = useMemo(() => {
    const b = parseFloat(budget)
    const cap = !isNaN(b) && b > 0 ? b * 10000 * 1.1 : Infinity // 예산 +10% 밴드
    return items
      .filter((it) => it.signal_level !== "위험" && (it.discount_pct ?? -1) > 0 && it.min_bid_price != null && it.min_bid_price <= cap)
      .sort((a, b) => (b.discount_pct ?? 0) - (a.discount_pct ?? 0))
      .slice(0, 4)
  }, [items, budget])

  return (
    <div style={{ background: C.paper, color: C.ink, minHeight: "100dvh", fontFamily: FONT }}>
      {/* 상단바 */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(250,247,240,.88)",
        backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}>
        <Wrap style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: C.ink, color: C.paper,
              display: "grid", placeItems: "center", fontSize: 14, fontWeight: 900 }}>
              <span style={{ color: C.gold }}>B</span>B
            </div>
            <div style={{ fontWeight: 900, letterSpacing: "-.02em", lineHeight: 1.1 }}>
              <div style={{ fontSize: 15 }}>비비옥션</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: C.inkSoft, letterSpacing: ".06em" }}>법원경매를 쉽게 · BB AUCTION</div>
            </div>
          </div>
          <span style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600 }}>bbauction.co.kr</span>
        </Wrap>
      </div>

      <Wrap>
        {/* 히어로 */}
        <header style={{ padding: "34px 0 26px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800,
            letterSpacing: ".08em", color: C.brandDeep, background: C.greenBg, padding: "6px 11px", borderRadius: 999 }}>
            ● 전국 법원경매 · 초보부터 전문가까지
          </span>
          <h1 style={{ fontSize: "clamp(38px,12vw,52px)", lineHeight: 1.02, letterSpacing: "-.03em",
            fontWeight: 900, margin: "16px 0 0", textWrap: "balance" }}>
            크게 싸게,<br /><span style={{ color: C.brand }}>안전하게.</span>
          </h1>
          <p style={{ margin: "14px 0 0", fontSize: 15.5, color: C.inkSoft, maxWidth: "34ch" }}>
            시세보다 싼지, 서류가 위험한지 — 물건마다 <b>신호등 하나</b>로 알려줍니다. 예산만 넣으면 오늘 살 만한 경매를 찾아줘요.
          </p>
          <div style={{ marginTop: 22, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, boxShadow: C.shadow }}>
            <label style={{ fontSize: 11.5, fontWeight: 800, color: C.inkSoft }}>내 예산 (억원 · 현금+대출)</label>
            <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
              <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal"
                  onKeyDown={(e) => e.key === "Enter" && start()} aria-label="예산 억원"
                  style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, background: C.paper,
                    color: C.ink, borderRadius: 11, padding: "13px 40px 13px 14px", fontSize: 17, fontWeight: 700, fontFamily: FONT }} />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  fontSize: 14, fontWeight: 700, color: C.inkSoft }}>억</span>
              </div>
              <button onClick={start} style={{ border: 0, cursor: "pointer", background: C.ink, color: C.paper,
                fontWeight: 800, fontSize: 15, borderRadius: 11, padding: "0 18px", fontFamily: FONT,
                display: "flex", alignItems: "center", gap: 6 }}>
                물건 찾기 <span style={{ color: C.gold }}>→</span>
              </button>
            </div>
            <div style={{ marginTop: 9, fontSize: 11.5, color: C.inkSoft }}>
              예산 안에서 <b style={{ color: C.brandDeep }}>시세보다 싸고</b> 서류가 안전한 물건만 추립니다.
            </div>
          </div>
        </header>

        {/* 법원경매 30초 이해 */}
        <section style={{ padding: "16px 0" }}>
          <div style={{
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "18px 16px", boxShadow: C.shadow,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.brandDeep, letterSpacing: ".08em", marginBottom: 8 }}>
              법원경매 30초 이해
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💰</span>
                <div><b>왜 싸?</b> — 은행이 빌려준 돈을 못 받아서, 법원이 대신 팝니다. 시세보다 20~50% 저렴하게 시작해요.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚖️</span>
                <div><b>안전해?</b> — 법원이 주관하므로 사기는 없어요. 다만 서류(권리·임차인) 확인은 필수!</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🏠</span>
                <div><b>내가 사도 돼?</b> — 누구나 참여 가능. 보증금(최저가의 10%)을 내고 입찰하면 됩니다.</div>
              </div>
            </div>
          </div>
        </section>

        {/* 신호등 */}
        <section style={{ padding: "26px 0" }}>
          <Kicker>한눈에 읽는 신호</Kicker>
          <H2>물건마다, 신호등이 켜집니다</H2>
          <Sub>숫자 배지는 몇 차 경매인지 — 회차가 높을수록 유찰돼 더 싸졌다는 뜻이에요.</Sub>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <SigRow color={C.green} title="🟢 시세보다 저렴" desc="실거래가 대비 낮게 시작 — 남는 장사 가능성" round="3차" />
            <SigRow color={C.amber} title="🟡 시세보다 비쌈" desc="지금 값이면 급할 것 없음 — 유찰 기다려도 됨" round="1차" />
            <SigRow color={C.red} title="🔴 서류상 위험" desc="가등기·대항력 임차인 등 — 초보는 손대지 마세요" round="2차" />
          </div>
        </section>

        {/* 오늘의 추천 (실데이터) */}
        {reco.length > 0 && (
          <section style={{ padding: "26px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <Kicker>오늘의 추천</Kicker>
                <H2>예산 {budget}억, 이런 물건들</H2>
              </div>
              <button onClick={start} style={{ border: 0, background: "transparent", color: C.brandDeep,
                fontWeight: 800, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }}>전체 보기 →</button>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {reco.map((it) => <RecoCard key={it.id} it={it} onClick={() => router.push("/auction")} />)}
            </div>
          </section>
        )}

        {/* 기능 */}
        <section style={{ padding: "26px 0" }}>
          <Kicker>한 물건, 다 알려줘요</Kicker>
          <H2>물건을 열면 나오는 것</H2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginTop: 16 }}>
            <Feat ic="🚦" t="해도 되나 판정" d="저렴·비쌈·위험을 신호등으로. 초보 권장/비권장까지" />
            <Feat ic="📉" t="시세대비 할인" d="감정가 말고 실거래 시세 기준 진짜 할인율" />
            <Feat ic="📷" t="사진·감정평가 요점" d="물건 사진과 위치·구조·설비 감정 요점" />
            <Feat ic="⚠️" t="인수권리·명도" d="대항력·가등기 등 넘겨받는 위험을 경고" />
            <Feat ic="⚖️" t="배당 계산" d="대항력 임차인이어도 보증금 회수되는지 계산" />
            <Feat ic="🎯" t="낙찰가 역산" d="목표 수익률 넣으면 얼마에 입찰할지 알려줌" />
          </div>
        </section>

        {/* 초보 밴드 */}
        <section style={{ padding: "26px 0" }}>
          <div style={{ background: C.ink, color: C.paper, borderRadius: 20, padding: "24px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".09em", color: C.gold }}>경매 처음이세요?</div>
            <div style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-.02em", margin: "7px 0 0" }}>그대로 따라만 하세요</div>
            <p style={{ color: "rgba(250,247,240,.72)", fontSize: 13.5, margin: "6px 0 0" }}>용어 몰라도 됩니다. 예산 넣고, 신호등 보고, 하라는 대로.</p>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {["예산을 넣으면 살 수 있는 물건만 보여줍니다",
                "🟢 초록 + 낮은 회차부터, 🔴 빨강은 거릅니다",
                "사진·권리·배당 확인하고, 역산한 입찰가로 도전"].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ width: 26, height: 26, flex: "0 0 auto", borderRadius: "50%", background: C.brand,
                    color: "#04231a", fontWeight: 900, fontSize: 13, display: "grid", placeItems: "center" }}>{i + 1}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s}</span>
                </div>
              ))}
            </div>
            <button onClick={start} style={{ marginTop: 18, width: "100%", border: 0, cursor: "pointer",
              background: C.brand, color: "#04231a", fontWeight: 900, fontSize: 15.5, borderRadius: 12, padding: "14px", fontFamily: FONT }}>
              내 예산으로 물건 찾기 →
            </button>
          </div>
        </section>

        {/* 푸터 */}
        <footer style={{ borderTop: `1px solid ${C.line}`, marginTop: 8, padding: "22px 0 40px", color: C.inkSoft, fontSize: 12 }}>
          <div style={{ fontWeight: 900, color: C.ink, letterSpacing: "-.02em" }}>비비옥션</div>
          <div style={{ marginTop: 8, fontSize: 10.5, lineHeight: 1.5 }}>
            bbauction.co.kr · 전국 법원경매 물건을 시세·권리·수익 관점으로 안내합니다.
            최종 판단과 권리분석은 매각물건명세서·등기부·현황조사서로 반드시 재확인하세요. 본 서비스는 투자 결과를 보장하지 않습니다.
          </div>
        </footer>
      </Wrap>
    </div>
  )
}

function Wrap({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 18px", ...style }}>{children}</div>
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".09em", color: C.inkSoft }}>{children}</div>
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-.02em", margin: "7px 0 0", textWrap: "balance" }}>{children}</h2>
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p style={{ color: C.inkSoft, fontSize: 13.5, margin: "6px 0 0" }}>{children}</p>
}
function SigRow({ color, title, desc, round }: { color: string; title: string; desc: string; round: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.card,
      border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 14px" }}>
      <span style={{ width: 15, height: 15, borderRadius: "50%", marginTop: 3, flex: "0 0 auto",
        background: color, boxShadow: `0 0 0 4px ${color}28` }} />
      <div>
        <div style={{ fontWeight: 800, fontSize: 14.5 }}>{title}</div>
        <div style={{ color: C.inkSoft, fontSize: 12.5, marginTop: 1 }}>{desc}</div>
      </div>
      <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 11, fontWeight: 800, color: C.inkSoft,
        border: `1px dashed ${C.line}`, borderRadius: 8, padding: "4px 8px" }}>{round}</span>
    </div>
  )
}
function Feat({ ic, t, d }: { ic: string; t: string; d: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: C.greenBg, color: C.brandDeep,
        display: "grid", placeItems: "center", fontSize: 17 }}>{ic}</div>
      <div style={{ fontWeight: 800, fontSize: 13.5, marginTop: 10, letterSpacing: "-.01em" }}>{t}</div>
      <div style={{ color: C.inkSoft, fontSize: 11.5, marginTop: 3, lineHeight: 1.45 }}>{d}</div>
    </div>
  )
}

function RecoCard({ it, onClick }: { it: RecoItem; onClick: () => void }) {
  const chip = it.signal_level === "저렴" ? { bg: C.greenBg, fg: C.green }
    : it.signal_level === "비쌈" ? { bg: C.amberBg, fg: C.amber } : { bg: C.redBg, fg: C.red }
  return (
    <button onClick={onClick} style={{ textAlign: "left", cursor: "pointer", background: C.card,
      border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 14px", boxShadow: C.shadow, fontFamily: FONT, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, padding: "4px 8px", borderRadius: 8, background: chip.bg, color: chip.fg }}>
          {it.signal} {it.signal_level} · {it.round}차
        </span>
        <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{(it.kind || "").split(",")[0]}</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 8 }}>{it.display_no}</div>
      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 1 }}>{it.court}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.line}`, alignItems: "flex-end" }}>
        <div><div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700 }}>감정가</div>
          <div style={{ fontSize: 15, fontWeight: 900 }} className="tnum">{eok(it.appraisal_price)}</div></div>
        <div><div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700 }}>경매시작가</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.brand }} className="tnum">{eok(it.min_bid_price)}</div></div>
        {it.discount_pct != null && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.brand }}>-{it.discount_pct}%</div>
            <div style={{ fontSize: 10, color: C.inkSoft, fontWeight: 700 }}>{it.price_ref_label || "시세"}대비</div>
          </div>
        )}
      </div>
    </button>
  )
}
