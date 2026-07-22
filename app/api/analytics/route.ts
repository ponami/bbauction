import { NextRequest, NextResponse } from "next/server"
import { appendAnalyticsEvent, getAnalyticsSummary } from "@/lib/analyticsStore"
import { getSessionUser } from "@/lib/getSessionUser"
import {
  ANALYTICS_EVENT_ORDER,
  resolveAnalyticsFunnelForSku,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
  type AnalyticsFunnel,
} from "@/lib/analytics"

const EVENT_SET = new Set<AnalyticsEventType>(ANALYTICS_EVENT_ORDER)
const FUNNEL_SET = new Set<AnalyticsFunnel>(["consumer", "agent"])

export async function POST(req: NextRequest) {
  let body: AnalyticsEventPayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다" }, { status: 400 })
  }

  if (!EVENT_SET.has(body.eventType)) {
    return NextResponse.json({ error: "지원하지 않는 이벤트입니다" }, { status: 400 })
  }

  const resolvedFunnel = FUNNEL_SET.has(body.funnel)
    ? body.funnel
    : body.sku
    ? resolveAnalyticsFunnelForSku(body.sku)
    : null

  if (!resolvedFunnel || !body.source || !body.sessionId) {
    return NextResponse.json({ error: "funnel, source, sessionId 필수" }, { status: 400 })
  }

  const user = await getSessionUser()

  await appendAnalyticsEvent(
    {
      ...body,
      funnel: resolvedFunnel,
    },
    user?.id,
  )

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const daysParam = Number(req.nextUrl.searchParams.get("days") ?? "30")
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 30
  const summary = await getAnalyticsSummary(days)

  return NextResponse.json(summary)
}

