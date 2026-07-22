// ============================================================
// AI API 래퍼 — Gemini
// ============================================================

import type { CategoryId, ClaudeAnalysisResponse, Trend } from "./types"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"

// 카테고리별 시스템 프롬프트 — 동적 생성 (요청 파라미터 우선, env 폴백)
function buildSystemPrompts(address?: string, aptName?: string): Record<CategoryId, string> {
  const addr = address || process.env.MY_ADDRESS || "분석 대상 아파트"
  const apt  = aptName  || process.env.MY_APT_NAME || "분석 대상 아파트"
  const loc  = addr.split(" ").slice(0, 3).join(" ")
  const numericDirective = `반드시 데이터 안의 실제 숫자를 2개 이상 인용하세요. 추측인 항목은 status를 '📋'로 표시하고, 설명 텍스트에 "(추측)", "(예상)", "(추정)" 등의 표현은 쓰지 마세요.`
  const fillInDirective = `\n[작성 규칙]\n- 값이 있는 숫자(가격, 비율, 점수 등)는 반드시 자연스러운 한국어 문장 안에 녹여 쓸 것.\n- 제공된 데이터에 없는 항목, null인 항목은 절대 언급하지 말 것.\n- 영문 변수명·키 이름을 그대로 출력하지 말 것 (한국어로만 표현할 것).`

  return {
    transport: `당신은 한국 부동산 교통 호재 전문 분석가입니다.
${addr} ${apt}의 교통 인프라 개선이 부동산 가치에 미치는 영향을 분석합니다.
지하철 연장, GTX, 광역버스 등 교통 개발 뉴스를 바탕으로 0~100점 투자 매력도를 평가하세요.
${numericDirective}`,

    policy: `당신은 한국 부동산 정책 전문 분석가입니다.
대출 규제, 세금 정책, 규제지역 지정 등 정부 정책이 ${loc} 아파트 매도에 미치는 영향을 분석합니다.
실수요자 매도 관점에서 0~100점으로 평가하세요.
${numericDirective}`,

    politics: `당신은 한국 정치와 부동산의 상관관계 전문가입니다.
현 정부의 부동산 관련 정책 방향, 지역 공약 이행 여부, 행정구역 변경 등 정치적 요인이
${loc} 아파트 가격에 미치는 영향을 0~100점으로 평가하세요.
${numericDirective}`,

    global: `당신은 글로벌 경제와 한국 부동산의 상관관계 전문가입니다.
★ FOMC(미 연준 금리 결정) 최우선 + 환율(원/달러, DXY) + 유가(국제유가, OPEC, WTI, 에너지)가 한국 주택시장에 가장 큰 영향을 줍니다.
FOMC 성명/점도표/파월, 환율 급등락, 유가 충격, 미국/중국 주요 지표, 인플레, QT, 지정학(중동·에너지)이 ${loc} 지역 부동산에 미치는 영향을 분석하세요.
FOMC·환율·유가 관련 내용은 최우선으로 반영.
0~100점으로 투자 환경을 평가하세요.
${numericDirective}`,

    market: `당신은 한국 부동산 시장 분석 전문가입니다.
해당 지역 공급 동향, ${loc} 시장 동향, 실거래가 추이를 바탕으로
${apt}의 시장 경쟁력을 0~100점으로 평가하세요.
제공된 데이터 안의 숫자(가격·거래건수·지역점수 등)를 반드시 한국어 문장에 직접 써 넣으세요.
${numericDirective}${fillInDirective}`,

    geo: `당신은 부동산 입지 분석 전문가입니다.
서울 접근성, 교통망 연결성, 지역 개발 계획 등 지정학적 요인이
${addr} ${apt} 가치에 미치는 영향을 0~100점으로 평가하세요.
${numericDirective}`,

    school: `당신은 학군과 부동산 가치 상관관계 전문가입니다.
    초품아(초등학교를 신호등 없이 도보로 갈 수 있는 아파트) 여부, 학군 수준,
    초등학교까지의 접근성, 인근 학원 수와 학원 밀집도가 아파트 매도 가격과 수요에 미치는 영향을 0~100점으로 평가하세요.
    ${numericDirective}${fillInDirective}`,

    momcafe: `당신은 맘카페 트렌드와 실거주 수요 분석 전문가입니다.
마트·공원·키즈카페·소아과 등 가족친화 생활인프라와 지역 커뮤니티 반응을 바탕으로
${loc} ${apt}의 실거주 매력도를 0~100점으로 평가하세요.
교통·학군·부동산 시장은 다른 탭에서 다루므로, 이 분석에서는 생활편의·안전환경·커뮤니티 선호도에만 집중하세요.
${numericDirective}${fillInDirective}`,
  }
}

async function callGemini(systemPrompt: string, userMessage: string, responseMimeType?: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY 미설정")
  // v1beta: systemInstruction + responseMimeType 지원
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const body = {
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      maxOutputTokens: 2500,
      ...(responseMimeType ? { responseMimeType } : {}),
    },
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`Gemini API 오류: ${res.status} ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return text ?? ""
}

async function callProvider(systemPrompt: string, userMessage: string, responseMimeType?: string) {
  return callGemini(systemPrompt, userMessage, responseMimeType)
}

// ─── 메인 분석 함수 ───────────────────────────────────────────
export async function analyzeWithClaude(
  category: CategoryId,
  data: unknown,
  address?: string,
  aptName?: string,
): Promise<ClaudeAnalysisResponse> {
  const systemPrompt = buildSystemPrompts(address, aptName)[category]

  const userMessage = `
다음 데이터를 분석하여 JSON 형식으로만 응답하세요.
다른 텍스트, 마크다운 코드블록, 설명은 절대 포함하지 마세요.
summary와 items에는 반드시 데이터에 있는 숫자를 자연스럽게 녹여 쓰세요.

분석 데이터:
${JSON.stringify(data, null, 2)}

응답 형식 (정확히 이 JSON 구조만):
{
  "score": 0에서 100 사이의 정수,
  "trend": "up" 또는 "down" 또는 "neutral",
  "summary": "한 줄 요약 (30자 이내)",
  "items": [
    {
      "name": "항목명",
      "status": "✅ 또는 ⚠️ 또는 🔄 또는 📋",
      "detail": "상세 설명 (50자 이내)",
      "impact": "HIGH 또는 POS 또는 NEG 또는 MED 또는 KEY"
    }
  ]
}
`

  const raw = await callProvider(systemPrompt, userMessage, "application/json")
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

  try {
    const parsed = JSON.parse(cleaned) as ClaudeAnalysisResponse
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 50)),
      trend: (["up", "down", "neutral"].includes(parsed.trend) ? parsed.trend : "neutral") as Trend,
      summary: parsed.summary || "분석 완료",
      items: Array.isArray(parsed.items) ? parsed.items : [],
    }
  } catch (e) {
    console.error("AI 응답 파싱 실패:", e, "원문:", cleaned)
    return {
      score: 50,
      trend: "neutral",
      summary: "분석 중 오류 발생",
      items: [],
    }
  }
}

// ─── 빠른 텍스트 분석 ─────────────────────────────────────────
export async function quickAnalyze(prompt: string): Promise<string> {
  return callProvider("", prompt)
}

// ─── JSON 생성 (뉴스 → 구조화 추출) ───────────────────────────
export async function generateJsonWithAI(prompt: string): Promise<string> {
  return callProvider("", prompt, "application/json")
}
