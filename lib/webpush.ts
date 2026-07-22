// lib/webpush.ts — 서버사이드 VAPID 웹푸시 발송 유틸
import webpush from "web-push"
import { prisma } from "./prisma"

let initialized = false

function init() {
  if (initialized) return
  const publicKey  = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email      = process.env.VAPID_EMAIL ?? "mailto:admin@oreulji.com"

  if (!publicKey || !privateKey) {
    console.warn("[webpush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 미설정 — 푸시 비활성화")
    return
  }
  webpush.setVapidDetails(email, publicKey, privateKey)
  initialized = true
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  tag?: string
  url?: string
}

/** 특정 사용자의 모든 구독 엔드포인트로 푸시 발송 */
export async function sendPushToUser(userEmail: string, payload: PushPayload) {
  init()
  if (!initialized) return { sent: 0, failed: 0 }

  const subs = await prisma.pushSubscription.findMany({ where: { userEmail } })
  let sent = 0, failed = 0
  const deadEndpoints: string[] = []

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, icon: payload.icon ?? "/logo.png" }),
      )
      sent++
    } catch (err: any) {
      // 410 Gone = 구독 만료, 삭제 처리
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        deadEndpoints.push(sub.endpoint)
      }
      failed++
    }
  }

  // 만료된 구독 정리
  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: deadEndpoints } },
    })
  }

  return { sent, failed }
}
