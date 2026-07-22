// app/api/kakao-address/route.ts
// Kakao 주소 검색 API 서버 프록시 (API 키 보호)
import { NextRequest, NextResponse } from "next/server"
import { normalizeAddressText } from "@/lib/address"

type KakaoAddressDoc = {
  address_name?: string
  road_address?: { address_name?: string }
  address?: { b_code?: string }
}

type KakaoKeywordDoc = {
  place_name?: string
  address_name?: string
  road_address_name?: string
  address?: { b_code?: string }
  road_address?: { address_name?: string }
}

type Suggestion = {
  type: "address" | "keyword"
  addressName: string
  roadAddress: string
  lawdCd: string
  bjdongCd: string
}

function toSuggestion(doc: KakaoAddressDoc | KakaoKeywordDoc, type: "address" | "keyword"): Suggestion | null {
  const addressName =
    ("place_name" in doc ? doc.place_name : doc.address_name) || ""
  const roadAddress =
    ("road_address_name" in doc ? doc.road_address_name : doc.road_address?.address_name) || ""
  const bCode   = doc.address?.b_code || ""
  const lawdCd  = bCode.slice(0, 5)
  const bjdongCd = bCode.slice(5, 10)

  const normalizedAddressName = normalizeAddressText(addressName)
  const normalizedRoadAddress = normalizeAddressText(roadAddress)
  if (!normalizedAddressName && !normalizedRoadAddress) return null

  return {
    type,
    addressName: normalizedAddressName || normalizedRoadAddress,
    roadAddress: normalizedRoadAddress,
    lawdCd,
    bjdongCd,
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || ""
  const kakaoKey = process.env.KAKAO_REST_API_KEY

  if (!kakaoKey || !query || query.length < 2) {
    return NextResponse.json({ documents: [] })
  }

  try {
    const q = normalizeAddressText(query)

    // 주소 검색 + 키워드 검색 병렬 실행
    const [addrRes, kwRes] = await Promise.all([
      fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=5`,
        { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
      ),
      fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q + " 아파트")}&category_group_code=SW8&size=5`,
        { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
      ),
    ])

    const [addrData, kwData] = await Promise.all([
      addrRes.ok ? addrRes.json() : { documents: [] },
      kwRes.ok  ? kwRes.json()  : { documents: [] },
    ])

    const docs = [
      ...(addrData.documents ?? []).map((d: KakaoAddressDoc) => toSuggestion(d, "address")),
      ...(kwData.documents ?? []).map((d: KakaoKeywordDoc) => toSuggestion(d, "keyword")),
    ].filter((doc): doc is Suggestion => Boolean(doc))

    const seen = new Set<string>()
    const documents = docs.filter((doc) => {
      const key = doc.roadAddress || doc.addressName
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ documents })
  } catch (err) {
    return NextResponse.json({ documents: [], error: "주소 검색 중 오류가 발생했습니다" })
  }
}
