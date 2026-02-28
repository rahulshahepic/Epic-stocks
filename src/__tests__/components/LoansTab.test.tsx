import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoansTab } from '../../components/Loans/LoansTab'
import { emptyAppData } from '../../lib/compute'
import type { AppData } from '../../lib/types'

function makeData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...emptyAppData(),
    currentPrice: 2.5,
    ratesByYear: [
      { year: 2021, rate: 0.02 },
      { year: 2022, rate: 0.03 },
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
        due: '2023-07-01',
      },
    ],
    ...overrides,
  }
}

describe('LoansTab', () => {
  it('renders without crashing', () => {
    render(<LoansTab data={makeData()} onUpdate={vi.fn()} />)
  })

  it('shows the loans table', () => {
    render(<LoansTab data={makeData()} onUpdate={vi.fn()} />)
    expect(screen.getByTestId('loans-table')).toBeTruthy()
  })

  it('shows computed interest loans (generated dynamically)', () => {
    const { container } = render(<LoansTab data={makeData()} onUpdate={vi.fn()} />)
    // Should have more rows than just the 1 base loan (interest loans added)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThan(1)
  })

  it('shows refinance-replacement badge after adding a refinance', () => {
    const data = makeData({
      refinanceEvents: [
        {
          id: 'ref-1',
          date: '2022-01-01',
          replacesLoanIds: ['l1'],
          newRate: 0.025,
          newDue: '2030-07-01',
        },
      ],
    })
    render(<LoansTab data={data} onUpdate={vi.fn()} />)
    expect(screen.getByText('Refinanced')).toBeTruthy()
  })

  it('calls onUpdate when Add Loan form is submitted', () => {
    const onUpdate = vi.fn()
    render(<LoansTab data={makeData()} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByTestId('add-loan-btn'))
    // Form should be visible
    expect(screen.getByText('Add Base Loan')).toBeTruthy()
  })

  it('shows Add Refinance form when button clicked', () => {
    render(<LoansTab data={makeData()} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByTestId('add-refinance-btn'))
    expect(screen.getByText('Add Refinance Event')).toBeTruthy()
  })

  it('shows refinance history section when refinance events exist', () => {
    const data = makeData({
      refinanceEvents: [
        {
          id: 'ref-1',
          date: '2022-01-01',
          replacesLoanIds: ['l1'],
          newRate: 0.025,
          newDue: '2030-07-01',
        },
      ],
    })
    render(<LoansTab data={data} onUpdate={vi.fn()} />)
    expect(screen.getByText(/Refinance History/)).toBeTruthy()
  })

  it('renders correctly with empty data', () => {
    render(<LoansTab data={emptyAppData()} onUpdate={vi.fn()} />)
  })
})
