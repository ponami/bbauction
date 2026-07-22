import type { ReportPersona } from "@/lib/reportProducts"

export interface ValidationRubric {
  title: string
  summary: string
  questions: string[]
  passCriteria: string[]
  numericChecks: string[]
}

export function getValidationRubric(persona: ReportPersona): ValidationRubric {
  if (persona === "agent") {
    return {
      title: "중개사 상담 검수 루브릭",
      summary: "3분 상담에서 바로 쓰는 자료인지 확인하는 기준입니다.",
      questions: [
        "추천 근거와 보류 근거가 둘 다 보이는가?",
        "고객이 가장 먼저 물을 반론에 대한 문장이 들어있는가?",
        "같은 예산 대안 단지와 비교 포인트가 바로 보이는가?",
      ],
      passCriteria: [
        "추천/보류 근거 3개 이상이 구조적으로 구분된다.",
        "고객 반론 대응 문장이 최소 2개 이상 있다.",
        "다음 상담 액션이 바로 보인다.",
      ],
      numericChecks: [
        "권장 진입가 또는 가격 기준이 최소 1개 이상 보인다.",
        "대안 비교가 2개 이상 또는 비교표 형태로 보인다.",
        "예산 판정, 비교 기준, 상담 다음 액션이 한 화면 안에 같이 있다.",
      ],
    }
  }

  if (persona === "investor") {
    return {
      title: "투자형 검수 루브릭",
      summary: "수익 기대보다 출구 전략과 기회비용이 먼저 보이는지 확인합니다.",
      questions: [
        "보유 2년/4년 시나리오가 분리되어 보이는가?",
        "거래량과 환금성 설명이 수익 기대보다 앞에 오는가?",
        "같은 예산 대안과 기회비용 비교가 가능한가?",
      ],
      passCriteria: [
        "보유기간 기준 판단 문장이 따로 존재한다.",
        "거래량·유동성·세금 중 2개 이상이 명시된다.",
        "대안 비교 없이 단독 추천으로 끝나지 않는다.",
      ],
      numericChecks: [
        "2년/4년 세후손익이 각각 따로 보인다.",
        "이자·보유세·양도세·매도비용 중 3개 이상이 숫자로 보인다.",
        "예상 매도가 또는 총비용이 표 형태로 같이 보인다.",
      ],
    }
  }

  return {
    title: "신혼부부 실거주 검수 루브릭",
    summary: "우리 부부에게 맞는지 바로 판단되는지를 확인하는 기준입니다.",
    questions: [
      "월상환, 자기자금, 총부담선이 바로 보이는가?",
      "생활 동선과 가족 계획이 점수보다 먼저 설명되는가?",
      "배우자와 합의할 핵심 포인트가 짧게 정리되는가?",
    ],
    passCriteria: [
      "예산 안전선과 월상환 기준이 함께 제시된다.",
      "생활 동선/통학/장보기 같은 실거주 문장이 들어간다.",
      "배우자 공유용 합의 포인트가 최소 2개 이상 있다.",
    ],
    numericChecks: [
      "총초기투입금, 월 총주거비, 잔여현금이 같이 보인다.",
      "취득세·중개보수·이사/인테리어 중 3개 이상이 숫자로 보인다.",
      "비상자금 또는 6개월 버티기 판단선이 문장으로라도 명시된다.",
    ],
  }
}
