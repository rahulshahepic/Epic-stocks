import { test, expect } from '@playwright/test'
import { mockGoogleAuth, mockDriveEmpty, mockDriveWithData, FIXTURE_DATA } from './helpers'
import { emptyAppData } from '../src/lib/compute'

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByTestId('sign-in-button').click()
  await page.getByTestId('nav-dashboard').waitFor({ timeout: 10000 })
}

test.describe('Import data', () => {
  test('shows import prompt when no data exists', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveEmpty(page)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    // Empty state shows welcome message and Settings UI
    await expect(page.getByText('Welcome!')).toBeVisible({ timeout: 10000 })
  })

  test('uploads valid JSON and shows app with data', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveEmpty(page)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    await page.getByText('Import with AI').click({ timeout: 10000 })

    const textarea = page.getByTestId('import-json-textarea')
    await textarea.fill(JSON.stringify(FIXTURE_DATA))
    await page.getByTestId('import-json-btn').click()

    await expect(page.getByText('Data imported successfully!')).toBeVisible({ timeout: 10000 })
  })

  test('shows error on invalid JSON', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveEmpty(page)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    await page.getByText('Import with AI').click({ timeout: 10000 })

    await page.getByTestId('import-json-textarea').fill('{ invalid json }')
    await page.getByTestId('import-json-btn').click()

    // Error message should appear (either JSON parse error or Zod error)
    await expect(page.locator('text=/error|invalid/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('shows error on schema-invalid JSON (wrong types)', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveEmpty(page)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    await page.getByText('Import with AI').click({ timeout: 10000 })

    const badData = { ...emptyAppData(), currentPrice: 'not-a-number' }
    await page.getByTestId('import-json-textarea').fill(JSON.stringify(badData))
    await page.getByTestId('import-json-btn').click()

    await expect(page.locator('text=/error|invalid/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('data persists after page reload (Drive mock returns same data)', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveWithData(page, FIXTURE_DATA)
    await signIn(page)

    await page.reload()
    await page.getByTestId('sign-in-button').click()
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 10000 })
  })
})
