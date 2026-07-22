"use client"

import { useState } from "react"

// ── 취득세 계산 ──────────────────────────────────────────────
function calcAcquisitionTax(price: number, houseCount: number, isAdjusted: boolean) {
  // price: 만원 단위
  let rate = 0 // 취득세율

  if (houseCount === 1 || (houseCount === 2 && !isAdjusted)) {
    // 1주택 / 비조정 2주택: 구간별
    if (price <= 60000) {
      rate = 0.01
    } else if (price <= 90000) {
      // 6억~9억: 선형 증가 1%→3%
      rate = ((price * 2) / 30000 - 3) / 100
    } else {
      rate = 0.03
    }
  } else if (houseCount === 2 && isAdjusted) {
    rate = 0.08
  } else if (houseCount >= 3 && !isAdjusted) {
    rate = 0.08
  } else {
    // 3주택+ 조정
    rate = 0.12
  }

  const acquisitionTax = Math.round(price * rate)

  // 지방교육세: 취득세의 10% (단, 4%이상 구간은 면제)
  const eduTax = rate <= 0.03 ? Math.round(acquisitionTax * 0.1) : 0

  // 농어촌특별세: 2% 초과 구간은 취득세의 10%
  const ruralTax = rate > 0.01 ? Math.round(acquisitionTax * 0.1) : 0

  return {
    rate,
    acquisitionTax,
    eduTax,
    ruralTax,
    total: acquisitionTax + eduTax + ruralTax,
  }
}

// ── 양도소득세 계산 ──────────────────────────────────────────
const TAX_BRACKETS = [
  { limit: 1400,  rate: 0.06, deduction: 0 },
  { limit: 5000,  rate: 0.15, deduction: 126 },
  { limit: 8800,  rate: 0.24, deduction: 576 },
  { limit: 15000, rate: 0.35, deduction: 1544 },
  { limit: 30000, rate: 0.38, deduction: 1994 },
  { limit: 50000, rate: 0.40, deduction: 2594 },
  { limit: 100000,rate: 0.42, deduction: 3594 },
  { limit: Infinity, rate: 0.45, deduction: 6594 },
]

function calcIncomeTax(taxable: number): number {
  for (const b of TAX_BRACKETS) {
    if (taxable <= b.limit) {
      return Math.round(taxable * b.rate - b.deduction)
    }
  }
  return 0
}

// 장기보유특별공제율 (1주택, 거주 2년 이상)
function longTermDeductionRate(holdYears: number, liveYears: number, houseCount: number): number {
  if (holdYears < 3) return 0
  if (houseCount > 1) {
    // 다주택: 보유기간만 적용 (일반 공제율)
    const years = Math.min(holdYears, 15)
    return Math.min(years * 0.02, 0.30) // 2%/년, 최대 30%
  }
  // 1주택: 보유 4% + 거주 4% = 최대 80%
  const holdRate = Math.min(Math.floor(holdYears) * 0.04, 0.40)
  const liveRate = liveYears >= 2 ? Math.min(Math.floor(liveYears) * 0.04, 0.40) : 0
  return Math.min(holdRate + liveRate, 0.80)
}

function calcCapitalGainsTax(
  buyPrice: number,
  sellPrice: number,
  buyCost: number,
  sellCost: number,
  holdYears: number,
  liveYears: number,
  houseCount: number,
) {
  const gain = sellPrice - buyPrice - buyCost - sellCost
  if (gain <= 0) return { gain: 0, deduction: 0, deductionRate: 0, taxable: 0, tax: 0, localTax: 0, total: 0, exempt: false }

  // 1주택 비과세: 보유 2년 + 거주 2년 (조정지역) 또는 보유 2년 (비조정)
  // 12억 초과분만 과세
  if (houseCount === 1 && holdYears >= 2 && liveYears >= 2) {
    const exemptLimit = 120000 // 12억
    if (sellPrice <= exemptLimit) {
      return { gain, deduction: gain, deductionRate: 1, taxable: 0, tax: 0, localTax: 0, total: 0, exempt: true }
    }
    // 12억 초과분 과세
    const taxableGain = Math.round(gain * (1 - exemptLimit / sellPrice))
    const deductRate = longTermDeductionRate(holdYears, liveYears, 1)
    const deductAmt  = Math.round(taxableGain * deductRate)
    const basicDeduct = 250 // 기본공제 250만원
    const taxable = Math.max(0, taxableGain - deductAmt - basicDeduct)
    const tax      = calcIncomeTax(taxable)
    const localTax = Math.round(tax * 0.1)
    return { gain, deduction: deductAmt, deductionRate: deductRate, taxable, tax, localTax, total: tax + localTax, exempt: false }
  }

  // 단기양도 중과
  let shortRate: number | null = null
  if (holdYears < 1)  shortRate = 0.70
  else if (holdYears < 2) shortRate = 0.60

  if (shortRate) {
    const tax      = Math.round(gain * shortRate)
    const localTax = Math.round(tax * 0.1)
    return { gain, deduction: 0, deductionRate: 0, taxable: gain, tax, localTax, total: tax + localTax, exempt: false, shortRate }
  }

  const deductRate = longTermDeductionRate(holdYears, liveYears, houseCount)
  const deductAmt  = Math.round(gain * deductRate)
  const basicDeduct = 250
  const taxable = Math.max(0, gain - deductAmt - basicDeduct)
  const tax      = calcIncomeTax(taxable)
  const localTax = Math.round(tax * 0.1)
  return { gain, deduction: deductAmt, deductionRate: deductRate, taxable, tax, localTax, total: tax + localTax, exempt: false }
}

// ── 포매터 ────────────────────────────────────────────────────
function fmt(manwon: number): string {
  if (!manwon || manwon <= 0) return "0원"
  if (manwon >= 10000) {
    const 억 = Math.floor(manwon / 10000)
    const 천 = Math.round((manwon % 10000) / 1000)
    return 천 ? `${억}억 ${천}천만원` : `${억}억원`
  }
  return `${manwon.toLocaleString("ko-KR")}만원`
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

// ── 입력 필드 ─────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, unit = "만원" }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  unit?: string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 7,
            border: "1px solid #E5E7EB", fontSize: 13, outline: "none",
            background: "#F9FAFB",
          }}
        />
        <span style={{ fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap" }}>{unit}</span>
      </div>
    </div>
  )
}

function ResultRow({ label, value, bold, green, red }: {
  label: string; value: string; bold?: boolean; green?: boolean; red?: boolean
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F9FAFB" }}>
      <span style={{ fontSize: 12, color: "#6B7280" }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: bold ? 700 : 500,
        color: green ? "#16A34A" : red ? "#DC2626" : "#111827",
      }}>{value}</span>
    </div>
  )
}

// ── 취득세 탭 ─────────────────────────────────────────────────
function AcquisitionTab() {
  const [price, setPrice]           = useState("")
  const [houseCount, setHouseCount] = useState(1)
  const [isAdjusted, setIsAdjusted] = useState(false)

  const p = parseInt(price.replace(/,/g, "")) || 0
  const result = p > 0 ? calcAcquisitionTax(p, houseCount, isAdjusted) : null

  return (
    <div>
      <Field label="매수 가격" value={price} onChange={setPrice} placeholder="예: 80000 (8억)" />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>보유 주택 수 (취득 후)</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setHouseCount(n)} style={{
              flex: 1, padding: "7px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12,
              background: houseCount === n ? "#16A34A" : "#F3F4F6",
              color: houseCount === n ? "#fff" : "#6B7280",
              fontWeight: houseCount === n ? 700 : 400,
            }}>{n === 3 ? "3주택+" : `${n}주택`}</button>
          ))}
        </div>
      </div>

      {houseCount >= 2 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: "#374151" }}>조정대상지역</span>
          <button onClick={() => setIsAdjusted(!isAdjusted)} style={{
            width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
            background: isAdjusted ? "#16A34A" : "#D1D5DB", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 2, left: isAdjusted ? 20 : 2,
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              transition: "left 0.15s",
            }} />
          </button>
        </div>
      )}

      {result && (
        <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 12px", marginTop: 4 }}>
          <ResultRow label="취득세율"     value={pct(result.rate)} />
          <ResultRow label="취득세"       value={fmt(result.acquisitionTax)} />
          <ResultRow label="지방교육세"   value={fmt(result.eduTax)} />
          <ResultRow label="농어촌특별세" value={fmt(result.ruralTax)} />
          <div style={{ height: 1, background: "#E5E7EB", margin: "6px 0" }} />
          <ResultRow label="합계" value={fmt(result.total)} bold green />
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, lineHeight: 1.6 }}>
            ※ 실제 세액은 전문가 확인 필요. 국민주택규모(85㎡) 초과 여부, 생애최초 감면 등 미반영
          </div>
        </div>
      )}
    </div>
  )
}

// ── 양도소득세 탭 ─────────────────────────────────────────────
function CapitalGainsTab() {
  const [buyPrice,  setBuyPrice]  = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [buyCost,   setBuyCost]   = useState("")
  const [sellCost,  setSellCost]  = useState("")
  const [holdYears, setHoldYears] = useState("")
  const [liveYears, setLiveYears] = useState("")
  const [houseCount, setHouseCount] = useState(1)

  const bp = parseInt(buyPrice)  || 0
  const sp = parseInt(sellPrice) || 0
  const bc = parseInt(buyCost)   || 0
  const sc = parseInt(sellCost)  || 0
  const hy = parseFloat(holdYears) || 0
  const ly = parseFloat(liveYears) || 0

  const result = bp > 0 && sp > 0
    ? calcCapitalGainsTax(bp, sp, bc, sc, hy, ly, houseCount)
    : null

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 0 }}>
        <Field label="취득가"   value={buyPrice}  onChange={setBuyPrice}  placeholder="50000" />
        <Field label="양도가"   value={sellPrice} onChange={setSellPrice} placeholder="80000" />
        <Field label="취득비용" value={buyCost}   onChange={setBuyCost}   placeholder="500 (선택)" />
        <Field label="양도비용" value={sellCost}  onChange={setSellCost}  placeholder="300 (선택)" />
        <Field label="보유기간" value={holdYears} onChange={setHoldYears} placeholder="3" unit="년" />
        <Field label="거주기간" value={liveYears} onChange={setLiveYears} placeholder="2" unit="년" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>보유 주택 수</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setHouseCount(n)} style={{
              flex: 1, padding: "7px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12,
              background: houseCount === n ? "#16A34A" : "#F3F4F6",
              color: houseCount === n ? "#fff" : "#6B7280",
              fontWeight: houseCount === n ? 700 : 400,
            }}>{n === 3 ? "3주택+" : `${n}주택`}</button>
          ))}
        </div>
      </div>

      {result && (
        <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 12px" }}>
          {result.exempt ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>1주택 비과세</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                양도차익 {fmt(result.gain)} 전액 비과세 (2년 보유+거주)
              </div>
            </div>
          ) : (
            <>
              <ResultRow label="양도차익"     value={fmt(result.gain)} />
              {(result as { shortRate?: number }).shortRate ? (
                <ResultRow label="단기양도 세율" value={pct((result as { shortRate?: number }).shortRate!)} red />
              ) : (
                <ResultRow label={`장기보유공제 (${pct(result.deductionRate)})`} value={`-${fmt(result.deduction)}`} green />
              )}
              <ResultRow label="과세표준"     value={fmt(result.taxable)} />
              <div style={{ height: 1, background: "#E5E7EB", margin: "6px 0" }} />
              <ResultRow label="양도소득세"   value={fmt(result.tax)} />
              <ResultRow label="지방소득세"   value={fmt(result.localTax)} />
              <div style={{ height: 1, background: "#E5E7EB", margin: "6px 0" }} />
              <ResultRow label="합계" value={fmt(result.total)} bold red />
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, lineHeight: 1.6 }}>
                ※ 기본공제 250만원 적용. 다주택 중과(+10~20%p), 주민세 별도. 전문가 확인 권장
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export function TaxCalculator() {
  const [tab, setTab] = useState<"acquisition" | "capital">("acquisition")

  return (
    <div>
      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
        {[
          { key: "acquisition", label: "취득세" },
          { key: "capital",     label: "양도소득세" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as "acquisition" | "capital")} style={{
            flex: 1, padding: "7px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
            background: tab === t.key ? "#fff" : "transparent",
            color: tab === t.key ? "#111827" : "#9CA3AF",
            fontWeight: tab === t.key ? 700 : 400,
            boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "acquisition" ? <AcquisitionTab /> : <CapitalGainsTab />}
    </div>
  )
}
