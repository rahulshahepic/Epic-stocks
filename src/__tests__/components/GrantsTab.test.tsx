import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GrantsTab } from '../../components/Grants/GrantsTab'
import { emptyAppData } from '../../lib/compute'
import type { AppData } from '../../lib/types'

function makeData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...emptyAppData(),
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
    ...overrides,
  }
}

describe('GrantsTab', () => {
  it('renders without crashing', () => {
    render(<GrantsTab data={emptyAppData()} onUpdate={vi.fn()} />)
  })

  it('shows grants heading', () => {
    render(<GrantsTab data={emptyAppData()} onUpdate={vi.fn()} />)
    expect(screen.getByText('Grants')).toBeTruthy()
  })

  it('shows empty state message when no grants', () => {
    render(<GrantsTab data={emptyAppData()} onUpdate={vi.fn()} />)
    expect(screen.getByText(/no grants/i)).toBeTruthy()
  })

  it('renders grant row when grants exist', () => {
    render(<GrantsTab data={makeData()} onUpdate={vi.fn()} />)
    expect(screen.getByText('2020')).toBeTruthy()
  })

  it('shows Add Grant button', () => {
    render(<GrantsTab data={emptyAppData()} onUpdate={vi.fn()} />)
    expect(screen.getByTestId('add-grant-btn')).toBeTruthy()
  })

  it('opens add form when Add Grant is clicked', () => {
    render(<GrantsTab data={emptyAppData()} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByTestId('add-grant-btn'))
    expect(screen.getByText('Add Grant')).toBeTruthy()
    // Form fields should appear
    expect(screen.getAllByText('Year').length).toBeGreaterThan(0)
  })

  it('shows edit form when Edit clicked on a grant', () => {
    render(<GrantsTab data={makeData()} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Grant')).toBeTruthy()
  })

  it('calls onUpdate with new grant on form submit', () => {
    const onUpdate = vi.fn()
    render(<GrantsTab data={emptyAppData()} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByTestId('add-grant-btn'))

    // Fill required fields
    const inputs = document.querySelectorAll('input')
    // Year, Shares, Price, Vest Start, Vest Periods, Passed Periods
    fireEvent.change(inputs[0]!, { target: { value: '2021' } }) // Year
    fireEvent.change(inputs[1]!, { target: { value: '500' } })  // Shares
    fireEvent.change(inputs[2]!, { target: { value: '2.5' } })  // Price
    fireEvent.change(inputs[3]!, { target: { value: '2022-07-01' } }) // vestStart
    fireEvent.change(inputs[4]!, { target: { value: '5' } })    // vestPeriods
    fireEvent.change(inputs[5]!, { target: { value: '0' } })    // passedPeriods

    fireEvent.submit(document.querySelector('form')!)
    expect(onUpdate).toHaveBeenCalledOnce()
  })

  it('calls onUpdate when delete is confirmed', () => {
    const onUpdate = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<GrantsTab data={makeData()} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByText('✕'))
    expect(onUpdate).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })

  it('does not call onUpdate when delete is cancelled', () => {
    const onUpdate = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<GrantsTab data={makeData()} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByText('✕'))
    expect(onUpdate).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
