export type LeadStatus = "new" | "reviewing" | "contract_soon"
export type LeadEventType = "share_sent" | "share_view" | "dashboard_view" | "compare_view"

export interface LeadEventPayload {
  shareUrl?: string
  reportPurpose?: string
  comparedApts?: { aptName: string; lawdCd?: string }[]
}

export interface LeadEventSummary {
  id: string
  type: LeadEventType
  aptId: number | null
  aptName: string | null
  address: string | null
  payload: LeadEventPayload
  createdAt: string
}

export interface LeadSummary {
  id: string
  name: string
  phone: string
  status: LeadStatus
  tags: string[]
  notes: string
  lastReportPurpose: string
  lastSharedAptId: number | null
  lastSharedAptName: string
  lastSharedAddress: string
  lastSharedAt: string | null
  lastViewedAt: string | null
  lastComparedAt: string | null
  createdAt: string
  updatedAt: string
  recentSharedReports: LeadEventSummary[]
  recentViewedApts: LeadEventSummary[]
  recentComparedApts: LeadEventSummary[]
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function normalizeLeadStatus(value: string | null | undefined): LeadStatus {
  if (value === "reviewing" || value === "contract_soon") return value
  return "new"
}

export function normalizeLeadTags(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean)
  }

  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? []
}

export function leadStatusLabel(status: LeadStatus) {
  if (status === "reviewing") return "검토중"
  if (status === "contract_soon") return "계약임박"
  return "신규"
}

export function leadStatusTone(status: LeadStatus) {
  if (status === "reviewing") return { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" }
  if (status === "contract_soon") return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" }
  return { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" }
}

export function summarizeLeadRecord(raw: {
  id: string
  name: string
  phone: string | null
  status: string
  tags: string
  notes: string
  lastReportPurpose: string | null
  lastSharedAptId: number | null
  lastSharedAptName: string | null
  lastSharedAddress: string | null
  lastSharedAt: Date | null
  lastViewedAt: Date | null
  lastComparedAt: Date | null
  createdAt: Date
  updatedAt: Date
  events: Array<{
    id: string
    type: string
    aptId: number | null
    aptName: string | null
    address: string | null
    payload: string
    createdAt: Date
  }>
}): LeadSummary {
  const events = raw.events.map((event) => ({
    id: event.id,
    type: (event.type as LeadEventType),
    aptId: event.aptId ?? null,
    aptName: event.aptName ?? null,
    address: event.address ?? null,
    payload: parseJson<LeadEventPayload>(event.payload, {}),
    createdAt: event.createdAt.toISOString(),
  }))

  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone ?? "",
    status: normalizeLeadStatus(raw.status),
    tags: parseJson<string[]>(raw.tags, []).filter(Boolean),
    notes: raw.notes ?? "",
    lastReportPurpose: raw.lastReportPurpose ?? "",
    lastSharedAptId: raw.lastSharedAptId ?? null,
    lastSharedAptName: raw.lastSharedAptName ?? "",
    lastSharedAddress: raw.lastSharedAddress ?? "",
    lastSharedAt: raw.lastSharedAt?.toISOString() ?? null,
    lastViewedAt: raw.lastViewedAt?.toISOString() ?? null,
    lastComparedAt: raw.lastComparedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    recentSharedReports: events.filter((event) => event.type === "share_sent").slice(0, 5),
    recentViewedApts: events.filter((event) => event.type === "share_view" || event.type === "dashboard_view").slice(0, 5),
    recentComparedApts: events.filter((event) => event.type === "compare_view").slice(0, 5),
  }
}
