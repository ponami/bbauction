import type { ReportPersona } from "@/lib/reportProducts"
import { fmtManwon } from "./priceGuidance"

export type ReportPurpose = "" | "실거주" | "투자"

type ResolvedReportPersona = Exclude<ReportPersona, "general"> | "general"

export interface ReportAssumptionRow {
  label: string
  value: string
  note?: string
}

export interface ReportInputOverrides {
  purpose?: ReportPurpose
  reportPersona?: ResolvedReportPersona
  budget?: number | null
  cashOnHand?: number | null
  loanAmount?: number | null
  ltvPct?: number | null
  interestRate?: number | null
  loanYears?: number | null
  homesOwned?: number | null
  holdYears?: number | null
  moveCost?: number | null
  interiorCost?: number | null
  monthlyFixedCost?: number | null
}

export interface ReportInputModel {
  purpose: ReportPurpose
  reportPersona: ResolvedReportPersona
  budget: number | null
  cashOnHand: number | null
  loanAmount: number | null
  ltvPct: number
  interestRate: number
  loanYears: number
  homesOwned: number
  holdYears: number | null
  moveCost: number
  interiorCost: number
  monthlyFixedCost: number
  acquisitionTaxRate: number
  acquisitionTax: number
  brokerFeeRate: number
  brokerFee: number
  effectiveLoanAmount: number
  effectiveCashNeeded: number
  totalUpfrontCost: number
  estimatedMonthlyPayment: number
  monthlyTotalHousingCost: number
  cashBufferAfterPurchase: number | null
  assumptions: ReportAssumptionRow[]
}

function parseNullableNumber(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

function clampNumber(value: number | null | undefined, min: number, max: number) {
  if (value == null) return null
  return Math.min(max, Math.max(min, value))
}

function roundCurrency(value: number) {
  return Math.max(0, Math.round(value))
}

function estimateAcquisitionTaxRate(targetPrice: number, homesOwned: number) {
  if (targetPrice <= 0) return 0
  if (homesOwned >= 1) return 4.6
  if (targetPrice <= 60000) return 1.1
  if (targetPrice <= 90000) return 2.2
  return 3.5
}

function estimateBrokerFeeRate(targetPrice: number) {
  if (targetPrice <= 0) return 0
  if (targetPrice <= 50000) return 0.4
  if (targetPrice <= 90000) return 0.5
  if (targetPrice <= 120000) return 0.6
  return 0.7
}

export function estimateMonthlyPayment(principalMan: number, annualRate = 4.2, years = 30) {
  if (principalMan <= 0) return 0
  const principalWon = principalMan * 10000
  const monthlyRate = annualRate / 100 / 12
  const months = years * 12
  const paymentWon = monthlyRate === 0
    ? principalWon / months
    : principalWon * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
  return Math.round(paymentWon / 10000)
}

function parsePurpose(value: string | null): ReportPurpose {
  return value === "투자" ? "투자" : value === "실거주" ? "실거주" : ""
}

function resolveReportPersona(purpose: ReportPurpose, reportMode: string | null): ResolvedReportPersona {
  if (reportMode === "agent") return "agent"
  if (purpose === "투자") return "investor"
  if (purpose === "실거주") return "first-home"
  return "general"
}

export function parseReportInputOverrides(searchParams: URLSearchParams): ReportInputOverrides {
  const purpose = parsePurpose(searchParams.get("purpose"))
  return {
    purpose,
    reportPersona: resolveReportPersona(purpose, searchParams.get("reportMode")),
    budget: parseNullableNumber(searchParams.get("budget")),
    cashOnHand: parseNullableNumber(searchParams.get("cash")) ?? parseNullableNumber(searchParams.get("cashOnHand")),
    loanAmount: parseNullableNumber(searchParams.get("loanAmount")),
    ltvPct: parseNullableNumber(searchParams.get("ltvPct")),
    interestRate: parseNullableNumber(searchParams.get("interestRate")),
    loanYears: parseNullableNumber(searchParams.get("loanYears")),
    homesOwned: parseNullableNumber(searchParams.get("homesOwned")),
    holdYears: parseNullableNumber(searchParams.get("holdYears")),
    moveCost: parseNullableNumber(searchParams.get("moveCost")),
    interiorCost: parseNullableNumber(searchParams.get("interiorCost")),
    monthlyFixedCost: parseNullableNumber(searchParams.get("monthlyFixedCost")),
  }
}

export function buildReportInputModel(input: ReportInputOverrides & {
  targetPrice: number
  buildYear?: number | null
}): ReportInputModel {
  const purpose = input.purpose ?? ""
  const reportPersona = input.reportPersona ?? resolveReportPersona(purpose, null)
  const ltvPct = clampNumber(input.ltvPct, 0, 90) ?? 70
  const interestRate = clampNumber(input.interestRate, 0, 20) ?? 4.2
  const loanYears = Math.round(clampNumber(input.loanYears, 1, 40) ?? 30)
  const homesOwned = Math.max(0, Math.round(input.homesOwned ?? 0))
  const holdYears = clampNumber(input.holdYears, 1, 20)
  const moveCost = roundCurrency(input.moveCost ?? 0)
  const interiorCost = roundCurrency(input.interiorCost ?? 0)
  const monthlyFixedCost = roundCurrency(input.monthlyFixedCost ?? 0)
  const budget = input.budget != null ? roundCurrency(input.budget) : null
  const cashOnHand = input.cashOnHand != null ? roundCurrency(input.cashOnHand) : null
  const requestedLoanAmount = input.loanAmount != null ? roundCurrency(input.loanAmount) : null
  const defaultLoanAmount = roundCurrency(input.targetPrice * (ltvPct / 100))
  const effectiveLoanAmount = Math.min(
    input.targetPrice,
    Math.max(0, requestedLoanAmount ?? defaultLoanAmount),
  )
  const effectiveCashNeeded = roundCurrency(Math.max(input.targetPrice - effectiveLoanAmount, 0))
  const acquisitionTaxRate = estimateAcquisitionTaxRate(input.targetPrice, homesOwned)
  const acquisitionTax = roundCurrency(input.targetPrice * (acquisitionTaxRate / 100))
  const brokerFeeRate = estimateBrokerFeeRate(input.targetPrice)
  const brokerFee = roundCurrency(input.targetPrice * (brokerFeeRate / 100))
  const totalUpfrontCost = roundCurrency(
    effectiveCashNeeded + acquisitionTax + brokerFee + moveCost + interiorCost,
  )
  const estimatedMonthlyPayment = estimateMonthlyPayment(effectiveLoanAmount, interestRate, loanYears)
  const monthlyTotalHousingCost = roundCurrency(estimatedMonthlyPayment + monthlyFixedCost)
  const cashBufferAfterPurchase = cashOnHand != null
    ? roundCurrency(cashOnHand - totalUpfrontCost)
    : null
  const assumptions: ReportAssumptionRow[] = [
    {
      label: "목적",
      value: purpose || "기본",
      note: reportPersona === "agent"
        ? "상담 브리프 기준"
        : reportPersona === "investor"
        ? "투자 판단 기준"
        : "실거주 판단 기준",
    },
    {
      label: "대출 가정",
      value: `${fmtManwon(effectiveLoanAmount)} · LTV ${ltvPct}%`,
      note: requestedLoanAmount != null ? "입력한 대출 예정액 기준" : "입력값 없으면 기본 비율 적용",
    },
    {
      label: "금리/기간",
      value: `${interestRate.toFixed(1)}% · ${loanYears}년`,
    },
  ]

  if (budget != null) {
    assumptions.push({
      label: "예산",
      value: fmtManwon(budget),
    })
  }

  if (cashOnHand != null) {
    assumptions.push({
      label: "보유 현금",
      value: fmtManwon(cashOnHand),
      note: cashBufferAfterPurchase != null ? `잔여 ${fmtManwon(cashBufferAfterPurchase)}` : undefined,
    })
  }

  if (homesOwned > 0) {
    assumptions.push({
      label: "보유주택수",
      value: `${homesOwned}채`,
      note: "세금 보수적 가정에 반영",
    })
  }

  if (holdYears != null) {
    assumptions.push({
      label: "예상 보유기간",
      value: `${holdYears}년`,
    })
  }

  if (moveCost > 0 || interiorCost > 0 || monthlyFixedCost > 0) {
    assumptions.push({
      label: "추가 비용",
      value: `초기 ${fmtManwon(moveCost + interiorCost)} / 월 ${fmtManwon(monthlyFixedCost)}`,
      note: "이사·인테리어·관리비 등 입력값 기준",
    })
  }

  return {
    purpose,
    reportPersona,
    budget,
    cashOnHand,
    loanAmount: requestedLoanAmount,
    ltvPct,
    interestRate,
    loanYears,
    homesOwned,
    holdYears,
    moveCost,
    interiorCost,
    monthlyFixedCost,
    acquisitionTaxRate,
    acquisitionTax,
    brokerFeeRate,
    brokerFee,
    effectiveLoanAmount,
    effectiveCashNeeded,
    totalUpfrontCost,
    estimatedMonthlyPayment,
    monthlyTotalHousingCost,
    cashBufferAfterPurchase,
    assumptions,
  }
}
