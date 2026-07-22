import "server-only"

import {
  ANALYTICS_EVENT_LABELS,
  ANALYTICS_EVENT_ORDER,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
  type AnalyticsFunnel,
  type AnalyticsMeta,
  type AnalyticsRecentEvent,
  type AnalyticsSummary,
} from "@/lib/analytics"
import { getBillingSkuConfig, type BillingSku } from "@/lib/planLimits"
import { prisma } from "@/lib/prisma"

interface StoredAnalyticsEvent extends Required<Pick<AnalyticsEventPayload, "eventType" | "funnel" | "source" | "path" | "sessionId">> {
  id: string
  createdAt: string
  trigger?: string
  sku?: BillingSku
  aptId?: number
  aptName?: string
  userId?: string | null
  meta?: AnalyticsMeta
}

const MAX_RETENTION_DAYS = 120
const TREND_DAYS = 7

function getCutoffDate(days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function sanitizeMeta(meta: unknown): AnalyticsMeta | undefined {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined

  const entries = Object.entries(meta as Record<string, unknown>)
    .filter(([, value]) => value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 12)

  return entries.length ? Object.fromEntries(entries) as AnalyticsMeta : undefined
}

function serializeMeta(meta: unknown) {
  const sanitized = sanitizeMeta(meta)
  return sanitized ? JSON.stringify(sanitized) : null
}

function deserializeMeta(raw?: string | null): AnalyticsMeta | undefined {
  try {
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    return sanitizeMeta(parsed)
  } catch {
    return undefined
  }
}

function pruneEvents(events: StoredAnalyticsEvent[]) {
  const cutoff = getCutoffDate(MAX_RETENTION_DAYS)
  return events.filter((event) => new Date(event.createdAt) >= cutoff)
}

export async function appendAnalyticsEvent(payload: AnalyticsEventPayload, userId?: string | null) {
  const sessionId = payload.sessionId?.trim()
  const source = payload.source?.trim()
  const pathValue = payload.path?.trim()

  if (!sessionId || !source || !pathValue) return

  const nextEvent: StoredAnalyticsEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    eventType: payload.eventType,
    funnel: payload.funnel,
    source,
    sessionId,
    path: pathValue,
    trigger: payload.trigger?.trim() || undefined,
    sku: payload.sku,
    aptId: payload.aptId,
    aptName: payload.aptName?.trim() || undefined,
    userId: userId ?? null,
    meta: sanitizeMeta(payload.meta),
  }

  await prisma.analyticsEventRecord.create({
    data: {
      id: nextEvent.id,
      eventType: nextEvent.eventType,
      funnel: nextEvent.funnel,
      source: nextEvent.source,
      path: nextEvent.path,
      sessionId: nextEvent.sessionId,
      trigger: nextEvent.trigger,
      sku: nextEvent.sku,
      aptId: nextEvent.aptId,
      aptName: nextEvent.aptName,
      userId: nextEvent.userId,
      meta: serializeMeta(nextEvent.meta),
      createdAt: new Date(nextEvent.createdAt),
    },
  })
}

async function readAnalyticsEvents() {
  const cutoff = getCutoffDate(MAX_RETENTION_DAYS)
  await prisma.analyticsEventRecord.deleteMany({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  })

  const rows = await prisma.analyticsEventRecord.findMany({
    where: {
      createdAt: {
        gte: cutoff,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return pruneEvents(rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    eventType: row.eventType as AnalyticsEventPayload["eventType"],
    funnel: row.funnel as AnalyticsEventPayload["funnel"],
    source: row.source,
    path: row.path,
    sessionId: row.sessionId,
    trigger: row.trigger ?? undefined,
    sku: row.sku as BillingSku | undefined,
    aptId: row.aptId ?? undefined,
    aptName: row.aptName ?? undefined,
    userId: row.userId ?? null,
    meta: deserializeMeta(row.meta),
  })))
}

function buildTrend(events: StoredAnalyticsEvent[]) {
  const days: string[] = []
  const today = new Date()
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    days.push(formatDateKey(date))
  }

  return days.map((date) => ({
    date,
    paywallView: events.filter((event) => event.eventType === "paywall_view" && event.createdAt.startsWith(date)).length,
    productSelect: events.filter((event) => event.eventType === "product_select" && event.createdAt.startsWith(date)).length,
    paymentComplete: events.filter((event) => event.eventType === "payment_complete" && event.createdAt.startsWith(date)).length,
  }))
}

function buildRecentEvents(events: StoredAnalyticsEvent[]): AnalyticsRecentEvent[] {
  return [...events]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((event) => ({
      id: event.id,
      createdAt: event.createdAt,
      funnel: event.funnel,
      label: ANALYTICS_EVENT_LABELS[event.eventType],
      source: event.source,
      sku: event.sku,
    }))
}

function buildTopSkus(events: StoredAnalyticsEvent[]) {
  const counts = new Map<BillingSku, number>()
  for (const event of events) {
    if (!event.sku || event.eventType !== "payment_complete") continue
    counts.set(event.sku, (counts.get(event.sku) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sku, count]) => ({ sku, count }))
}

function buildStepSummary(events: StoredAnalyticsEvent[]) {
  let previousSessions = 0

  return ANALYTICS_EVENT_ORDER.map((key) => {
    const stepEvents = events.filter((event) => event.eventType === key)
    const sessions = new Set(stepEvents.map((event) => event.sessionId)).size
    const conversionRate = previousSessions > 0 ? Math.round((sessions / previousSessions) * 100) : null

    const summary = {
      key,
      label: ANALYTICS_EVENT_LABELS[key],
      events: stepEvents.length,
      sessions,
      conversionRate,
    }

    previousSessions = sessions
    return summary
  })
}

function sumEstimatedRevenue(events: StoredAnalyticsEvent[]) {
  return events.reduce((sum, event) => {
    if (event.eventType !== "payment_complete" || !event.sku) return sum
    return sum + (getBillingSkuConfig(event.sku)?.amount ?? 0)
  }, 0)
}

function buildFunnelSummary(events: StoredAnalyticsEvent[], funnel: AnalyticsFunnel) {
  const funnelEvents = events.filter((event) => event.funnel === funnel)
  return {
    funnel,
    label: funnel === "consumer" ? "소비자 퍼널" : "중개사 퍼널",
    totalEvents: funnelEvents.length,
    uniqueSessions: new Set(funnelEvents.map((event) => event.sessionId)).size,
    estimatedRevenue: sumEstimatedRevenue(funnelEvents),
    steps: buildStepSummary(funnelEvents),
    trend: buildTrend(funnelEvents),
    topSkus: buildTopSkus(funnelEvents),
  }
}

export async function getAnalyticsSummary(rangeDays = 30): Promise<AnalyticsSummary> {
  const cutoff = getCutoffDate(rangeDays)
  const events = (await readAnalyticsEvents()).filter((event) => new Date(event.createdAt) >= cutoff)

  return {
    rangeDays,
    generatedAt: new Date().toISOString(),
    recentEvents: buildRecentEvents(events),
    funnels: {
      consumer: buildFunnelSummary(events, "consumer"),
      agent: buildFunnelSummary(events, "agent"),
    },
  }
}
