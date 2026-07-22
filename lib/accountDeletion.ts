import { prisma } from "./prisma"
import { createSupabaseAdminClient } from "./supabase-admin"
import { createSupabaseServerClient } from "./supabase-server"

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || process.env.GATE_URL || "/gate"

export class AccountDeletionError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = "AccountDeletionError"
    this.status = status
  }
}

function getGateBaseUrl(requestOrigin: string) {
  return GATE_URL.startsWith("http")
    ? GATE_URL.replace(/\/$/, "")
    : new URL(GATE_URL, requestOrigin).toString().replace(/\/$/, "")
}

async function clearGateUserData(email: string, requestOrigin: string) {
  const gateBaseUrl = getGateBaseUrl(requestOrigin)

  const nativePushResponse = await fetch(`${gateBaseUrl}/push/register-native`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email: email }),
  })
  if (!nativePushResponse.ok) {
    throw new AccountDeletionError("네이티브 푸시 정보를 삭제하지 못했습니다", 502)
  }

  const presaleRegionsResponse = await fetch(`${gateBaseUrl}/push/presale-regions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email: email, regions: [] }),
  })
  if (!presaleRegionsResponse.ok) {
    throw new AccountDeletionError("청약 알림 지역 정보를 삭제하지 못했습니다", 502)
  }
}

export async function deleteCurrentUserAccount(requestOrigin: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser?.id || !authUser.email) {
    throw new AccountDeletionError("로그인이 필요합니다", 401)
  }

  await clearGateUserData(authUser.email, requestOrigin)

  const existingUser = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: { id: true },
  })

  await prisma.$transaction(async (tx) => {
    if (existingUser) {
      await tx.analyticsEventRecord.deleteMany({ where: { userId: existingUser.id } })
    }

    await tx.alert.deleteMany({ where: { userEmail: authUser.email } })
    await tx.favorite.deleteMany({ where: { userEmail: authUser.email } })
    await tx.pushSubscription.deleteMany({ where: { userEmail: authUser.email } })

    if (existingUser) {
      await tx.user.delete({ where: { id: existingUser.id } })
    }
  })

  const adminClient = createSupabaseAdminClient()
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(authUser.id, true)
  if (deleteAuthError) {
    throw new AccountDeletionError("인증 계정을 삭제하지 못했습니다", 502)
  }

  return { email: authUser.email }
}
