import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI']
    ? [['html', { outputFolder: 'playwright-report' }], ['github']]
    : 'html',
  use: {
    baseURL: 'http://localhost:4173/Epic-stocks/',
    trace: 'on-first-retry',
  },
  // Locally: Chromium only. In CI: add Firefox, WebKit, and mobile viewports.
  projects: process.env['CI']
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'pixel5', use: { ...devices['Pixel 5'] } },
        { name: 'iphone12', use: { ...devices['iPhone 12'] } },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Start vite preview before running tests; killed automatically after
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/Epic-stocks/',
    reuseExistingServer: !process.env['CI'],
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
