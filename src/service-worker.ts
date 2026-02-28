/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import type { UpcomingEvent } from './lib/types'
import { EVENT_CACHE_NAME, EVENTS_CACHE_KEY, PERIODIC_SYNC_TAG } from './lib/notifications'

declare const self: ServiceWorkerGlobalScope

// Take control immediately on activation
self.skipWaiting()
clientsClaim()

// Workbox precaching — manifest injected by vite-plugin-pwa at build time
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ---------------------------------------------------------------------------
// Push notifications (scaffolded — requires a backend to send pushes)
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string } | undefined
  const title = data?.title ?? 'Stock Tracker'
  const body = data?.body ?? 'You have a new notification'
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/Epic-stocks/icons/icon-192.png',
      badge: '/Epic-stocks/icons/icon-192.png',
    }),
  )
})

// ---------------------------------------------------------------------------
// Periodic Background Sync — fires ~daily on Android/Chrome when PWA installed
// ---------------------------------------------------------------------------
self.addEventListener('periodicsync', (event) => {
  const syncEvent = event as ExtendableEvent & { tag: string }
  if (syncEvent.tag !== PERIODIC_SYNC_TAG) return
  syncEvent.waitUntil(checkAndNotifyEvents())
})

async function checkAndNotifyEvents(): Promise<void> {
  try {
    const cache = await caches.open(EVENT_CACHE_NAME)
    const response = await cache.match(EVENTS_CACHE_KEY)
    if (!response) return

    const events = (await response.json()) as UpcomingEvent[]
    const today = new Date().toISOString().split('T')[0]!

    const todaysEvents = events.filter((e) => e.date === today)
    for (const event of todaysEvents) {
      await self.registration.showNotification(getTitle(event), {
        body: event.label,
        icon: '/Epic-stocks/icons/icon-192.png',
        badge: '/Epic-stocks/icons/icon-192.png',
        tag: `event-${event.date}-${event.type}`,
        data: { event },
      })
    }
  } catch {
    // Non-fatal: cache may be empty on first install
  }
}

function getTitle(event: UpcomingEvent): string {
  switch (event.type) {
    case 'vesting': return 'Vesting Event Today'
    case 'loan-due': return 'Loan Due Today'
    case 'interest-compound': return 'Interest Compounding Today'
    case 'refinance': return 'Refinance Event Today'
  }
}

// ---------------------------------------------------------------------------
// Notification click — open / focus the app
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/Epic-stocks/') && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow('/Epic-stocks/')
    }),
  )
})
