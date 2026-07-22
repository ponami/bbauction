// app/api/ml-forecast/route.ts
// Python ML 엔진 (FastAPI) 의 /market/score 를 프록시하는 라우트
import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse, MlForecastData, MlHorizonScore } from "@/lib/types"

const GATE_URL      = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || GATE_URL

// 시도 코드 → 지역명 매핑
const SIDO_NAMES: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천",
  "29": "광주", "30": "대전", "31": "울산", "36": "세종",
  "41": "경기", "43": "충북", "44": "충남", "46": "전남",
  "47": "경북", "48": "경남", "50": "제주",
}

export async function GET(req: NextRequest) {
  const lawdCd = req.nextUrl.searchParams.get("lawdCd") || process.env.LAWD_CD || ""
  const sidoCd = lawdCd ? lawdCd.slice(0, 2) : null
  const isSigungu = lawdCd.length >= 5

  try {
    const res = await fetch(
      `${ML_ENGINE_URL}/market/score?lawd_cd=${lawdCd}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) throw new Error(`ML 엔진 응답 오류: ${res.status}`)

    const raw = await res.json()

    // 각 horizon에서 시군구 점수 우선, 없으면 시도 점수 사용
    const horizons: MlHorizonScore[] = (raw.results ?? []).map((r: {
      horizon: number
      yyyymm: string
      total: number
      sido_scores: Record<string, number>
      sigungu_scores?: Record<string, number>
      dir_acc: number
    }) => {
      let regionScore: number | null = null
      if (isSigungu && r.sigungu_scores?.[lawdCd] != null) {
        regionScore = r.sigungu_scores[lawdCd]
      } else if (sidoCd && r.sido_scores?.[sidoCd] != null) {
        regionScore = r.sido_scores[sidoCd]
      }
      return {
        horizon: r.horizon,
        yyyymm: r.yyyymm,
        total: r.total,
        regionScore,
        dirAcc: r.dir_acc,
      }
    })

    const data: MlForecastData = {
      available: true,
      timestamp: raw.timestamp,
      horizons,
      lawdCd,
      regionName: isSigungu ? lawdCd : (sidoCd ? SIDO_NAMES[sidoCd] : undefined),
    }

    return NextResponse.json({ success: true, data } as ApiResponse<MlForecastData>)
  } catch (err) {
    // 엔진 미연결 시 정상 응답 (available: false)
    const data: MlForecastData = {
      available: false,
      error: err instanceof Error ? err.message : "ML 엔진 연결 실패",
    }
    return NextResponse.json({ success: true, data } as ApiResponse<MlForecastData>)
  }
}
