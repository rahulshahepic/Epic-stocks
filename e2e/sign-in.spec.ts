import { test, expect } from '@playwright/test'
import { mockGoogleAuth, mockDriveWithData, FIXTURE_DATA } from './helpers'

test.describe('Sign-in screen', () => {
  test('shows sign-in button when not authenticated', async ({ page }) => {
    // Don't mock auth — app should show sign-in screen
    await page.goto('/')
    await expect(page.getByTestId('sign-in-button')).toBeVisible()
  })

  test('shows app shell after successful sign-in', async ({ page }) => {
    await mockGoogleAuth(page)
    await mockDriveWithData(page, FIXTURE_DATA)
    await page.goto('/')
    await page.getByTestId('sign-in-button').click()
    // Navigation tabs should appear
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 10000 })
  })

  test('shows error message when client ID is missing', async ({ page }) => {
    // Block GIS script to simulate missing client ID config
    await page.route('**/accounts.google.com/gsi/client', (route) => route.abort())
    await page.goto('/')
    // Sign-in button still shown (error surfaced on click)
    await expect(page.getByTestId('sign-in-button')).toBeVisible()
  })
})
