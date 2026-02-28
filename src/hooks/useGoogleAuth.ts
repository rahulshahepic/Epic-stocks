import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Google Identity Services — OAuth2 token client
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient
          revoke: (token: string, callback: () => void) => void
        }
      }
    }
  }
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: { type: string; message?: string }) => void
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'

// Injected at build time from VITE_GOOGLE_CLIENT_ID env var.
// Set this in GitHub Actions secrets and in a local .env file (gitignored).
const CLIENT_ID = import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string | undefined

export interface GoogleAuthState {
  isSignedIn: boolean
  accessToken: string | null
  userInfo: { name: string; email: string; picture: string } | null
  signIn: () => void
  signOut: () => void
  error: string | null
  isLoading: boolean
}

export function useGoogleAuth(): GoogleAuthState {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<{
    name: string
    email: string
    picture: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const tokenClientRef = useRef<TokenClient | null>(null)
  const tokenExpiryRef = useRef<number>(0)

  const fetchUserInfo = useCallback(async (token: string) => {
    try {
      const res = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return
      const data = (await res.json()) as {
        name: string
        email: string
        picture: string
      }
      setUserInfo({ name: data.name, email: data.email, picture: data.picture })
    } catch {
      // non-fatal
    }
  }, [])

  const handleTokenResponse = useCallback(
    (response: TokenResponse) => {
      setIsLoading(false)
      if (response.error) {
        setError(`Sign-in error: ${response.error}`)
        return
      }
      setAccessToken(response.access_token)
      tokenExpiryRef.current = Date.now() + response.expires_in * 1000
      setError(null)
      void fetchUserInfo(response.access_token)
    },
    [fetchUserInfo],
  )

  // Initialise token client once GIS script is ready
  useEffect(() => {
    if (!CLIENT_ID) {
      setError('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID.')
      return
    }

    const initClient = () => {
      if (!window.google) return
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: handleTokenResponse,
        error_callback: (err) => {
          setIsLoading(false)
          setError(`Auth error: ${err.type} — ${err.message ?? ''}`)
        },
      })
    }

    if (window.google) {
      initClient()
    } else {
      // GIS script loads async; poll until ready
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval)
          initClient()
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [handleTokenResponse])

  // Auto-refresh token 5 minutes before expiry
  useEffect(() => {
    if (!accessToken) return
    const refreshIn = tokenExpiryRef.current - Date.now() - 5 * 60 * 1000
    if (refreshIn <= 0) return
    const timer = setTimeout(() => {
      tokenClientRef.current?.requestAccessToken({ prompt: '' })
    }, refreshIn)
    return () => clearTimeout(timer)
  }, [accessToken])

  const signIn = useCallback(() => {
    if (!tokenClientRef.current) {
      setError('Google auth not ready yet. Please try again.')
      return
    }
    setIsLoading(true)
    setError(null)
    tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
  }, [])

  const signOut = useCallback(() => {
    if (accessToken && window.google) {
      window.google.accounts.oauth2.revoke(accessToken, () => {})
    }
    setAccessToken(null)
    setUserInfo(null)
  }, [accessToken])

  return {
    isSignedIn: !!accessToken,
    accessToken,
    userInfo,
    signIn,
    signOut,
    error,
    isLoading,
  }
}
