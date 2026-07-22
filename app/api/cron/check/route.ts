// POST /api/cron/check
// 크론잡 진입점 — 모든 즐겨찾기 & 내 아파트 실거래가/점수 체크 후 웹푸시 발송
// 외부 크론 서비스(cron-job.org, Vercel Cron, GitHub Actions 등)에서 주기적으로 호출
//
// 보안: CRON_SECRET 환경변수와 Authorization 헤더로 인증
// 호출 예시: POST /api/cron/check
//   Header: Authorization: Bearer {CRON_SECRET}

import { NextRequest, NextResponse } from "next/server"
import { checkAllForAllUsers } from "@/lib/alerts"

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const started = Date.now()
  try {
    const results = await checkAllForAllUsers()

    const totalTrades  = results.reduce((s, r) => s + r.newTrades, 0)
    const totalScores  = results.filter((r) => r.scoreChanged).length

    return NextResponse.json({
      ok: true,
      checked: results.length,
      newTrades: totalTrades,
      scoreChanges: totalScores,
      elapsedMs: Date.now() - started,
      results,
    })
  } catch (err) {
    console.error("[cron/check]", err)
    return NextResponse.json({ ok: false, error: "크론 실행 중 오류가 발생했습니다" }, { status: 500 })
  }
}

// GET: 헬스체크 (크론 서비스에서 엔드포인트 확인용)
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "cron/check" })
}
