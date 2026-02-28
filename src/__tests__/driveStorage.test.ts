import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  findFileId,
  getAppData,
  saveAppData,
  validateAppData,
  AppDataSchema,
} from '../lib/driveStorage'
import { emptyAppData } from '../lib/compute'

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const TOKEN = 'test-access-token'

function makeFileListResponse(files: { id: string; name: string }[]) {
  return new Response(JSON.stringify({ files }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDataResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeErrorResponse(status: number, text = 'Error') {
  return new Response(text, { status })
}

const VALID_DATA = {
  ...emptyAppData(),
  currentPrice: 2.5,
  asOfDate: '2025-07-15',
}

beforeEach(() => {
  mockFetch.mockReset()
})

// ---------------------------------------------------------------------------
// findFileId
// ---------------------------------------------------------------------------

describe('findFileId', () => {
  it('returns file ID when file exists', async () => {
    mockFetch.mockResolvedValueOnce(
      makeFileListResponse([{ id: 'file-abc', name: 'stock-tracker-v1.json' }]),
    )
    const id = await findFileId(TOKEN, 'stock-tracker-v1.json')
    expect(id).toBe('file-abc')
  })

  it('returns null when no file found', async () => {
    mockFetch.mockResolvedValueOnce(makeFileListResponse([]))
    const id = await findFileId(TOKEN, 'stock-tracker-v1.json')
    expect(id).toBeNull()
  })

  it('throws DriveError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(403, 'Forbidden'))
    await expect(findFileId(TOKEN, 'any.json')).rejects.toThrow('Failed to list Drive files')
  })

  it('sends Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(makeFileListResponse([]))
    await findFileId(TOKEN, 'file.json')
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(callArgs[1]?.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` })
  })
})

// ---------------------------------------------------------------------------
// getAppData
// ---------------------------------------------------------------------------

describe('getAppData', () => {
  it('returns null when no file exists', async () => {
    // findFileId: empty list
    mockFetch.mockResolvedValueOnce(makeFileListResponse([]))
    const result = await getAppData(TOKEN)
    expect(result).toBeNull()
  })

  it('returns parsed AppData when file exists', async () => {
    mockFetch
      .mockResolvedValueOnce(makeFileListResponse([{ id: 'f1', name: 'stock-tracker-v1.json' }]))
      .mockResolvedValueOnce(makeDataResponse(VALID_DATA))
    const result = await getAppData(TOKEN)
    expect(result?.currentPrice).toBe(2.5)
  })

  it('throws DriveError when download fails', async () => {
    mockFetch
      .mockResolvedValueOnce(makeFileListResponse([{ id: 'f1', name: 'stock-tracker-v1.json' }]))
      .mockResolvedValueOnce(makeErrorResponse(500))
    await expect(getAppData(TOKEN)).rejects.toThrow('Failed to download')
  })

  it('throws DriveError on malformed JSON', async () => {
    mockFetch
      .mockResolvedValueOnce(makeFileListResponse([{ id: 'f1', name: 'stock-tracker-v1.json' }]))
      .mockResolvedValueOnce(
        new Response('not json', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
    await expect(getAppData(TOKEN)).rejects.toThrow('invalid JSON')
  })
})

// ---------------------------------------------------------------------------
// saveAppData
// ---------------------------------------------------------------------------

describe('saveAppData', () => {
  it('issues PATCH when file already exists', async () => {
    // findFileId → file found
    mockFetch
      .mockResolvedValueOnce(makeFileListResponse([{ id: 'f1', name: 'stock-tracker-v1.json' }]))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await saveAppData(TOKEN, VALID_DATA)
    const patchCall = mockFetch.mock.calls[1] as [string, RequestInit]
    expect(patchCall[1]?.method).toBe('PATCH')
  })

  it('issues POST when file does not exist', async () => {
    // findFileId → no file
    mockFetch
      .mockResolvedValueOnce(makeFileListResponse([]))
      .mockResolvedValueOnce(new Response('{"id":"new"}', { status: 200 }))

    await saveAppData(TOKEN, VALID_DATA)
    const postCall = mockFetch.mock.calls[1] as [string, RequestInit]
    expect(postCall[1]?.method).toBe('POST')
  })

  it('throws DriveError when save fails', async () => {
    mockFetch
      .mockResolvedValueOnce(makeFileListResponse([{ id: 'f1', name: 'stock-tracker-v1.json' }]))
      .mockResolvedValueOnce(makeErrorResponse(503))
    await expect(saveAppData(TOKEN, VALID_DATA)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validateAppData
// ---------------------------------------------------------------------------

describe('validateAppData', () => {
  it('validates correct data without throwing', () => {
    expect(() => validateAppData(VALID_DATA)).not.toThrow()
  })

  it('throws ZodError when required fields are missing', () => {
    expect(() => validateAppData({ currentPrice: 'not-a-number' })).toThrow()
  })

  it('throws on empty object', () => {
    expect(() => validateAppData({})).toThrow()
  })

  it('coerces schemaVersion from missing to 1', () => {
    const data = validateAppData({ ...VALID_DATA, schemaVersion: undefined })
    expect(data.schemaVersion).toBe(1)
  })

  it('accepts optional notificationPreference', () => {
    const data = validateAppData({ ...VALID_DATA, notificationPreference: 'granted' })
    expect(data.notificationPreference).toBe('granted')
  })
})

// ---------------------------------------------------------------------------
// AppDataSchema
// ---------------------------------------------------------------------------

describe('AppDataSchema', () => {
  it('rejects negative currentPrice', () => {
    const result = AppDataSchema.safeParse({ ...VALID_DATA, currentPrice: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid grant type', () => {
    const result = AppDataSchema.safeParse({
      ...VALID_DATA,
      grants: [
        {
          id: 'g1',
          year: 2020,
          type: 'InvalidType',
          shares: 100,
          price: 2.0,
          vestStart: '2021-01-01',
          vestPeriods: 5,
          passedPeriods: 0,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects rate > 1 (e.g. 3.7 instead of 0.037)', () => {
    const result = AppDataSchema.safeParse({
      ...VALID_DATA,
      ratesByYear: [{ year: 2022, rate: 3.7 }],
    })
    expect(result.success).toBe(false)
  })
})
