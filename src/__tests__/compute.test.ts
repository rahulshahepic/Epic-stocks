import { describe, it, expect } from 'vitest'
import {
  computeInterestLoans,
  computeAllLoans,
  computeCurrentShares,
  computeTotalLoanBalance,
  computePortfolioSummary,
  getUpcomingEvents,
  buildLoanChartData,
  emptyAppData,
  formatCurrency,
  formatPercent,
  formatDate,
} from '../lib/compute'
import type { AppData, BaseLoan, RateYear } from '../lib/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_LOAN: BaseLoan = {
  id: 'loan-1',
  grantId: 'grant-1',
  grantYear: 2020,
  grantType: 'Purchase',
  loanType: 'Purchase',
  amount: 1000,
  rate: 0.01,
  due: '2030-07-01',
}

const RATES: RateYear[] = [
  { year: 2021, rate: 0.02 },
  { year: 2022, rate: 0.03 },
  { year: 2023, rate: 0.035 },
]

function makeData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...emptyAppData(),
    currentPrice: 2.5,
    baseLoans: [BASE_LOAN],
    ratesByYear: RATES,
    shareEvents: [
      { id: 'se-1', date: '2021-07-01', vestedDelta: 100, label: 'Vesting 1' },
      { id: 'se-2', date: '2022-07-01', vestedDelta: 100, label: 'Vesting 2' },
    ],
    grants: [
      {
        id: 'grant-1',
        year: 2020,
        type: 'Purchase',
        shares: 500,
        price: 2.0,
        vestStart: '2021-07-01',
        vestPeriods: 5,
        passedPeriods: 2,
      },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// computeInterestLoans
// ---------------------------------------------------------------------------

describe('computeInterestLoans', () => {
  it('generates one interest loan per year from grantYear+1 to dueYear', () => {
    const loan: BaseLoan = { ...BASE_LOAN, grantYear: 2020, due: '2023-07-01' }
    const interests = computeInterestLoans(loan, RATES)
    // years 2021, 2022, 2023 → 3 interest loans
    expect(interests).toHaveLength(3)
  })

  it('uses the correct rate for each year', () => {
    const loan: BaseLoan = { ...BASE_LOAN, grantYear: 2020, due: '2022-07-01' }
    const interests = computeInterestLoans(loan, RATES)
    expect(interests[0]!.rate).toBe(0.02) // 2021 rate
    expect(interests[1]!.rate).toBe(0.03) // 2022 rate
  })

  it('interest amount equals principal × base rate', () => {
    const loan: BaseLoan = { ...BASE_LOAN, amount: 1000, rate: 0.05, grantYear: 2020, due: '2021-07-01' }
    const interests = computeInterestLoans(loan, RATES)
    expect(interests[0]!.amount).toBeCloseTo(50) // 1000 * 0.05
  })

  it('falls back to base rate when year not in ratesByYear', () => {
    const loan: BaseLoan = { ...BASE_LOAN, grantYear: 2020, due: '2026-07-01', rate: 0.04 }
    const interests = computeInterestLoans(loan, []) // no rates provided
    expect(interests.every((i) => i.rate === 0.04)).toBe(true)
  })

  it('generates no interest loans when due year equals grant year', () => {
    const loan: BaseLoan = { ...BASE_LOAN, grantYear: 2023, due: '2023-12-31' }
    const interests = computeInterestLoans(loan, RATES)
    expect(interests).toHaveLength(0)
  })

  it('sets kind to "interest"', () => {
    const loan: BaseLoan = { ...BASE_LOAN, grantYear: 2020, due: '2022-07-01' }
    const interests = computeInterestLoans(loan, RATES)
    expect(interests.every((i) => i.kind === 'interest')).toBe(true)
  })

  it('sets sourceBaseLoanId to the parent loan id', () => {
    const loan: BaseLoan = { ...BASE_LOAN, id: 'parent-123', grantYear: 2020, due: '2021-07-01' }
    const interests = computeInterestLoans(loan, RATES)
    expect(interests[0]!.sourceBaseLoanId).toBe('parent-123')
  })
})

// ---------------------------------------------------------------------------
// computeAllLoans
// ---------------------------------------------------------------------------

describe('computeAllLoans', () => {
  it('includes base loan and interest loans', () => {
    const data = makeData()
    const loans = computeAllLoans(data)
    const base = loans.filter((l) => l.kind === 'base')
    const interest = loans.filter((l) => l.kind === 'interest')
    expect(base).toHaveLength(1)
    expect(interest.length).toBeGreaterThan(0)
  })

  it('marks replaced loans as superseded after refinance', () => {
    const data = makeData({
      refinanceEvents: [
        {
          id: 'ref-1',
          date: '2023-01-01',
          replacesLoanIds: ['loan-1'],
          newRate: 0.025,
          newDue: '2030-07-01',
        },
      ],
    })
    const loans = computeAllLoans(data)
    const original = loans.find((l) => l.id === 'loan-1')
    expect(original?.superseded).toBe(true)
  })

  it('adds a refinance-replacement loan after refinance', () => {
    const data = makeData({
      refinanceEvents: [
        {
          id: 'ref-1',
          date: '2023-01-01',
          replacesLoanIds: ['loan-1'],
          newRate: 0.025,
          newDue: '2030-07-01',
        },
      ],
    })
    const loans = computeAllLoans(data)
    const replacement = loans.find((l) => l.kind === 'refinance-replacement')
    expect(replacement).toBeDefined()
    expect(replacement?.rate).toBe(0.025)
  })

  it('returns empty array for empty AppData', () => {
    expect(computeAllLoans(emptyAppData())).toEqual([])
  })

  it('sorts by grantYear then originYear', () => {
    const data = makeData({
      baseLoans: [
        { ...BASE_LOAN, id: 'b2', grantYear: 2022, grantType: 'Purchase', due: '2023-07-01' },
        { ...BASE_LOAN, id: 'b1', grantYear: 2020, grantType: 'Purchase', due: '2023-07-01' },
      ],
      ratesByYear: [],
    })
    const loans = computeAllLoans(data)
    expect(loans[0]!.grantYear).toBeLessThanOrEqual(loans[loans.length - 1]!.grantYear)
  })
})

// ---------------------------------------------------------------------------
// computeCurrentShares
// ---------------------------------------------------------------------------

describe('computeCurrentShares', () => {
  it('sums all share event deltas', () => {
    const data = makeData()
    expect(computeCurrentShares(data)).toBe(200)
  })

  it('handles negative deltas (share repayments)', () => {
    const data = makeData({
      shareEvents: [
        { id: '1', date: '2021-01-01', vestedDelta: 100, label: '' },
        { id: '2', date: '2022-01-01', vestedDelta: -30, label: '' },
      ],
    })
    expect(computeCurrentShares(data)).toBe(70)
  })

  it('returns 0 when no share events', () => {
    expect(computeCurrentShares(emptyAppData())).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// computeTotalLoanBalance
// ---------------------------------------------------------------------------

describe('computeTotalLoanBalance', () => {
  it('sums non-superseded loan amounts', () => {
    const data = makeData()
    const loans = computeAllLoans(data)
    const balance = computeTotalLoanBalance(loans)
    expect(balance).toBeGreaterThan(0)
  })

  it('excludes superseded loans from balance', () => {
    const data = makeData({
      refinanceEvents: [
        {
          id: 'ref-1',
          date: '2023-01-01',
          replacesLoanIds: ['loan-1'],
          newRate: 0.025,
          newDue: '2030-07-01',
        },
      ],
    })
    const loans = computeAllLoans(data)
    const active = loans.filter((l) => !l.superseded)
    const balance = computeTotalLoanBalance(loans)
    const expectedBalance = active.reduce((s, l) => s + l.amount, 0)
    expect(balance).toBeCloseTo(expectedBalance)
  })
})

// ---------------------------------------------------------------------------
// computePortfolioSummary
// ---------------------------------------------------------------------------

describe('computePortfolioSummary', () => {
  it('portfolio value = shares × price', () => {
    const data = makeData({ currentPrice: 3.0 })
    const loans = computeAllLoans(data)
    const summary = computePortfolioSummary(data, loans)
    expect(summary.portfolioValue).toBeCloseTo(200 * 3.0)
  })

  it('net value = portfolio value − loan balance', () => {
    const data = makeData()
    const loans = computeAllLoans(data)
    const summary = computePortfolioSummary(data, loans)
    expect(summary.netValue).toBeCloseTo(
      summary.portfolioValue - summary.totalLoanBalance,
    )
  })

  it('returns zeroed summary for empty data', () => {
    const data = emptyAppData()
    const loans = computeAllLoans(data)
    const summary = computePortfolioSummary(data, loans)
    expect(summary.portfolioValue).toBe(0)
    expect(summary.totalLoanBalance).toBe(0)
    expect(summary.currentShares).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getUpcomingEvents
// ---------------------------------------------------------------------------

describe('getUpcomingEvents', () => {
  it('returns events within the window', () => {
    const today = new Date('2025-07-10')
    const data = makeData({
      grants: [
        {
          id: 'g1',
          year: 2020,
          type: 'Purchase',
          shares: 500,
          price: 2.0,
          vestStart: '2025-07-12', // 2 days from today
          vestPeriods: 1,
          passedPeriods: 0,
        },
      ],
      baseLoans: [],
    })
    const events = getUpcomingEvents(data, today, 7)
    expect(events.some((e) => e.type === 'vesting')).toBe(true)
  })

  it('does not return events outside the window', () => {
    const today = new Date('2025-01-01')
    const data = makeData({
      grants: [
        {
          id: 'g1',
          year: 2020,
          type: 'Purchase',
          shares: 500,
          price: 2.0,
          vestStart: '2025-06-01', // 5 months away
          vestPeriods: 1,
          passedPeriods: 0,
        },
      ],
      baseLoans: [],
    })
    const events = getUpcomingEvents(data, today, 7)
    expect(events.filter((e) => e.type === 'vesting')).toHaveLength(0)
  })

  it('includes interest-compound event on July 15 if within window', () => {
    const today = new Date('2025-07-10')
    const data = emptyAppData()
    const events = getUpcomingEvents(data, today, 10)
    expect(events.some((e) => e.type === 'interest-compound')).toBe(true)
  })

  it('returns empty array when no events exist', () => {
    const events = getUpcomingEvents(emptyAppData(), new Date('2025-01-01'), 7)
    // May include interest-compound on July 15 if within window, but for Jan 1 → 7 day window, no July 15
    expect(events.filter((e) => e.type !== 'interest-compound')).toHaveLength(0)
  })

  it('sorts events by date ascending', () => {
    const today = new Date('2025-07-10')
    const data = makeData({
      grants: [
        {
          id: 'g1',
          year: 2020,
          type: 'Purchase',
          shares: 500,
          price: 2.0,
          vestStart: '2025-07-16',
          vestPeriods: 1,
          passedPeriods: 0,
        },
      ],
      baseLoans: [{ ...BASE_LOAN, due: '2025-07-11' }],
      ratesByYear: [],
    })
    const events = getUpcomingEvents(data, today, 14)
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.date >= events[i - 1]!.date).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// buildLoanChartData
// ---------------------------------------------------------------------------

describe('buildLoanChartData', () => {
  it('groups loans by grant label', () => {
    const data = makeData()
    const loans = computeAllLoans(data)
    const chart = buildLoanChartData(loans)
    expect(chart.length).toBeGreaterThan(0)
    expect(chart[0]).toHaveProperty('name')
    expect(chart[0]).toHaveProperty('balance')
    expect(chart[0]).toHaveProperty('interest')
  })

  it('returns empty array for empty loan list', () => {
    expect(buildLoanChartData([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats positive numbers as USD', () => {
    expect(formatCurrency(1234)).toBe('$1,234')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('formatPercent', () => {
  it('formats decimal rates as percentage string', () => {
    expect(formatPercent(0.037)).toBe('3.70%')
  })
})

describe('formatDate', () => {
  it('formats ISO date string to human-readable', () => {
    expect(formatDate('2025-07-15')).toContain('2025')
  })
})
