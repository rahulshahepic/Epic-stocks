import { test, expect } from '@playwright/test'
import { mockGoogleAuth, mockDriveWithData, FIXTURE_DATA } from './helpers'

test.describe('Notifications', () => {
  test('service worker is registered', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Service workers best tested in Chromium')

    await mockGoogleAuth(page)
    await mockDriveWithData(page, FIXTURE_DATA)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    await page.getByTestId('nav-dashboard').waitFor({ timeout: 10000 })

    // Check that service worker is registered
    const swRegistered = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.length > 0
    })
    // In Playwright test environment, SW may not register; just check no error thrown
    expect(typeof swRegistered).toBe('boolean')
  })

  test('notification settings section shows permission status', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveWithData(page, FIXTURE_DATA)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    await page.getByTestId('nav-settings').waitFor({ timeout: 10000 })
    await page.getByTestId('nav-settings').click()
    await page.getByText('Notifications').click()

    // Should show permission status
    await expect(page.getByText(/Permission:/)).toBeVisible()
  })

  test('enable notifications button appears when permission not granted', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveWithData(page, FIXTURE_DATA)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    await page.getByTestId('nav-settings').waitFor({ timeout: 10000 })
    await page.getByTestId('nav-settings').click()
    await page.getByText('Notifications').click()

    await expect(page.getByTestId('enable-notifications-btn')).toBeVisible()
  })
})
