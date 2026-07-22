export interface AgentModeState {
  enabled: boolean
  office: string
  name: string
  phone: string
  defaultLeadName: string
  defaultReportPurpose: string
  intro: string
}

export interface AgentShareDetails {
  office?: string
  name?: string
  phone?: string
  leadName?: string
  reportPurpose?: string
  intro?: string
}

const STORAGE_KEY = "agent_mode"
const LEGACY_PROFILE_KEY = "agent_profile"

export const DEFAULT_AGENT_MODE_STATE: AgentModeState = {
  enabled: false,
  office: "",
  name: "",
  phone: "",
  defaultLeadName: "",
  defaultReportPurpose: "",
  intro: "",
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function parseState(raw: unknown): AgentModeState {
  const input = (raw && typeof raw === "object") ? raw as Partial<AgentModeState> : {}
  return {
    enabled: Boolean(input.enabled),
    office: normalizeString(input.office),
    name: normalizeString(input.name),
    phone: normalizeString(input.phone),
    defaultLeadName: normalizeString(input.defaultLeadName),
    defaultReportPurpose: normalizeString(input.defaultReportPurpose),
    intro: normalizeString(input.intro),
  }
}

function readLegacyProfile(): Partial<AgentModeState> | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LEGACY_PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { office?: string; name?: string; phone?: string }
    return {
      enabled: Boolean(parsed.office || parsed.name),
      office: normalizeString(parsed.office),
      name: normalizeString(parsed.name),
      phone: normalizeString(parsed.phone),
    }
  } catch {
    return null
  }
}

export function readAgentMode(): AgentModeState {
  if (typeof window === "undefined") return DEFAULT_AGENT_MODE_STATE

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return parseState(JSON.parse(raw))
    }
  } catch {
    return DEFAULT_AGENT_MODE_STATE
  }

  const legacy = readLegacyProfile()
  if (legacy) {
    const migrated = parseState(legacy)
    saveAgentMode(migrated)
    return migrated
  }

  return DEFAULT_AGENT_MODE_STATE
}

export function saveAgentMode(state: AgentModeState) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parseState(state)))
}

export function isAgentModeActive(state: AgentModeState) {
  return state.enabled && Boolean(state.office || state.name)
}

export function getAgentContactHref(phone?: string) {
  if (!phone) return null
  const sanitized = phone.replace(/[^\d+]/g, "")
  return sanitized ? `tel:${sanitized}` : null
}

export function getAgentShareDetails(state: AgentModeState): AgentShareDetails | null {
  if (!isAgentModeActive(state)) return null

  return {
    office: state.office || undefined,
    name: state.name || undefined,
    phone: state.phone || undefined,
    leadName: state.defaultLeadName || undefined,
    reportPurpose: state.defaultReportPurpose || undefined,
    intro: state.intro || undefined,
  }
}

export function appendAgentShareParams(params: URLSearchParams, details?: AgentShareDetails | null) {
  if (!details) return
  if (details.name) params.set("agent", details.name)
  if (details.office) params.set("office", details.office)
  if (details.phone) params.set("phone", details.phone)
  if (details.leadName) params.set("lead", details.leadName)
  if (details.reportPurpose) params.set("report", details.reportPurpose)
  if (details.intro) params.set("intro", details.intro)
  params.set("agentMode", "1")
}
