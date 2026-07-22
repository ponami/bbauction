"use client"

import { useState, useMemo } from "react"

function formatMan(man: number): string {
  if (man >= 10000) {
    const eok = Math.floor(man / 10000)
    const rem = man % 10000
    return rem > 0 ? `${eok}억 ${rem.toLocaleString()}만` : `${eok}억`
  }
  return `${man.toLocaleString()}만`
}

interface Props {
  /** 아파트 시세 (만원). 전달되면 매매가 입력란 초기값으로 사용 */
  defaultPrice?: number | null
  compact?: boolean  // bottom sheet용 컴팩트 모드
}

export default function LoanCalculator({ defaultPrice, compact = false }: Props) {
  const [price,    setPrice]    = useState(defaultPrice ? String(defaultPrice) : "")
  const [ltv,      setLtv]      = useState("70")
  const [rate,     setRate]     = useState("4.0")
  const [years,    setYears]    = useState("30")
  const [jeonse,   setJeonse]   = useState("") // 전세 보증금 (만원)

  const result = useMemo(() => {
    const p = parseInt(price.replace(/,/g, "")) || 0
    const ltvNum = Math.min(100, Math.max(0, parseFloat(ltv) || 70))
    const r = (parseFloat(rate) || 4) / 100 / 12
    const n = (parseInt(years) || 30) * 12
    const j = parseInt(jeonse.replace(/,/g, "")) || 0

    if (!p) return null

    const loanAmt  = Math.round(p * ltvNum / 100)          // 대출 가능액 (만원)
    const selfAmt  = p - loanAmt - j                        // 자기자금 필요액
    const monthly  = r > 0
      ? Math.round(loanAmt * 10000 * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1))
      : Math.round(loanAmt * 10000 / n)                    // 무이자 분할 fallback (원)
    const totalInterest = Math.round((monthly * n - loanAmt * 10000) / 10000) // 만원

    return { loanAmt, selfAmt, monthly, totalInterest, ltvNum }
  }, [price, ltv, rate, years, jeonse])

  const inputStyle = {
    padding: compact ? "7px 10px" : "9px 12px",
    borderRadius: 8, border: "1px solid #E5E7EB",
    fontSize: compact ? 13 : 14, width: "100%",
    outline: "none", boxSizing: "border-box" as const,
  }

  const labelStyle = {
    fontSize: 11, color: "#6B7280", fontWeight: 600,
    display: "block" as const, marginBottom: 4,
  }

  return (
    <div style={{ fontSize: 13 }}>
      {!compact && (
        <div style={{ marginBottom: 14, fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
          매매가·LTV·금리를 입력하면 대출 가능 금액과 월 상환액을 계산합니다.
        </div>
      )}

      {/* 입력 필드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 8 : 10, marginBottom: compact ? 10 : 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>매매가 (만원)</label>
          <input
            type="text"
            value={price}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, "")
              setPrice(v ? Number(v).toLocaleString() : "")
            }}
            placeholder="예: 66,000"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>LTV (%)</label>
          <select value={ltv} onChange={e => setLtv(e.target.value)} style={inputStyle}>
            <option value="50">50%</option>
            <option value="60">60%</option>
            <option value="70">70% (일반)</option>
            <option value="80">80%</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>금리 (%)</label>
          <input
            type="number"
            value={rate}
            onChange={e => setRate(e.target.value)}
            step="0.1" min="1" max="12"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>대출 기간 (년)</label>
          <select value={years} onChange={e => setYears(e.target.value)} style={inputStyle}>
            <option value="10">10년</option>
            <option value="20">20년</option>
            <option value="30">30년 (일반)</option>
            <option value="40">40년</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>전세 보증금 (만원)</label>
          <input
            type="text"
            value={jeonse}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, "")
              setJeonse(v ? Number(v).toLocaleString() : "")
            }}
            placeholder="없으면 0"
            style={inputStyle}
          />
        </div>
      </div>

      {/* 결과 */}
      {result ? (
        <div style={{
          background: "#F0FDF4", borderRadius: 10, padding: compact ? "10px 12px" : "14px 16px",
          border: "1px solid #BBF7D0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#15803D", fontWeight: 700 }}>대출 가능액 ({result.ltvNum}%)</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>{formatMan(result.loanAmt)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingTop: 8, borderTop: "1px solid #D1FAE5" }}>
            <span style={{ fontSize: 11, color: "#6B7280" }}>월 상환액</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#16A34A" }}>
              {result.monthly.toLocaleString()}원
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: result.selfAmt !== undefined ? 8 : 0, paddingTop: 8, borderTop: "1px solid #D1FAE5" }}>
            <span style={{ fontSize: 11, color: "#6B7280" }}>총 이자 ({years}년)</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{formatMan(result.totalInterest)}</span>
          </div>
          {result.selfAmt > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #D1FAE5" }}>
              <span style={{ fontSize: 11, color: "#6B7280" }}>필요 자기자금</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{formatMan(result.selfAmt)}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
          매매가를 입력하면 계산 결과가 표시됩니다
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: "#9CA3AF", lineHeight: 1.5 }}>
        * 원리금균등상환 기준 / 실제 대출 조건은 은행마다 다를 수 있습니다<br />
        * LTV는 지역·주택 가격·규제지역에 따라 30~80%까지 차등 적용됩니다
      </div>
    </div>
  )
}
