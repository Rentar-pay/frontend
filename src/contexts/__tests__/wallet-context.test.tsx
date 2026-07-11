// @ts-nocheck
/**
 * Tests for wallet-context.tsx
 *
 * Covers:
 *   - connectFreighter / connectWalletConnect show a toast on auth failure  (AC #2)
 *   - wallet state (publicKey, walletType) is reset on auth failure
 *   - errors are re-thrown so callers can set their own error state
 *   - disconnect clears state and calls logout
 *
 * Note: vi.mock() factories are hoisted to the top of the file by Vitest,
 * so any variables referenced inside them must be created with vi.hoisted()
 * to avoid temporal dead-zone errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { ReactNode } from "react"

// ---------------------------------------------------------------------------
// Hoisted mock fns — must be declared before vi.mock() factories
// ---------------------------------------------------------------------------
const {
  mockToastError,
  mockToastSuccess,
  mockLogin,
  mockLogout,
  mockGetChallengeForKey,
  mockConnectFreighter,
  mockSignWithFreighter,
  mockIsFreighterInstalled,
  mockWcConnect,
  mockWcSignMessage,
  mockWcDisconnect,
} = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockLogin: vi.fn(),
  mockLogout: vi.fn(),
  mockGetChallengeForKey: vi.fn(),
  mockConnectFreighter: vi.fn(),
  mockSignWithFreighter: vi.fn(),
  mockIsFreighterInstalled: vi.fn(() => true),
  mockWcConnect: vi.fn(),
  mockWcSignMessage: vi.fn(),
  mockWcDisconnect: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: mockLogout,
    getChallengeForKey: mockGetChallengeForKey,
    isDemoMode: false,
  }),
}))

vi.mock("@/lib/wallet/freighter", () => ({
  connectFreighter: (...a: unknown[]) => mockConnectFreighter(...a),
  signWithFreighter: (...a: unknown[]) => mockSignWithFreighter(...a),
  isFreighterInstalled: () => mockIsFreighterInstalled(),
}))

vi.mock("@/lib/wallet/walletconnect", () => ({
  walletConnectService: {
    connect: (...a: unknown[]) => mockWcConnect(...a),
    signMessage: (...a: unknown[]) => mockWcSignMessage(...a),
    disconnect: (...a: unknown[]) => mockWcDisconnect(...a),
  },
}))

// Import AFTER mocks are registered
import { WalletProvider, useWallet } from "@/contexts/wallet-context"

const wrapper = ({ children }: { children: ReactNode }) => (
  <WalletProvider>{children}</WalletProvider>
)

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks()
  mockGetChallengeForKey.mockResolvedValue("challenge-string")
  mockSignWithFreighter.mockResolvedValue("freighter-sig")
  mockWcSignMessage.mockResolvedValue("wc-sig")
})

// ---------------------------------------------------------------------------
// connectFreighter
// ---------------------------------------------------------------------------
describe("connectFreighter", () => {
  it("succeeds: sets publicKey, walletType, and shows success toast", async () => {
    mockConnectFreighter.mockResolvedValueOnce("GFREIGHTER123")
    mockLogin.mockResolvedValueOnce(undefined)

    const { result } = renderHook(useWallet, { wrapper })

    await act(async () => {
      await result.current.connectFreighter()
    })

    expect(result.current.publicKey).toBe("GFREIGHTER123")
    expect(result.current.walletType).toBe("freighter")
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("Freighter")
    )
  })

  it("resets state and shows error toast when login() throws (AC #2)", async () => {
    mockConnectFreighter.mockResolvedValueOnce("GFREIGHTER123")
    mockLogin.mockRejectedValueOnce(new Error("Backend unreachable"))

    const { result } = renderHook(useWallet, { wrapper })

    // Use try/catch so we can assert on toast AFTER the error is caught.
    let thrownError: unknown
    await act(async () => {
      try {
        await result.current.connectFreighter()
      } catch (e) {
        thrownError = e
      }
    })

    expect(thrownError).toBeInstanceOf(Error)
    expect((thrownError as Error).message).toContain("Backend unreachable")
    // publicKey and walletType must be cleared so the user can retry.
    expect(result.current.publicKey).toBeNull()
    expect(result.current.walletType).toBeNull()
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Backend unreachable")
    )
  })

  it("resets state and shows error toast when connectFreighter() itself throws", async () => {
    mockConnectFreighter.mockRejectedValueOnce(
      new Error("Freighter not installed")
    )

    const { result } = renderHook(useWallet, { wrapper })

    await expect(
      act(async () => {
        await result.current.connectFreighter()
      })
    ).rejects.toThrow("Freighter not installed")

    expect(result.current.publicKey).toBeNull()
    expect(result.current.walletType).toBeNull()
    expect(mockToastError).toHaveBeenCalled()
  })

  it("resets isConnecting to false after error", async () => {
    mockConnectFreighter.mockRejectedValueOnce(new Error("oops"))

    const { result } = renderHook(useWallet, { wrapper })

    await expect(
      act(async () => {
        await result.current.connectFreighter()
      })
    ).rejects.toThrow()

    expect(result.current.isConnecting).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// connectWalletConnect
// ---------------------------------------------------------------------------
describe("connectWalletConnect", () => {
  it("succeeds: sets publicKey, walletType, and shows success toast", async () => {
    mockWcConnect.mockResolvedValueOnce({ publicKey: "GWC456" })
    mockLogin.mockResolvedValueOnce(undefined)

    const { result } = renderHook(useWallet, { wrapper })

    await act(async () => {
      await result.current.connectWalletConnect()
    })

    expect(result.current.publicKey).toBe("GWC456")
    expect(result.current.walletType).toBe("walletconnect")
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("WalletConnect")
    )
  })

  it("resets state and shows error toast when login() throws (AC #2)", async () => {
    mockWcConnect.mockResolvedValueOnce({ publicKey: "GWC456" })
    mockLogin.mockRejectedValueOnce(new Error("Auth server 503"))

    const { result } = renderHook(useWallet, { wrapper })

    let thrownError: unknown
    await act(async () => {
      try {
        await result.current.connectWalletConnect()
      } catch (e) {
        thrownError = e
      }
    })

    expect(thrownError).toBeInstanceOf(Error)
    expect((thrownError as Error).message).toContain("Auth server 503")
    expect(result.current.publicKey).toBeNull()
    expect(result.current.walletType).toBeNull()
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("Auth server 503")
    )
  })

  it("re-throws the error so callers can display inline feedback", async () => {
    const originalError = new Error("verify failed")
    mockWcConnect.mockResolvedValueOnce({ publicKey: "GWC456" })
    mockLogin.mockRejectedValueOnce(originalError)

    const { result } = renderHook(useWallet, { wrapper })

    let caught: unknown
    await act(async () => {
      try {
        await result.current.connectWalletConnect()
      } catch (e) {
        caught = e
      }
    })

    expect(caught).toBe(originalError)
  })
})

// ---------------------------------------------------------------------------
// disconnect
// ---------------------------------------------------------------------------
describe("disconnect", () => {
  it("clears state, calls logout, and shows disconnect toast", async () => {
    mockConnectFreighter.mockResolvedValueOnce("GFREIGHTER123")
    mockLogin.mockResolvedValueOnce(undefined)

    const { result } = renderHook(useWallet, { wrapper })
    await act(async () => {
      await result.current.connectFreighter()
    })
    expect(result.current.publicKey).toBe("GFREIGHTER123")

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.publicKey).toBeNull()
    expect(result.current.walletType).toBeNull()
    expect(mockLogout).toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenLastCalledWith("Wallet disconnected")
  })
})

// ---------------------------------------------------------------------------
// signMessage
// ---------------------------------------------------------------------------
describe("signMessage", () => {
  it("delegates to freighter when walletType is freighter", async () => {
    mockConnectFreighter.mockResolvedValueOnce("GFREIGHTER123")
    mockLogin.mockResolvedValueOnce(undefined)
    mockSignWithFreighter.mockResolvedValue("freighter-signed")

    const { result } = renderHook(useWallet, { wrapper })
    await act(async () => {
      await result.current.connectFreighter()
    })

    let signed: string
    await act(async () => {
      signed = await result.current.signMessage("test-message")
    })

    expect(signed!).toBe("freighter-signed")
  })

  it("throws when no wallet is connected", async () => {
    const { result } = renderHook(useWallet, { wrapper })
    await expect(
      act(async () => {
        await result.current.signMessage("test-message")
      })
    ).rejects.toThrow("No wallet connected")
  })
})
