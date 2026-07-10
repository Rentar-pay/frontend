"use client"

import SignClient from "@walletconnect/sign-client"
import { Web3Modal } from "@walletconnect/modal"
import type { SessionTypes } from "@walletconnect/types"
import * as StellarSdk from "@stellar/stellar-sdk"

// Configuration
const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "testnet"

// Stellar WalletConnect CAIP namespace
const STELLAR_NAMESPACE = {
  chains: [
    NETWORK === "mainnet"
      ? "stellar:mainnet-soroban"
      : "stellar:testnet-soroban"
  ],
  methods: ["stellar_signMessage"],
  events: ["stellar_chainChanged"],
}

interface WCConnection {
  topic: string
  publicKey: string
  session: SessionTypes.Struct
}

let signClient: SignClient | null = null
let web3Modal: Web3Modal | null = null
let wcSession: WCConnection | null = null

/**
 * Validates WalletConnect Project ID is configured
 */
function validateProjectId(): void {
  if (!PROJECT_ID) {
    throw new Error(
      "WalletConnect Project ID not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable."
    )
  }
}

/**
 * Initializes WalletConnect SignClient and Modal
 */
async function initializeSignClient(): Promise<SignClient> {
  if (signClient) return signClient

  validateProjectId()

  signClient = await SignClient.init({
    projectId: PROJECT_ID!,
    metadata: {
      name: "RentarPay",
      description: "Stellar-based rent payment platform",
      url: typeof window !== "undefined" ? window.location.origin : "https://rentarpay.io",
      icons: ["https://rentarpay.io/logo.png"],
    },
  })

  // Initialize Web3Modal for UI
  web3Modal = new Web3Modal({
    projectId: PROJECT_ID!,
    chains: STELLAR_NAMESPACE.chains,
    walletConnectVersion: 2,
  })

  // Subscribe to events
  signClient.on("session_ping", ({ id }) => {
    console.log("WalletConnect ping received:", id)
  })

  signClient.on("session_event", (event) => {
    console.log("WalletConnect event:", event)
  })

  signClient.on("session_delete", () => {
    wcSession = null
    console.log("WalletConnect session deleted")
  })

  return signClient
}

/**
 * Creates a WalletConnect session with a Stellar wallet
 */
async function createSession(): Promise<WCConnection> {
  const client = await initializeSignClient()

  // Generate connection URI
  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      stellar: STELLAR_NAMESPACE,
    },
  })

  if (!uri) {
    throw new Error("Failed to generate WalletConnect connection URI")
  }

  // Open modal with URI
  if (web3Modal) {
    await web3Modal.openModal({ uri })
  }

  // Wait for session approval
  const session = await approval()

  if (!session) {
    throw new Error("WalletConnect session approval failed or was cancelled")
  }

  // Extract Stellar account from session
  const stellarNamespace = session.namespaces?.stellar
  if (!stellarNamespace?.accounts || stellarNamespace.accounts.length === 0) {
    throw new Error("No Stellar accounts found in WalletConnect session")
  }

  // Parse account in format: stellar:<network>:<publicKey>
  const accountString = stellarNamespace.accounts[0]
  const publicKey = accountString.split(":").pop()

  if (!publicKey) {
    throw new Error("Failed to extract public key from WalletConnect session")
  }

  // Validate Stellar public key format
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error(`Invalid Stellar public key format: ${publicKey}`)
  }

  wcSession = {
    topic: session.topic,
    publicKey,
    session,
  }

  return wcSession
}

/**
 * Signs a message using WalletConnect
 * Implements Stellar WalletConnect CAIP for message signing
 */
async function signMessage(message: string): Promise<string> {
  if (!wcSession) {
    throw new Error("No WalletConnect session active. Please connect first.")
  }

  const client = await initializeSignClient()

  // Encode message as base64 per Stellar spec
  const messageB64 = Buffer.from(message).toString("base64")

  try {
    const response = await client.request({
      topic: wcSession.topic,
      chainId: STELLAR_NAMESPACE.chains[0],
      request: {
        method: "stellar_signMessage",
        params: {
          message: messageB64,
        },
      },
    })

    // Response should contain signed message
    if (typeof response === "object" && response !== null && "signature" in response) {
      return (response as any).signature
    }

    if (typeof response === "string") {
      return response
    }

    throw new Error("Invalid signature response from wallet")
  } catch (error: any) {
    throw new Error(`Failed to sign message: ${error.message}`)
  }
}

/**
 * Disconnects WalletConnect session
 */
async function disconnect(): Promise<void> {
  if (!wcSession) return

  const client = await initializeSignClient()

  try {
    await client.disconnect({
      topic: wcSession.topic,
      reason: {
        code: 6000,
        message: "User disconnected",
      },
    })
  } catch (error: any) {
    console.warn("Error disconnecting WalletConnect:", error.message)
  }

  wcSession = null

  if (web3Modal) {
    web3Modal.closeModal()
  }
}

/**
 * Restores session from persistent storage if available
 */
async function restoreSession(): Promise<WCConnection | null> {
  if (wcSession) return wcSession

  const client = await initializeSignClient()

  // Get all active sessions
  const sessions = Object.values(client.session.getAll())

  if (sessions.length === 0) return null

  // Use the most recent session (assumes one active Stellar session)
  const session = sessions[0]
  const stellarNamespace = session.namespaces?.stellar

  if (!stellarNamespace?.accounts || stellarNamespace.accounts.length === 0) {
    return null
  }

  const accountString = stellarNamespace.accounts[0]
  const publicKey = accountString.split(":").pop()

  if (!publicKey) return null

  wcSession = {
    topic: session.topic,
    publicKey,
    session,
  }

  return wcSession
}

/**
 * Returns current session or null
 */
function getSession(): WCConnection | null {
  return wcSession
}

/**
 * Returns current public key or null
 */
function getPublicKey(): string | null {
  return wcSession?.publicKey || null
}

export const walletConnectService = {
  connect: createSession,
  disconnect,
  signMessage,
  getSession,
  getPublicKey,
  restoreSession,
  isInitialized: () => signClient !== null,
}
