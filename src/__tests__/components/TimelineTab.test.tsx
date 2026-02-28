import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineTab } from '../../components/Timeline/TimelineTab'
import { emptyAppData } from '../../lib/compute'
import type { AppData } from '../../lib/types'

function makeData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...emptyAppData(),
    shareEvents: [
      { id: 'se1', date: '2022-07-01', vestedDelta: 100, label: 'Vesting 1 — 2020 Purchase' },
      { id: 'se2', date: '2023-07-01', vestedDelta: -20, label: 'Repayment' },
    ],
    priceHistory: [
      { date: '2022-01-01', price: 2.0 },
    ],
    ...overrides,
  }
}

describe('TimelineTab', () => {
  it('renders without crashing', () => {
    render(<TimelineTab data={emptyAppData()} />)
  })

  it('shows Timeline heading', () => {
    render(<TimelineTab data={emptyAppData()} />)
    expect(screen.getByText('Timeline')).toBeTruthy()
  })

  it('shows empty state when no events', () => {
    render(<TimelineTab data={emptyAppData()} />)
    expect(screen.getByText(/no events/i)).toBeTruthy()
  })

  it('renders share event labels', () => {
    render(<TimelineTab data={makeData()} />)
    expect(screen.getByText('Vesting 1 — 2020 Purchase')).toBeTruthy()
    expect(screen.getByText('Repayment')).toBeTruthy()
  })

  it('renders price update events', () => {
    render(<TimelineTab data={makeData()} />)
    expect(screen.getByText('Price update')).toBeTruthy()
  })

  it('renders future vesting dates from grants', () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const data = makeData({
      grants: [
        {
          id: 'g1',
          year: 2020,
          type: 'Purchase',
          shares: 500,
          price: 2.0,
          vestStart: futureDate.toISOString().split('T')[0]!,
          vestPeriods: 1,
          passedPeriods: 0,
        },
      ],
    })
    render(<TimelineTab data={data} />)
    expect(screen.getByText(/vesting period/i)).toBeTruthy()
  })

  it('renders loan due date events', () => {
    const data = makeData({
      baseLoans: [
        {
          id: 'l1',
          grantId: 'g1',
          grantYear: 2020,
          grantType: 'Purchase',
          loanType: 'Purchase',
          amount: 1000,
          rate: 0.037,
          due: '2030-07-01',
        },
      ],
    })
    render(<TimelineTab data={data} />)
    expect(screen.getByText(/loan due/i)).toBeTruthy()
  })

  it('renders refinance events', () => {
    const data = makeData({
      refinanceEvents: [
        {
          id: 'ref-1',
          date: '2023-06-01',
          replacesLoanIds: ['l1'],
          newRate: 0.025,
          newDue: '2030-07-01',
        },
      ],
    })
    render(<TimelineTab data={data} />)
    expect(screen.getByText(/Refinance/)).toBeTruthy()
  })
})
