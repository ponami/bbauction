// lib/push-android.ts — Capacitor 네이티브 푸시 (FCM / APNs) 등록
// 웹 VAPID와 별개로, Android/iOS 네이티브 기기에서 푸시 알림을 받기 위해 사용
// @capacitor/push-notifications는 네이티브 빌드에서만 필요하므로 동적 import 사용

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

const PN_MODULE = '@capacitor/push-notifications' // 변수로 우회 (TS 모듈 검사 회피)

async function getMod(): Promise<any> {
  if (!isNativePlatform()) return null
  try {
    return await import(PN_MODULE)
  } catch {
    return null
  }
}

export async function registerNativePush(userEmail: string): Promise<boolean> {
  const mod = await getMod()
  if (!mod) return false

  try {
    const permResult = await mod.PushNotifications.requestPermissions()
    if (permResult.receive === 'denied') {
      console.warn('[push-android] 푸시 권한 거부됨')
      return false
    }

    await mod.PushNotifications.register()

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        listener?.remove()
        resolve(false)
      }, 10000)

      const listener = mod.PushNotifications.addListener('registration', async (token: any) => {
        clearTimeout(timeout)
        listener?.remove()
        if (!token.value) { console.warn('[push-android] 빈 토큰 수신'); resolve(false); return }

        const platform = isNativePlatform()
          ? (window as any).Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android'
          : 'web'

        try {
          const resp = await fetch('/api/push/register-native', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: userEmail, device_token: token.value, platform }),
          })
          if (resp.ok) console.log('[push-android] 등록 성공:', platform, token.value.slice(0, 20))
          else console.warn('[push-android] 서버 등록 실패:', resp.status)
          resolve(resp.ok)
        } catch (e) {
          console.error('[push-android] 서버 등록 오류:', e)
          resolve(false)
        }
      })

      mod.PushNotifications.addListener('registrationError', (err: any) => {
        clearTimeout(timeout); listener?.remove()
        console.error('[push-android] FCM 등록 오류:', err.error); resolve(false)
      })
    })
  } catch (e) {
    console.error('[push-android] 등록 실패:', e)
    return false
  }
}

export async function unregisterNativePush(userEmail: string): Promise<boolean> {
  const mod = await getMod()
  if (!mod) return false

  try {
    const resp = await fetch('/api/push/register-native', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail }),
    })
    await mod.PushNotifications.unregister()
    return resp.ok
  } catch (e) {
    console.error('[push-android] 해제 실패:', e)
    return false
  }
}

export async function addPushNotificationListener(
  onNotification: (data: { title?: string; body?: string; data?: Record<string, string> }) => void
) {
  const mod = await getMod()
  if (!mod) return () => {}

  const listener = mod.PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
    onNotification({
      title: notification.title,
      body: notification.body,
      data: notification.data as Record<string, string> | undefined,
    })
  })
  return () => listener.remove()
}

export async function addPushActionPerformedListener(
  onAction: (data: Record<string, string>) => void
) {
  const mod = await getMod()
  if (!mod) return () => {}

  const listener = mod.PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
    onAction((notification.notification.data || {}) as Record<string, string>)
  })
  return () => listener.remove()
}
