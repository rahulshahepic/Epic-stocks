import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SignInScreen } from '../../components/Auth/SignInScreen'
import type { GoogleAuthState } from '../../hooks/useGoogleAuth'

function makeAuth(overrides: Partial<GoogleAuthState> = {}): GoogleAuthState {
  return {
    isSignedIn: false,
    accessToken: null,
    userInfo: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    error: null,
    isLoading: false,
    ...overrides,
  }
}

describe('SignInScreen', () => {
  it('renders without crashing', () => {
    render(<SignInScreen auth={makeAuth()} />)
  })

  it('shows app title', () => {
    render(<SignInScreen auth={makeAuth()} />)
    expect(screen.getByText('Stock Tracker')).toBeTruthy()
  })

  it('shows sign-in button', () => {
    render(<SignInScreen auth={makeAuth()} />)
    expect(screen.getByTestId('sign-in-button')).toBeTruthy()
  })

  it('button says "Sign in with Google"', () => {
    render(<SignInScreen auth={makeAuth()} />)
    expect(screen.getByText(/sign in with google/i)).toBeTruthy()
  })

  it('calls auth.signIn when button clicked', () => {
    const signIn = vi.fn()
    render(<SignInScreen auth={makeAuth({ signIn })} />)
    fireEvent.click(screen.getByTestId('sign-in-button'))
    expect(signIn).toHaveBeenCalledOnce()
  })

  it('shows loading text when isLoading is true', () => {
    render(<SignInScreen auth={makeAuth({ isLoading: true })} />)
    expect(screen.getByText(/signing in/i)).toBeTruthy()
  })

  it('button is disabled when loading', () => {
    render(<SignInScreen auth={makeAuth({ isLoading: true })} />)
    const btn = screen.getByTestId('sign-in-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('shows error message when auth.error is set', () => {
    render(<SignInScreen auth={makeAuth({ error: 'Sign-in failed: access_denied' })} />)
    expect(screen.getByText(/access_denied/)).toBeTruthy()
  })

  it('shows privacy notice', () => {
    render(<SignInScreen auth={makeAuth()} />)
    // Use getAllByText since the phrase may match in multiple aria contexts
    expect(screen.getAllByText(/Google Drive/).length).toBeGreaterThan(0)
  })
})
