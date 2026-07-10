"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { authService } from "@/lib/api/services"
import type { UserProfile } from "@/lib/api/client"
import { buildSep10Challenge } from "@/lib/wallet/stellar"

// ---------------------------------------------------------------------------
// Demo mode — opt-in via NEXT_PUBLIC_DEMO_MODE=true
//
// When enabled the login function generates a local mock session instead of
// calling the real backend.  This is intentional and explicit: it is never
// used as a silent fallback.
// ---------------------------------------------------------------------------
export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE?.toLowerCase() === "true"

/** Build a deterministic mock session for demo/offline development. */
function buildDemoSession(pk: string, signedMessage: string) {
  const mockToken = btoa(`demo:${pk}:${signedMessage}:${Date.now()}`)
  const mockUser: UserProfile = {
    id: `user_${pk.slice(0, 8)}`,
    publicKey: pk,
    displayName: `Demo User ${pk.slice(0, 6)}`,
    email: `${pk.slice(0, 8).toLowerCase()}@rentar.demo`,
    createdAt: new Date().toISOString(),
    kycStatus: "verified",
  }
  return { token: mockToken, user: mockUser }
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------
interface AuthContextType {
  user: UserProfile | null
  token: string | null
  publicKey: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isDemoMode: boolean
  login: (publicKey: string, signedMessage: string) => Promise<void>
  logout: () => void
  getChallengeForKey: (publicKey: string) => Promise<string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Rehydrate session from localStorage on mount.
  useEffect(() => {
    const storedToken = localStorage.getItem("rentar_token")
    const storedKey = localStorage.getItem("rentar_publicKey")
    const storedUser = localStorage.getItem("rentar_user")

    if (storedToken && storedKey) {
      setToken(storedToken)
      setPublicKey(storedKey)
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          // Stored JSON is malformed — clear it and force re-login.
          logout()
        }
      }

      // Validate the stored token against the backend (skip in demo mode).
      if (isDemoMode) {
        setIsLoading(false)
      } else {
        authService
          .me()
          .then(setUser)
          .catch(() => {
            // Token is stale or invalid — clear the session so the user is
            // prompted to re-authenticate instead of silently staying logged in.
            logout()
          })
          .finally(() => setIsLoading(false))
      }
    } else {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // getChallengeForKey
  // In demo mode we build a local challenge; otherwise we always ask the API.
  // ---------------------------------------------------------------------------
  const getChallengeForKey = async (pk: string): Promise<string> => {
    if (isDemoMode) {
      // Intentional demo shortcut — caller knows they opted in.
      return buildSep10Challenge(pk)
    }
    // Let the error propagate so the wallet connect flow can show a toast.
    const res = await authService.getChallenge(pk)
    return res.challenge
  }

  // ---------------------------------------------------------------------------
  // login
  //
  // In REAL mode   → calls authService.verify and propagates any error.
  //                  Callers (wallet-context) are responsible for showing
  //                  user-facing feedback (toast).
  // In DEMO mode   → builds a local mock session; never calls the backend.
  //                  This is only enabled when NEXT_PUBLIC_DEMO_MODE=true.
  // ---------------------------------------------------------------------------
  const login = async (pk: string, signedMessage: string): Promise<void> => {
    if (isDemoMode) {
      const { token: demoToken, user: demoUser } = buildDemoSession(pk, signedMessage)
      setToken(demoToken)
      setUser(demoUser)
      setPublicKey(pk)
      localStorage.setItem("rentar_token", demoToken)
      localStorage.setItem("rentar_publicKey", pk)
      localStorage.setItem("rentar_user", JSON.stringify(demoUser))
      return
    }

    // Real auth — let the error propagate; no silent fallback.
    const res = await authService.verify(pk, signedMessage)
    setToken(res.token)
    setUser(res.user)
    setPublicKey(pk)
    localStorage.setItem("rentar_token", res.token)
    localStorage.setItem("rentar_publicKey", pk)
    localStorage.setItem("rentar_user", JSON.stringify(res.user))
  }

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------
  const logout = () => {
    setToken(null)
    setUser(null)
    setPublicKey(null)
    localStorage.removeItem("rentar_token")
    localStorage.removeItem("rentar_publicKey")
    localStorage.removeItem("rentar_user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        publicKey,
        isAuthenticated: !!token && !!publicKey,
        isLoading,
        isDemoMode,
        login,
        logout,
        getChallengeForKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
