// public/sw.js — Service Worker (웹 푸시 알림)

self.addEventListener("push", (event) => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: "오를지 알림", body: event.data.text() } }

  const title   = data.title || "오를지 알림"
  const options = {
    body:    data.body   || "",
    icon:    data.icon   || "/logo.png",
    badge:   "/logo.png",
    tag:     data.tag    || "oreulji-alert",
    data:    { url: data.url || "/" },
    actions: [{ action: "open", title: "확인하기" }],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
