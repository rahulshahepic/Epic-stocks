import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatNotificationTitle,
  formatNotificationBody,
  scheduleSessionNotifications,
  cacheUpcomingEvents,
} from '../lib/notifications'
import { emptyAppData } from '../lib/compute'
import type { UpcomingEvent } from '../lib/types'

const VESTING_EVENT: UpcomingEvent = {
  date: '2025-07-15',
  label: '2020 Purchase — vesting period 1',
  type: 'vesting',
}

const LOAN_DUE_EVENT: UpcomingEvent = {
  date: '2025-07-20',
  label: '2020 Purchase Purchase loan due',
  type: 'loan-due',
}

const COMPOUND_EVENT: UpcomingEvent = {
  date: '2025-07-15',
  label: 'Annual interest compounding date',
  type: 'interest-compound',
}

const REFINANCE_EVENT: UpcomingEvent = {
  date: '2025-07-15',
  label: 'Refinance event (2 loans)',
  type: 'refinance',
}

// ---------------------------------------------------------------------------
// formatNotificationTitle
// ---------------------------------------------------------------------------

describe('formatNotificationTitle', () => {
  it('returns correct title for vesting', () => {
    expect(formatNotificationTitle(VESTING_EVENT)).toBe('Vesting Event Today')
  })
  it('returns correct title for loan-due', () => {
    expect(formatNotificationTitle(LOAN_DUE_EVENT)).toBe('Loan Due Today')
  })
  it('returns correct title for interest-compound', () => {
    expect(formatNotificationTitle(COMPOUND_EVENT)).toBe('Interest Compounding Today')
  })
  it('returns correct title for refinance', () => {
    expect(formatNotificationTitle(REFINANCE_EVENT)).toBe('Refinance Event Today')
  })
})

// ---------------------------------------------------------------------------
// formatNotificationBody
// ---------------------------------------------------------------------------

describe('formatNotificationBody', () => {
  it('returns event label as body', () => {
    expect(formatNotificationBody(VESTING_EVENT)).toBe(VESTING_EVENT.label)
  })
})

// ---------------------------------------------------------------------------
// scheduleSessionNotifications
// ---------------------------------------------------------------------------

describe('scheduleSessionNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: { permission: 'granted' },
    })
  })

  it('returns empty array when permission is not granted', () => {
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: { permission: 'denied' },
    })
    const timers = scheduleSessionNotifications([VESTING_EVENT])
    expect(timers).toHaveLength(0)
  })

  it('schedules timers for future events', () => {
    const now = new Date('2025-07-14T10:00:00Z')
    const futureEvent: UpcomingEvent = {
      date: '2025-07-15',
      label: 'test',
      type: 'vesting',
    }
    const timers = scheduleSessionNotifications([futureEvent], now)
    expect(timers.length).toBeGreaterThan(0)
  })

  it('skips past events', () => {
    const now = new Date('2025-07-20T10:00:00Z')
    const pastEvent: UpcomingEvent = {
      date: '2025-07-14',
      label: 'past',
      type: 'vesting',
    }
    const timers = scheduleSessionNotifications([pastEvent], now)
    expect(timers).toHaveLength(0)
  })

  it('returns empty array when no events provided', () => {
    expect(scheduleSessionNotifications([], new Date())).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// cacheUpcomingEvents
// ---------------------------------------------------------------------------

describe('cacheUpcomingEvents', () => {
  it('writes upcoming events to cache', async () => {
    const data = {
      ...emptyAppData(),
      grants: [
        {
          id: 'g1',
          year: 2020,
          type: 'Purchase' as const,
          shares: 500,
          price: 2.0,
          vestStart: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]!,
          vestPeriods: 1,
          passedPeriods: 0,
        },
      ],
    }
    await expect(cacheUpcomingEvents(data, 30)).resolves.toBeUndefined()
  })

  it('resolves without throwing when there are no events to cache', async () => {
    // caches is mocked in setup.ts — verify empty data resolves cleanly
    await expect(cacheUpcomingEvents(emptyAppData(), 30)).resolves.toBeUndefined()
  })
})
