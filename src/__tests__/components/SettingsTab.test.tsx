import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsTab } from '../../components/Settings/SettingsTab'
import { emptyAppData } from '../../lib/compute'
import type { UseNotificationsResult } from '../../hooks/useNotifications'

const mockNotifications: UseNotificationsResult = {
  permission: 'default',
  periodicSyncRegistered: false,
  requestPermission: vi.fn().mockResolvedValue(undefined),
}

function renderSettings(overrides = {}) {
  return render(
    <SettingsTab
      data={emptyAppData()}
      onUpdate={vi.fn()}
      onImport={vi.fn().mockResolvedValue(undefined)}
      notifications={mockNotifications}
      onSignOut={vi.fn()}
      userName="Test User"
      {...overrides}
    />,
  )
}

describe('SettingsTab', () => {
  it('renders without crashing', () => {
    renderSettings()
  })

  it('shows signed-in user name', () => {
    renderSettings()
    expect(screen.getByText(/Test User/)).toBeTruthy()
  })

  it('shows sign-out button', () => {
    renderSettings()
    expect(screen.getByText('Sign Out')).toBeTruthy()
  })

  it('calls onSignOut when button clicked', () => {
    const onSignOut = vi.fn()
    renderSettings({ onSignOut })
    fireEvent.click(screen.getByText('Sign Out'))
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('shows all section headers', () => {
    renderSettings()
    expect(screen.getByText('Current Share Price')).toBeTruthy()
    expect(screen.getByText('Annual Rate History')).toBeTruthy()
    expect(screen.getByText('Notifications')).toBeTruthy()
    expect(screen.getByText('Import with AI')).toBeTruthy()
    expect(screen.getByText('Export & Import')).toBeTruthy()
  })

  it('opens price section when clicked', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Current Share Price'))
    expect(screen.getByTestId('price-input')).toBeTruthy()
  })

  it('opens AI import section and shows Copy AI Prompt button', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Import with AI'))
    expect(screen.getByTestId('copy-ai-prompt-btn')).toBeTruthy()
  })

  it('shows import textarea in AI import section', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Import with AI'))
    expect(screen.getByTestId('import-json-textarea')).toBeTruthy()
  })

  it('calls onImport with parsed JSON when Import clicked', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined)
    renderSettings({ onImport })
    fireEvent.click(screen.getByText('Import with AI'))

    const textarea = screen.getByTestId('import-json-textarea')
    fireEvent.change(textarea, {
      target: { value: JSON.stringify(emptyAppData()) },
    })

    fireEvent.click(screen.getByTestId('import-json-btn'))
    await vi.waitFor(() => expect(onImport).toHaveBeenCalledOnce())
  })

  it('shows error message on invalid JSON import', async () => {
    renderSettings()
    fireEvent.click(screen.getByText('Import with AI'))

    const textarea = screen.getByTestId('import-json-textarea')
    fireEvent.change(textarea, { target: { value: 'not valid json' } })
    fireEvent.click(screen.getByTestId('import-json-btn'))

    await vi.waitFor(() => {
      // Error text may say "invalid JSON", "not valid JSON", or "Unexpected token"
      expect(document.body.textContent).toMatch(/invalid|error|not valid|unexpected/i)
    })
  })

  it('shows enable notifications button when permission is not granted', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Notifications'))
    expect(screen.getByTestId('enable-notifications-btn')).toBeTruthy()
  })

  it('does not show enable button when permission is already granted', () => {
    const notifications: UseNotificationsResult = {
      ...mockNotifications,
      permission: 'granted',
    }
    renderSettings({ notifications })
    fireEvent.click(screen.getByText('Notifications'))
    expect(screen.queryByTestId('enable-notifications-btn')).toBeNull()
  })

  it('shows export button', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Export & Import'))
    expect(screen.getByTestId('export-btn')).toBeTruthy()
  })
})
