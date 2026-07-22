function normalizeText(value?: string) {
  return (value || "").toLowerCase().replace(/\s+/g, "")
}

const EXPLICIT_RENTAL_PATTERNS = [
  /공공임대/,
  /국민임대/,
  /영구임대/,
  /행복주택/,
  /장기전세/,
  /전세임대/,
  /매입임대/,
  /통합공공임대/,
  /임대아파트/,
  /임대주택/,
]

const PROBABLE_RENTAL_PATTERNS = [
  /lh\d+단지/,
  /lh\s*\d+단지/,
  /lh.*임대/,
]

export function getRentalAnalysisBlockReason(
  aptName?: string,
  address?: string,
  tradeCount?: number,
): string | null {
  const text = `${normalizeText(aptName)} ${normalizeText(address)}`

  if (EXPLICIT_RENTAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return "공공임대·임대주택으로 확인되어 매매 분석에서 제외했습니다."
  }

  if ((tradeCount ?? 0) === 0 && PROBABLE_RENTAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return "LH 임대성 단지로 추정되고 매매 실거래가 없어, 매매 분석에서 제외했습니다."
  }

  return null
}
