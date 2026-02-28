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
  // Locally: Chromium only, using the cached binary (no network download needed).
  // In CI: add Firefox, WebKit, and mobile viewports (browsers installed by workflow).
  projects: process.env['CI']
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'pixel5', use: { ...devices['Pixel 5'] } },
        { name: 'iphone12', use: { ...devices['iPhone 12'] } },
      ]
    : [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            launchOptions: {
              executablePath:
                '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
            },
          },
        },
      ],
  // Start vite preview before running tests; killed automatically after.
  // Locally: rebuild with a placeholder CLIENT_ID (real GIS is never called —
  // window.google is fully mocked in every test). In CI: app is already built
  // by the workflow step with the real secret, so just serve it.
  webServer: {
    command: process.env['CI']
      ? 'npm run preview'
      : 'VITE_GOOGLE_CLIENT_ID=test-placeholder npm run build && npm run preview',
    url: 'http://localhost:4173/Epic-stocks/',
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
