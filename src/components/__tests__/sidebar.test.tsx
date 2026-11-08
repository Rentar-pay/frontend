import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Sidebar } from "@/components/layout/sidebar"
import * as authContext from "@/contexts/auth-context"
import * as walletContext from "@/contexts/wallet-context"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}))

describe("Sidebar - Admin link role check", () => {
  it("hides the Admin link for standard non-admin users", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: {
        id: "user_regular",
        publicKey: "GREGULARUSER123456789",
        displayName: "Regular User",
        createdAt: new Date().toISOString(),
        kycStatus: "verified",
        isAdmin: false,
      },
      token: "mock-regular-token",
      publicKey: "GREGULARUSER123456789",
      isAuthenticated: true,
      isLoading: false,
      isDemoMode: false,
      login: vi.fn(),
      logout: vi.fn(),
      getChallengeForKey: vi.fn(),
    })

    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      disconnect: vi.fn(),
      connect: vi.fn(),
      isConnected: true,
      publicKey: "GREGULARUSER123456789",
      isLoading: false,
    } as any)

    render(<Sidebar />)

    expect(screen.queryByText("Admin")).not.toBeInTheDocument()
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Wallet")).toBeInTheDocument()
  })

  it("renders the Admin link for users with isAdmin: true", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: {
        id: "user_admin",
        publicKey: "GADMINUSER123456789",
        displayName: "Admin User",
        createdAt: new Date().toISOString(),
        kycStatus: "verified",
        isAdmin: true,
      },
      token: "mock-admin-token",
      publicKey: "GADMINUSER123456789",
      isAuthenticated: true,
      isLoading: false,
      isDemoMode: false,
      login: vi.fn(),
      logout: vi.fn(),
      getChallengeForKey: vi.fn(),
    })

    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      disconnect: vi.fn(),
      connect: vi.fn(),
      isConnected: true,
      publicKey: "GADMINUSER123456789",
      isLoading: false,
    } as any)

    render(<Sidebar />)

    expect(screen.getByText("Admin")).toBeInTheDocument()
  })
})
