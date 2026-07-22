export interface AddressSuggestion {
  type: "address"
  addressName: string
  roadAddress: string
  lawdCd: string
  bjdongCd: string
  sido: string
  sigungu: string
  dong: string
}

export interface AreaOption {
  m2: string
  py: string
  label: string
}

export interface AptRankItem {
  rank: number
  name: string
  dong: string
  count: number
  avgPrice: number
  avgPricePerM2: number
  mainAreas: string[]
  discountRatio?: number
}

export interface NeighborhoodResult {
  undervalued: AptRankItem[]
  expensive: AptRankItem[]
  areaAvgPpm2?: number
  totalTx?: number
  message?: string
}

export function fmtPrice(manwon: number): string {
  if (manwon >= 10000) return `${(manwon / 10000).toFixed(1)}억`
  return `${manwon.toLocaleString("ko-KR")}만`
}
