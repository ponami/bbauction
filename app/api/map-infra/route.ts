// app/api/map-infra/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get("type") // "hospital" | "academy"
  const latMin = parseFloat(searchParams.get("lat_min") || "")
  const latMax = parseFloat(searchParams.get("lat_max") || "")
  const lonMin = parseFloat(searchParams.get("lon_min") || "")
  const lonMax = parseFloat(searchParams.get("lon_max") || "")

  const kakaoKey = process.env.KAKAO_REST_API_KEY
  if (!kakaoKey) {
    console.error("KAKAO_REST_API_KEY is missing in environment variables.")
    return NextResponse.json({ success: false, error: "KAKAO_REST_API_KEY is not configured" }, { status: 500 })
  }

  if (isNaN(latMin) || isNaN(latMax) || isNaN(lonMin) || isNaN(lonMax)) {
    return NextResponse.json({ success: false, error: "Invalid bounding box coordinate parameters" }, { status: 400 })
  }

  // HP8: 병원, AC5: 학원, SC4: 학교
  const categoryCode = type === "hospital" ? "HP8" : type === "academy" ? "AC5" : type === "school" ? "SC4" : ""
  const query = type === "hospital" ? "병원" : type === "academy" ? "학원" : type === "school" ? "학교" : ""

  if (!query) {
    return NextResponse.json({ success: false, error: "Invalid type requested" }, { status: 400 })
  }

  // Kakao rect format: left_lng,bottom_lat,right_lng,top_lat (min_lng, min_lat, max_lng, max_lat)
  const rect = `${lonMin},${latMin},${lonMax},${latMax}`
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&rect=${rect}&category_group_code=${categoryCode}&size=15`

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${kakaoKey}`,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`Kakao API request failed with status ${res.status}: ${errorText}`)
      return NextResponse.json({ success: false, error: `Kakao API error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const places = (data.documents || []).map((p: any) => ({
      place_name: p.place_name,
      category_name: p.category_name,
      lat: parseFloat(p.y),
      lon: parseFloat(p.x),
      distance: p.distance,
      address_name: p.address_name,
      road_address_name: p.road_address_name,
      place_url: p.place_url,
    }))

    return NextResponse.json({ success: true, places })
  } catch (error) {
    console.error("Error fetching map infrastructure from Kakao:", error)
    console.error("[map-infra]", error)
    return NextResponse.json({ success: false, error: "주변 인프라 정보를 불러오는 중 오류가 발생했습니다" }, { status: 500 })
  }
}
