/**
 * POST /api/apt-summary
 * Gemini를 이용한 아파트 한줄 AI 요약 생성
 *
 * Body: {
 *   apt_nm: string,
 *   sigungu: string,
 *   price?: number,          // 만원
 *   build_year?: number,
 *   risk_score: number,      // 0~100
 *   risk_level: string,      // 낮음/보통/높음
 *   mode: string,            // safe/good/neutral/caution/danger
 *   jeonse_risk_score?: number,
 *   jeonse_risk_level?: string,
 *   school_score?: number,
 *   kapt_ho_cnt?: number,
 *   kapt_builder?: string,
 *   kapt_heat?: string,
 *   show_rise?: boolean,
 *   rise_prob?: number,
 *   expected_gain?: number,
 *   expected_loss?: number,
 *   horizon_m?: number,
 * }
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 500 });
  }

  const data = await req.json();

  const {
    apt_nm,
    sigungu,
    price,
    build_year,
    risk_score,
    risk_level,
    mode,
    jeonse_risk_level,
    school_score,
    kapt_ho_cnt,
    kapt_builder,
    kapt_heat,
    show_rise,
    rise_prob,
    expected_gain,
    expected_loss,
    horizon_m = 6,
  } = data;

  // 프롬프트 구성
  const priceStr = price ? `${(price / 10000).toFixed(1)}억` : "가격 미확인";
  const yearStr = build_year ? `${build_year}년 준공` : "";

  // 전망: 수익률 단정 표현 금지 — 방향·리스크 수준까지만
  let outlookStr: string;
  if (show_rise && rise_prob) {
    outlookStr = `${horizon_m}개월 지역 전망 순위 상위 ${Math.round((1 - rise_prob) * 100)}%`;
  } else {
    outlookStr = `${horizon_m}개월 내 하락 리스크 감지`;
  }

  const jeonseStr = jeonse_risk_level ? `전세 리스크 ${jeonse_risk_level}` : "";
  const schoolStr = school_score != null ? `학군 점수 ${school_score}/100` : "";
  const kaptStr = [
    kapt_ho_cnt ? `${kapt_ho_cnt}세대` : "",
    kapt_builder || "",
    kapt_heat || "",
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = `당신은 한국 부동산 AI 분석가입니다.
아래 아파트 정보를 바탕으로 투자자에게 유용한 핵심 인사이트를 한국어로 2문장 이내로 요약하세요.

[작성 규칙]
- 가격이나 손실·수익을 억원 단위의 절대금액으로 절대 표현하지 마세요.
- 전망은 방향성(상승·하락 가능성)과 리스크 수준만 언급하세요.
- 단지 특성(연식·세대수·학군·전세) 중 가장 두드러진 항목 1~2개만 포함하세요.
- 과장하거나 공포심을 유발하는 표현을 쓰지 마세요.

아파트명: ${apt_nm}
위치: ${sigungu}
가격: ${priceStr} ${yearStr}
${horizon_m}개월 전망: ${outlookStr}
리스크 점수: ${risk_score}/100 (${risk_level})
전세 상황: ${jeonseStr || "데이터 없음"}
학군: ${schoolStr || "데이터 없음"}
단지 정보: ${kaptStr || "데이터 없음"}

요약 (2문장 이내):`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini API 오류: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const json = await res.json();
    const summary =
      json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "요약 생성 실패";

    return NextResponse.json({ summary });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
