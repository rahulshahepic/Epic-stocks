import { useCallback, useEffect, useRef, useState } from 'react'
import {
  requestNotificationPermission,
  registerPeriodicSync,
  scheduleSessionNotifications,
  cacheUpcomingEvents,
} from '../lib/notifications'
import { getUpcomingEvents } from '../lib/compute'
import type { AppData } from '../lib/types'

export interface UseNotificationsResult {
  permission: NotificationPermission | 'unsupported'
  periodicSyncRegistered: boolean
  requestPermission: () => Promise<void>
}

export function useNotifications(data: AppData | null): UseNotificationsResult {
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  })
  const [periodicSyncRegistered, setPeriodicSyncRegistered] = useState(false)
  const sessionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // When data loads, schedule session notifications + cache events for SW
  useEffect(() => {
    if (!data || permission !== 'granted') return

    // Clear any previously scheduled timers
    sessionTimersRef.current.forEach(clearTimeout)

    const upcoming = getUpcomingEvents(data, new Date(), 30)
    sessionTimersRef.current = scheduleSessionNotifications(upcoming)

    // Keep the Cache API up to date so the SW has fresh data
    void cacheUpcomingEvents(data, 60)

    return () => {
      sessionTimersRef.current.forEach(clearTimeout)
    }
  }, [data, permission])

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission()
    setPermission(result === 'default' ? 'default' : result)

    if (result === 'granted') {
      const registered = await registerPeriodicSync()
      setPeriodicSyncRegistered(registered)
    }
  }, [])

  // Register periodic sync if permission already granted on mount
  useEffect(() => {
    if (permission === 'granted') {
      void registerPeriodicSync().then(setPeriodicSyncRegistered)
    }
  }, [permission])

  return { permission, periodicSyncRegistered, requestPermission }
}
