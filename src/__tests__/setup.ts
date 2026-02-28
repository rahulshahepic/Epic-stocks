import '@testing-library/jest-dom'

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn().mockResolvedValue('granted'),
  },
})

// Mock caches API
const cacheStorage = new Map<string, Map<string, Response>>()
Object.defineProperty(window, 'caches', {
  writable: true,
  value: {
    open: vi.fn().mockImplementation(async (name: string) => {
      if (!cacheStorage.has(name)) {
        cacheStorage.set(name, new Map())
      }
      const store = cacheStorage.get(name)!
      return {
        put: vi.fn().mockImplementation(async (key: string, response: Response) => {
          store.set(key, response)
        }),
        match: vi.fn().mockImplementation(async (key: string) => {
          return store.get(key) ?? undefined
        }),
        delete: vi.fn(),
      }
    }),
  },
})

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    ready: Promise.resolve({
      showNotification: vi.fn().mockResolvedValue(undefined),
      periodicSync: undefined,
    }),
    register: vi.fn(),
  },
})

// Mock ResizeObserver (not implemented in jsdom, required by Recharts)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Suppress console.error in tests
vi.spyOn(console, 'error').mockImplementation(() => {})
