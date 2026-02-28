import { useCallback, useEffect, useRef, useState } from 'react'
import { getAppData, saveAppData, validateAppData } from '../lib/driveStorage'
import { emptyAppData } from '../lib/compute'
import { cacheUpcomingEvents } from '../lib/notifications'
import type { AppData } from '../lib/types'

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export interface UseAppDataResult {
  data: AppData | null
  status: Status
  error: string | null
  /** Update data locally and persist to Drive (debounced 1 second) */
  updateData: (updater: (prev: AppData) => AppData) => void
  /** Force immediate save without debounce */
  saveNow: (data: AppData) => Promise<void>
  /** Replace data entirely (used for import) */
  importData: (raw: unknown) => Promise<void>
  reload: () => void
}

const SAVE_DEBOUNCE_MS = 1000

export function useAppData(token: string | null): UseAppDataResult {
  const [data, setData] = useState<AppData | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tokenRef = useRef(token)
  const [reloadCounter, setReloadCounter] = useState(0)

  // Keep tokenRef current without triggering re-fetches
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  // Load data when token becomes available or reload is requested
  useEffect(() => {
    if (!token) {
      setStatus('idle')
      setData(null)
      return
    }
    setStatus('loading')
    setError(null)

    void (async () => {
      try {
        const loaded = await getAppData(token)
        if (loaded === null) {
          setStatus('empty')
          setData(emptyAppData())
        } else {
          setData(loaded)
          setStatus('ready')
          await cacheUpcomingEvents(loaded)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setStatus('error')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reloadCounter])

  const debouncedSave = useCallback(
    (newData: AppData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const t = tokenRef.current
        if (t) {
          void saveAppData(t, newData).catch((err: unknown) => {
            console.error('Auto-save failed:', err)
          })
        }
      }, SAVE_DEBOUNCE_MS)
    },
    [],
  )

  const updateData = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev ?? emptyAppData())
        debouncedSave(next)
        return next
      })
      setStatus('ready')
    },
    [debouncedSave],
  )

  const saveNow = useCallback(
    async (newData: AppData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const t = tokenRef.current
      if (!t) throw new Error('Not signed in')
      await saveAppData(t, newData)
      setData(newData)
      await cacheUpcomingEvents(newData)
    },
    [],
  )

  const importData = useCallback(
    async (raw: unknown) => {
      const validated = validateAppData(raw)
      await saveNow(validated)
      setStatus('ready')
    },
    [saveNow],
  )

  const reload = useCallback(() => {
    setReloadCounter((c) => c + 1)
  }, [])

  return { data, status, error, updateData, saveNow, importData, reload }
}
