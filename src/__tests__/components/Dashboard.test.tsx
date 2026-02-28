import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../../components/Dashboard/Dashboard'
import { emptyAppData } from '../../lib/compute'
import type { AppData } from '../../lib/types'

function makeData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...emptyAppData(),
    currentPrice: 2.5,
    asOfDate: '2025-07-15',
    grants: [
      {
        id: 'g1',
        year: 2020,
        type: 'Purchase',
        shares: 500,
        price: 2.0,
        vestStart: '2021-07-01',
        vestPeriods: 5,
        passedPeriods: 2,
      },
    ],
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
    shareEvents: [
      { id: 'se1', date: '2021-07-01', vestedDelta: 100, label: 'Vesting 1' },
    ],
    priceHistory: [
      { date: '2024-01-01', price: 2.0 },
      { date: '2025-01-01', price: 2.5 },
    ],
    ...overrides,
  }
}

describe('Dashboard', () => {
  it('renders without crashing', () => {
    render(<Dashboard data={makeData()} />)
  })

  it('shows portfolio value card', () => {
    render(<Dashboard data={makeData()} />)
    expect(screen.getByText('Portfolio Value')).toBeTruthy()
  })

  it('shows total loans card', () => {
    render(<Dashboard data={makeData()} />)
    expect(screen.getByText('Total Loans')).toBeTruthy()
  })

  it('shows net value card', () => {
    render(<Dashboard data={makeData()} />)
    expect(screen.getByText('Net Value')).toBeTruthy()
  })

  it('shows vested shares card', () => {
    render(<Dashboard data={makeData()} />)
    expect(screen.getByText('Vested Shares')).toBeTruthy()
  })

  it('renders with empty data without crashing', () => {
    render(<Dashboard data={emptyAppData()} />)
  })

  it('renders chart section title when history has multiple points', () => {
    render(<Dashboard data={makeData()} />)
    // ResponsiveContainer requires actual layout dimensions — jsdom doesn't provide
    // them, so SVG won't render. Instead verify the chart section heading is present.
    expect(screen.getByText('Share Price History')).toBeTruthy()
  })
})
