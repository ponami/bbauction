// lib/push.ts — 웹 푸시(VAPID) + 네이티브(FCM/APNs) 구독/해제 유틸

export async function subscribePush(): Promise<boolean> {
  try {
    // Capacitor 네이티브 환경이면 네이티브 푸시 등록
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      const { registerNativePush } = await import("./push-android")
      const userEmail = await _getUserEmail()
      if (userEmail) {
        return registerNativePush(userEmail)
      }
      return false
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("이 브라우저는 푸시 알림을 지원하지 않습니다.")
      return false
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") return false

    // VAPID 공개키 가져오기
    const res = await fetch("/api/push/subscribe")
    const { publicKey } = await res.json()
    if (!publicKey) { console.error("VAPID_PUBLIC_KEY 없음"); return false }

    // 서비스워커 자동 등록을 비활성화하여 기존에 설치된 오래된 SW가 재설치되는 것을 방지합니다.
    // 기존 등록이 있을 때만 푸시 구독을 진행하고, 없으면 실패 처리합니다.
    const existingReg = await navigator.serviceWorker.getRegistration("/sw.js")
    if (!existingReg) {
      console.warn("서비스워커 자동 등록 비활성화됨 — 기존 등록 없음")
      return false
    }
    await navigator.serviceWorker.ready
    const sw = existingReg

    const sub = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
    })

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    })

    return true
  } catch (e) {
    console.error("푸시 구독 실패:", e)
    return false
  }
}

export async function unsubscribePush(): Promise<boolean> {
  try {
    // Capacitor 네이티브 환경이면 네이티브 푸시 해제
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      const { unregisterNativePush } = await import("./push-android")
      const userEmail = await _getUserEmail()
      if (userEmail) {
        return unregisterNativePush(userEmail)
      }
      return false
    }

    const sw = await navigator.serviceWorker.getRegistration("/sw.js")
    if (!sw) return false
    const sub = await sw.pushManager.getSubscription()
    if (!sub) return false

    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    await sub.unsubscribe()
    return true
  } catch (e) {
    console.error("푸시 해제 실패:", e)
    return false
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

/** 현재 로그인한 유저 이메일 가져오기 (push 구독용) */
async function _getUserEmail(): Promise<string | null> {
  try {
    const resp = await fetch("/api/auth/me")
    if (!resp.ok) return null
    const data = await resp.json()
    return data.email || null
  } catch {
    return null
  }
}
