import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// Register service worker via vite-plugin-pwa (injected at build time)
// In dev mode this is a no-op.
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
