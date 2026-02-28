import { z } from 'zod'
import { migrateAppData } from './compute'
import type { AppData } from './types'

// ---------------------------------------------------------------------------
// Google Drive appDataFolder storage
// ---------------------------------------------------------------------------

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FILE_NAME = 'stock-tracker-v1.json'
const PUSH_SUB_FILE_NAME = 'push-subscription.json'

export class DriveError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = 'DriveError'
  }
}

async function driveRequest(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  return res
}

/** Find the file ID of a named file in appDataFolder, or null if not found. */
export async function findFileId(
  token: string,
  name: string,
): Promise<string | null> {
  const url = new URL(`${DRIVE_API}/files`)
  url.searchParams.set('spaces', 'appDataFolder')
  url.searchParams.set('fields', 'files(id,name)')
  url.searchParams.set('q', `name = '${name}'`)

  const res = await driveRequest(url.toString(), token)
  if (!res.ok) {
    throw new DriveError(`Failed to list Drive files: ${res.statusText}`, res.status)
  }
  const json = (await res.json()) as { files: { id: string; name: string }[] }
  return json.files[0]?.id ?? null
}

/** Download and parse a JSON file from appDataFolder. Returns null if not found. */
async function downloadJson<T>(token: string, name: string): Promise<T | null> {
  const fileId = await findFileId(token, name)
  if (!fileId) return null

  const res = await driveRequest(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    token,
  )
  if (!res.ok) {
    throw new DriveError(`Failed to download ${name}: ${res.statusText}`, res.status)
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new DriveError(`${name} contains invalid JSON`)
  }
}

/** Upload (create or update) a JSON file in appDataFolder. */
async function uploadJson(
  token: string,
  name: string,
  data: unknown,
): Promise<void> {
  const existingId = await findFileId(token, name)
  const body = JSON.stringify(data)
  const blob = new Blob([body], { type: 'application/json' })

  if (existingId) {
    // PATCH existing file
    const res = await driveRequest(
      `${UPLOAD_API}/files/${existingId}?uploadType=media`,
      token,
      { method: 'PATCH', body: blob },
    )
    if (!res.ok) {
      throw new DriveError(`Failed to update ${name}: ${res.statusText}`, res.status)
    }
  } else {
    // POST new file
    const metadata = { name, parents: ['appDataFolder'] }
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
    )
    form.append('file', blob)

    const res = await driveRequest(
      `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
      token,
      { method: 'POST', body: form },
    )
    if (!res.ok) {
      throw new DriveError(`Failed to create ${name}: ${res.statusText}`, res.status)
    }
  }
}

// ---------------------------------------------------------------------------
// AppData CRUD
// ---------------------------------------------------------------------------

/** Zod schema for validating imported AppData */
const RateYearSchema = z.object({
  year: z.number().int(),
  rate: z.number().min(0).max(1),
})

const GrantSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  type: z.enum(['Purchase', 'Catch-Up Purchase', 'Bonus', 'Catch-Up Bonus']),
  shares: z.number().positive(),
  price: z.number().positive(),
  vestStart: z.string(),
  vestPeriods: z.number().int().positive(),
  passedPeriods: z.number().int().min(0),
})

const BaseLoanSchema = z.object({
  id: z.string(),
  grantId: z.string(),
  grantYear: z.number().int(),
  grantType: z.enum(['Purchase', 'Catch-Up Purchase', 'Bonus', 'Catch-Up Bonus']),
  loanType: z.enum(['Purchase', 'Tax']),
  amount: z.number().positive(),
  rate: z.number().min(0).max(1),
  due: z.string(),
})

const RefinanceEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  replacesLoanIds: z.array(z.string()),
  newRate: z.number().min(0).max(1),
  newDue: z.string(),
})

const ShareEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  vestedDelta: z.number(),
  label: z.string(),
})

const PricePointSchema = z.object({
  date: z.string(),
  price: z.number().positive(),
})

export const AppDataSchema = z.object({
  schemaVersion: z.number().int().default(1),
  currentPrice: z.number().min(0),
  asOfDate: z.string(),
  grants: z.array(GrantSchema),
  baseLoans: z.array(BaseLoanSchema),
  ratesByYear: z.array(RateYearSchema),
  refinanceEvents: z.array(RefinanceEventSchema),
  shareEvents: z.array(ShareEventSchema),
  priceHistory: z.array(PricePointSchema),
  notificationPreference: z
    .enum(['granted', 'denied', 'pending'])
    .optional(),
})

export function validateAppData(raw: unknown): AppData {
  const parsed = AppDataSchema.parse(raw)
  return migrateAppData(parsed)
}

/** Load AppData from Drive. Returns null if no data file found yet. */
export async function getAppData(token: string): Promise<AppData | null> {
  const raw = await downloadJson<unknown>(token, FILE_NAME)
  if (raw === null) return null
  return validateAppData(raw)
}

/** Save AppData to Drive (full overwrite). */
export async function saveAppData(token: string, data: AppData): Promise<void> {
  await uploadJson(token, FILE_NAME, data)
}

// ---------------------------------------------------------------------------
// Push subscription storage
// ---------------------------------------------------------------------------

export async function getPushSubscription(
  token: string,
): Promise<PushSubscriptionJSON | null> {
  return downloadJson<PushSubscriptionJSON>(token, PUSH_SUB_FILE_NAME)
}

export async function savePushSubscription(
  token: string,
  sub: PushSubscriptionJSON,
): Promise<void> {
  await uploadJson(token, PUSH_SUB_FILE_NAME, sub)
}
