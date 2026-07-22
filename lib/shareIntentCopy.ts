import { readAgentMode } from "@/lib/agentMode"

export interface AgentProfile {
  office?: string
  name?: string
  phone?: string
  leadName?: string
  reportPurpose?: string
  intro?: string
}

export type ShareAudience = "family" | "client"

interface ShareIntentCopy {
  primaryButtonLabel: string
  helperLine: string
  shareLead: string
  shareDescription: string
  rewardTitle: string
  rewardDescription: string
  copyButtonLabel: string
  imageButtonLabel: string
  sharePageHint: string
  stickyTitle: string
  stickyDescription: string
  contactButtonLabel: string
  secondaryButtonLabel: string
}

interface ShareRewardState {
  audience: ShareAudience
  at: number
}

const SHARE_REWARD_PREFIX = "share_reward:"

export function readAgentProfile(): AgentProfile | null {
  const state = readAgentMode()
  if (!state.enabled || (!state.office && !state.name)) return null
  return {
    office: state.office || undefined,
    name: state.name || undefined,
    phone: state.phone || undefined,
    leadName: state.defaultLeadName || undefined,
    reportPurpose: state.defaultReportPurpose || undefined,
    intro: state.intro || undefined,
  }
}

export function getShareAudience(agentProfile?: AgentProfile | null): ShareAudience {
  return agentProfile ? "client" : "family"
}

export function getShareIntentCopy(audience: ShareAudience): ShareIntentCopy {
  if (audience === "client") {
    return {
      primaryButtonLabel: "고객에게 바로 보내기",
      helperLine: "상담 링크를 바로 보내고, 아래 공유 리포트에서 전달 문구까지 바로 복사할 수 있습니다.",
      shareLead: "고객에게 보내는 상담용 링크입니다.",
      shareDescription: "가격 흐름, 환금성, 비교 포인트를 한 번에 전달할 수 있게 정리했습니다.",
      rewardTitle: "고객 전달용 요약을 준비했습니다",
      rewardDescription: "아래 공유 리포트에서 고객 전달 문구와 이미지 저장을 바로 이어서 쓸 수 있습니다.",
      copyButtonLabel: "고객 전달 문구 복사",
      imageButtonLabel: "상담용 이미지 저장",
      sharePageHint: "고객에게 전달된 링크 기준으로 정리된 리포트입니다. 아래 버튼에서 전체 근거까지 바로 이어보세요.",
      stickyTitle: "상담 CTA 고정",
      stickyDescription: "공유 링크 재진입 후에도 고객이 바로 문의하거나 전체 근거를 다시 볼 수 있게 유지합니다.",
      contactButtonLabel: "전화 상담",
      secondaryButtonLabel: "전체 근거 보기",
    }
  }

  return {
    primaryButtonLabel: "가족에게 의견 물어보기",
    helperLine: "배우자·가족에게 바로 보낼 링크를 만들고, 아래 공유 리포트에서 의견 요청 문구까지 바로 복사할 수 있습니다.",
    shareLead: "가족에게 의견을 물어보기 위한 링크입니다.",
    shareDescription: "점수보다 가격 흐름, 환금성, 비교 포인트가 먼저 보이도록 정리했습니다.",
    rewardTitle: "의견 요청용 요약을 준비했습니다",
    rewardDescription: "아래 공유 리포트에서 가족에게 보낼 문구와 이미지 저장을 바로 이어서 쓸 수 있습니다.",
    copyButtonLabel: "의견 요청 문구 복사",
    imageButtonLabel: "공유용 이미지 저장",
    sharePageHint: "가족과 비교 포인트를 바로 나눠 보기 좋게 정리된 리포트입니다. 아래 버튼에서 상세 근거까지 이어보세요.",
    stickyTitle: "의견 요청 CTA 고정",
    stickyDescription: "다시 들어와도 배우자·가족과 바로 의견을 주고받을 수 있게 핵심 버튼을 유지합니다.",
    contactButtonLabel: "같이 보기",
    secondaryButtonLabel: "전체 근거 보기",
  }
}

function rewardStorageKey(id: string) {
  return `${SHARE_REWARD_PREFIX}${id}`
}

export function markShareReward(id: string, audience: ShareAudience) {
  if (typeof window === "undefined") return
  const payload: ShareRewardState = { audience, at: Date.now() }
  localStorage.setItem(rewardStorageKey(id), JSON.stringify(payload))
}

export function readShareReward(id: string): ShareRewardState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(rewardStorageKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ShareRewardState
    if (!parsed?.audience || !parsed?.at) return null
    return parsed
  } catch {
    return null
  }
}
