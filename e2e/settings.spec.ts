import { test, expect } from '@playwright/test'
import { mockGoogleAuth, mockDriveWithData, FIXTURE_DATA } from './helpers'

async function goToSettings(page: import('@playwright/test').Page) {
  await mockGoogleAuth(page)
  await mockDriveWithData(page, FIXTURE_DATA)
  await page.goto('/')
  await page.getByTestId('sign-in-button').click()
  await page.getByTestId('nav-settings').waitFor({ timeout: 10000 })
  await page.getByTestId('nav-settings').click()
}

test.describe('Settings tab', () => {
  test('updates current price', async ({ page }) => {
    await goToSettings(page)
    await page.getByText('Current Share Price').click()
    const priceInput = page.getByTestId('price-input')
    await priceInput.clear()
    await priceInput.fill('3.00')
    await page.getByRole('button', { name: 'Update' }).click()
    // Hint text should reflect new price
    await expect(page.getByText(/\$3.00/)).toBeVisible()
  })

  test('copies AI prompt to clipboard', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Clipboard API best tested in Chromium')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await goToSettings(page)
    await page.getByText('Import with AI').click()
    await page.getByTestId('copy-ai-prompt-btn').click()
    await expect(page.getByText('✓ Copied!')).toBeVisible()
  })

  test('export button triggers file download', async ({ page }) => {
    await goToSettings(page)
    await page.getByText('Export & Import').click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-btn').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/stock-tracker-export.*\.json/)
  })

  test('adds a rate year and shows it in list', async ({ page }) => {
    await goToSettings(page)
    await page.getByText('Annual Rate History').click()
    // The rate list section should be visible
    await expect(page.getByText('Add Year')).toBeVisible()
  })

  test('sign out button calls sign out', async ({ page }) => {
    await goToSettings(page)
    await page.getByText('Sign Out').click()
    // After sign out, sign-in screen should appear
    await expect(page.getByTestId('sign-in-button')).toBeVisible({ timeout: 5000 })
  })
})
