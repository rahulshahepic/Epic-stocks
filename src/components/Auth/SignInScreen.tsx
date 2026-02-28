import type { GoogleAuthState } from '../../hooks/useGoogleAuth'

interface Props {
  auth: GoogleAuthState
}

export function SignInScreen({ auth }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>📈</div>
        <h1 style={styles.title}>Stock Tracker</h1>
        <p style={styles.subtitle}>
          Track grants, loans, vesting, and events — synced privately via
          Google Drive.
        </p>

        {auth.error && <p style={styles.error}>{auth.error}</p>}

        <button
          onClick={auth.signIn}
          disabled={auth.isLoading}
          style={styles.button}
          data-testid="sign-in-button"
        >
          {auth.isLoading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        <p style={styles.privacy}>
          Your data is stored privately in your own Google Drive — visible only
          to you, never shared.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    padding: '1rem',
  },
  card: {
    background: '#0f3460',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    maxWidth: '380px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    color: '#e2e8f0',
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: '0 0 0.5rem',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    margin: '0 0 1.5rem',
  },
  button: {
    background: '#4285f4',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.15s',
  },
  error: {
    color: '#f87171',
    background: 'rgba(239,68,68,0.1)',
    borderRadius: '6px',
    padding: '0.6rem 0.8rem',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  privacy: {
    color: '#64748b',
    fontSize: '0.8rem',
    marginTop: '1rem',
    lineHeight: 1.5,
  },
}
