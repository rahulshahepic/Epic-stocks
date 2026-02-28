import type { Page } from '@playwright/test'
import { emptyAppData } from '../src/lib/compute'
import type { AppData } from '../src/lib/types'

export const FIXTURE_DATA: AppData = {
  ...emptyAppData(),
  currentPrice: 2.85,
  asOfDate: '2025-07-15',
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
  baseLoans: [
    {
      id: 'l1',
      grantId: 'g1',
      grantYear: 2020,
      grantType: 'Purchase',
      loanType: 'Purchase',
      amount: 995,
      rate: 0.0086,
      due: '2030-07-01',
    },
  ],
  ratesByYear: [
    { year: 2021, rate: 0.0091 },
    { year: 2022, rate: 0.0086 },
  ],
  shareEvents: [
    { id: 'se1', date: '2021-07-01', vestedDelta: 100, label: 'Vesting 1 — 2020 Purchase' },
    { id: 'se2', date: '2022-07-01', vestedDelta: 100, label: 'Vesting 2 — 2020 Purchase' },
  ],
  priceHistory: [
    { date: '2023-07-01', price: 2.27 },
    { date: '2024-07-01', price: 2.50 },
    { date: '2025-07-15', price: 2.85 },
  ],
}

/** Mock Google auth so the app considers the user signed in */
export async function mockGoogleAuth(page: Page) {
  // Block the real GIS script so it cannot load and overwrite our window.google
  // stub — this matters on reload in CI where the network is available.
  await page.route('**/accounts.google.com/gsi/client', (route) => route.abort())

  await page.addInitScript(() => {
    // Stub the GIS token client
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config: { callback: (r: { access_token: string; expires_in: number }) => void }) => ({
            requestAccessToken: () => {
              config.callback({
                access_token: 'mock-access-token',
                expires_in: 3600,
              })
            },
          }),
          revoke: (_token: string, cb: () => void) => cb(),
        },
      },
    }

    // Stub userinfo endpoint
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('userinfo')) {
        return new Response(
          JSON.stringify({ name: 'Test User', email: 'test@example.com', picture: '' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input, init)
    }
  })
}

/** Mock Google Drive API to return specific data */
export async function mockDriveWithData(page: Page, data: AppData | null) {
  await page.addInitScript((appData) => {
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      // Drive file list
      if (url.includes('drive/v3/files') && !url.includes('alt=media') && !url.includes('upload')) {
        if (appData === null) {
          return new Response(JSON.stringify({ files: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(
          JSON.stringify({ files: [{ id: 'mock-file-id', name: 'stock-tracker-v1.json' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      // Drive file download
      if (url.includes('alt=media') && appData !== null) {
        return new Response(JSON.stringify(appData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Drive file upload / patch
      if (url.includes('upload/drive/v3')) {
        return new Response(JSON.stringify({ id: 'mock-file-id' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return originalFetch(input, init)
    }
  }, data)
}

/** Mock Drive with no existing data (empty state) */
export async function mockDriveEmpty(page: Page) {
  await mockDriveWithData(page, null)
}
