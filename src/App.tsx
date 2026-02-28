import { useState } from 'react'
import { useGoogleAuth } from './hooks/useGoogleAuth'
import { useAppData } from './hooks/useAppData'
import { useNotifications } from './hooks/useNotifications'
import { SignInScreen } from './components/Auth/SignInScreen'
import { Dashboard } from './components/Dashboard/Dashboard'
import { GrantsTab } from './components/Grants/GrantsTab'
import { LoansTab } from './components/Loans/LoansTab'
import { TimelineTab } from './components/Timeline/TimelineTab'
import { SettingsTab } from './components/Settings/SettingsTab'

type Tab = 'dashboard' | 'grants' | 'loans' | 'timeline' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'grants', label: 'Grants', icon: '🎁' },
  { id: 'loans', label: 'Loans', icon: '💰' },
  { id: 'timeline', label: 'Timeline', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function App() {
  const auth = useGoogleAuth()
  const appData = useAppData(auth.accessToken)
  const notifications = useNotifications(appData.data)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  if (!auth.isSignedIn) {
    return <SignInScreen auth={auth} />
  }

  if (appData.status === 'loading') {
    return <LoadingScreen message="Loading your data…" />
  }

  if (appData.status === 'error') {
    return (
      <LoadingScreen
        message={`Error: ${appData.error ?? 'Unknown error'}`}
        retry={appData.reload}
      />
    )
  }

  const data = appData.data
  if (!data) return null

  // First-time user: show import prompt
  if (appData.status === 'empty' && data.grants.length === 0) {
    return (
      <div style={shellStyles.shell}>
        <header style={shellStyles.header}>
          <span style={shellStyles.logo}>📈 Stock Tracker</span>
        </header>
        <div style={shellStyles.emptyState}>
          <h2 style={shellStyles.emptyHeading}>Welcome!</h2>
          <p style={shellStyles.emptyText}>
            No data found. Import your stock information to get started.
          </p>
          <SettingsTab
            data={data}
            onUpdate={appData.updateData}
            onImport={appData.importData}
            notifications={notifications}
            onSignOut={auth.signOut}
            userName={auth.userInfo?.name}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={shellStyles.shell}>
      <header style={shellStyles.header}>
        <span style={shellStyles.logo}>📈 Stock Tracker</span>
        {auth.userInfo && (
          <img
            src={auth.userInfo.picture}
            alt={auth.userInfo.name}
            style={shellStyles.avatar}
            title={auth.userInfo.name}
          />
        )}
      </header>

      <main style={shellStyles.main}>
        {activeTab === 'dashboard' && <Dashboard data={data} />}
        {activeTab === 'grants' && (
          <GrantsTab data={data} onUpdate={appData.updateData} />
        )}
        {activeTab === 'loans' && (
          <LoansTab data={data} onUpdate={appData.updateData} />
        )}
        {activeTab === 'timeline' && <TimelineTab data={data} />}
        {activeTab === 'settings' && (
          <SettingsTab
            data={data}
            onUpdate={appData.updateData}
            onImport={appData.importData}
            notifications={notifications}
            onSignOut={auth.signOut}
            userName={auth.userInfo?.name}
          />
        )}
      </main>

      <nav style={shellStyles.nav} role="navigation" aria-label="Main navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...shellStyles.navBtn,
              ...(activeTab === tab.id ? shellStyles.navBtnActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            data-testid={`nav-${tab.id}`}
          >
            <span style={shellStyles.navIcon}>{tab.icon}</span>
            <span style={shellStyles.navLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function LoadingScreen({
  message,
  retry,
}: {
  message: string
  retry?: () => void
}) {
  return (
    <div style={loadingStyles.container}>
      <p style={loadingStyles.text}>{message}</p>
      {retry && (
        <button style={loadingStyles.btn} onClick={retry}>
          Retry
        </button>
      )}
    </div>
  )
}

const shellStyles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    background: '#16213e',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overscrollBehavior: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    background: '#0f3460',
    borderBottom: '1px solid #1e3a5f',
    flexShrink: 0,
  },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#e2e8f0' },
  avatar: { width: '28px', height: '28px', borderRadius: '50%' },
  main: {
    flex: 1,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
  },
  nav: {
    display: 'flex',
    background: '#0f3460',
    borderTop: '1px solid #1e3a5f',
    flexShrink: 0,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  navBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '0.6rem 0',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'color 0.15s',
  },
  navBtnActive: { color: '#60a5fa' },
  navIcon: { fontSize: '1.25rem' },
  navLabel: { fontSize: '0.65rem', fontWeight: 500 },
  emptyState: { padding: '1rem', maxWidth: '700px', margin: '0 auto' },
  emptyHeading: { color: '#e2e8f0', marginBottom: '0.5rem' },
  emptyText: { color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' },
}

const loadingStyles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#16213e',
    color: '#94a3b8',
    gap: '1rem',
  },
  text: { margin: 0, fontSize: '0.95rem' },
  btn: { background: '#4285f4', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' },
}
