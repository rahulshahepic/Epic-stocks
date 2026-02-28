import type { AppData, UpcomingEvent } from './types'
import { getUpcomingEvents } from './compute'

// ---------------------------------------------------------------------------
// Notification utilities — no server required
// ---------------------------------------------------------------------------

export const PERIODIC_SYNC_TAG = 'check-events'
export const EVENT_CACHE_NAME = 'stock-tracker-events-v1'

/** Key used to store upcoming events in the Cache API (for service worker access) */
export const EVENTS_CACHE_KEY = 'upcoming-events'

export function formatNotificationTitle(event: UpcomingEvent): string {
  switch (event.type) {
    case 'vesting':
      return 'Vesting Event Today'
    case 'loan-due':
      return 'Loan Due Today'
    case 'interest-compound':
      return 'Interest Compounding Today'
    case 'refinance':
      return 'Refinance Event Today'
  }
}

export function formatNotificationBody(event: UpcomingEvent): string {
  return event.label
}

/**
 * Schedule browser notifications for upcoming events within the session.
 * Uses setTimeout so notifications fire if the tab stays open.
 * Returns an array of timeout IDs for cleanup.
 */
export function scheduleSessionNotifications(
  events: UpcomingEvent[],
  now = new Date(),
): ReturnType<typeof setTimeout>[] {
  if (Notification.permission !== 'granted') return []

  const timers: ReturnType<typeof setTimeout>[] = []

  for (const event of events) {
    const eventDate = new Date(event.date)
    // Schedule for 9am on the event date (or immediately if already past 9am today)
    const fireAt = new Date(eventDate)
    fireAt.setHours(9, 0, 0, 0)

    const delay = fireAt.getTime() - now.getTime()
    if (delay < 0) continue // already past

    const timer = setTimeout(() => {
      void showNotification(event)
    }, delay)
    timers.push(timer)
  }

  return timers
}

export async function showNotification(event: UpcomingEvent): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification(formatNotificationTitle(event), {
    body: formatNotificationBody(event),
    icon: '/Epic-stocks/icons/icon-192.png',
    badge: '/Epic-stocks/icons/icon-192.png',
    tag: `event-${event.date}-${event.type}`,
    data: { event },
  })
}

/**
 * Cache upcoming events so the service worker can access them during
 * a periodicSync wake without needing to re-authenticate.
 */
export async function cacheUpcomingEvents(
  data: AppData,
  windowDays = 60,
): Promise<void> {
  if (!('caches' in window)) return
  const events = getUpcomingEvents(data, new Date(), windowDays)
  const cache = await caches.open(EVENT_CACHE_NAME)
  await cache.put(
    EVENTS_CACHE_KEY,
    new Response(JSON.stringify(events), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.requestPermission()
}

/** Register periodic background sync if supported */
export async function registerPeriodicSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    // @ts-expect-error: periodicSync is not yet in the TypeScript DOM lib
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!reg.periodicSync) return false
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await reg.periodicSync.register(PERIODIC_SYNC_TAG, {
      minInterval: 24 * 60 * 60 * 1000, // 24 hours
    })
    return true
  } catch {
    return false
  }
}
