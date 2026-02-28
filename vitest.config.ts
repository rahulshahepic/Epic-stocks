import { defineConfig } from 'vitest/config'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // Cast required due to vite version mismatch between vitest's bundled vite
  // and the project's vite — safe to ignore, plugin is compatible at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [(react as any)()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    // Exclude Playwright e2e files from vitest
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        branches: 75,
        // Functions are lower because:
        // - Recharts formatter/tick callbacks require actual layout (not jsdom)
        // - Form submit handlers are covered by E2E tests, not unit tests
        functions: 55,
        statements: 80,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/service-worker.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Auth-dependent hooks require Google API — covered by E2E tests instead
        'src/hooks/useGoogleAuth.ts',
        'src/hooks/useAppData.ts',
        'src/hooks/useNotifications.ts',
        // App shell is auth-gated — covered by E2E tests
        'src/App.tsx',
      ],
    },
  },
})
