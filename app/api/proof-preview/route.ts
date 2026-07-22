// POST /api/proof-preview
// buildReportProofPreview의 서버사이드 버전 — 민감한 재무 계산 로직을 클라이언트 번들에서 제거

import { NextResponse } from "next/server"
import { buildReportProofPreview, type ReportProofPreview } from "@/lib/reportProofPreview"
import type { ReportInputOverrides } from "@/lib/riskAnalysis/reportInputModel"
import type { ReportPersona } from "@/lib/reportProducts"

interface ProofPreviewRequest extends ReportInputOverrides {
  persona: ReportPersona
  targetPrice?: number | null
}

export async function POST(req: Request) {
  try {
    const input: ProofPreviewRequest = await req.json()
    const { persona, targetPrice, ...rest } = input

    if (targetPrice == null || targetPrice <= 0) {
      return NextResponse.json({ data: null })
    }

    const data = buildReportProofPreview({
      persona,
      targetPrice,
      ...rest,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error("[proof-preview] 오류:", err)
    return NextResponse.json({ error: "증명 미리보기 생성 실패" }, { status: 500 })
  }
}
