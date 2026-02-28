import { test, expect } from '@playwright/test'
import { mockGoogleAuth, mockDriveWithData, FIXTURE_DATA } from './helpers'

async function goToDashboard(page: import('@playwright/test').Page) {
  await mockGoogleAuth(page)
  await mockDriveWithData(page, FIXTURE_DATA)
  await page.goto('/')
  await page.getByTestId('sign-in-button').click()
  await page.getByTestId('nav-dashboard').waitFor({ timeout: 10000 })
}

test.describe('Dashboard', () => {
  test('shows Portfolio Value card', async ({ page }) => {
    await goToDashboard(page)
    await expect(page.getByText('Portfolio Value')).toBeVisible()
  })

  test('shows Total Loans card', async ({ page }) => {
    await goToDashboard(page)
    await expect(page.getByText('Total Loans')).toBeVisible()
  })

  test('shows Net Value card', async ({ page }) => {
    await goToDashboard(page)
    await expect(page.getByText('Net Value')).toBeVisible()
  })

  test('shows Vested Shares card', async ({ page }) => {
    await goToDashboard(page)
    await expect(page.getByText('Vested Shares')).toBeVisible()
  })

  test('renders at least one chart (SVG element present)', async ({ page }) => {
    await goToDashboard(page)
    const svg = page.locator('svg').first()
    await expect(svg).toBeVisible()
  })

  test('renders on mobile viewport', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Mobile viewport tested via iphone12 project')
    await page.setViewportSize({ width: 390, height: 844 })
    await goToDashboard(page)
    await expect(page.getByText('Portfolio Value')).toBeVisible()
  })
})
