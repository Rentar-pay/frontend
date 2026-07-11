import { NextRequest, NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// Mock /api/auth/verify
//
// This is the Next.js mock backend used in local development.
// In a production deployment this route is replaced by the real Rentar
// Backend service which performs actual SEP-10 signature verification.
//
// When NEXT_PUBLIC_DEMO_MODE is NOT set the mock still issues a token so
// the local dev experience works out of the box.  A real backend would
// reject an unsigned or improperly signed challenge here.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { publicKey, signedChallenge } = body

  if (!publicKey || !signedChallenge) {
    return NextResponse.json(
      { message: "Missing required fields: publicKey and signedChallenge" },
      { status: 400 }
    )
  }

  // Minimal validation: signedChallenge must be a non-empty string.
  // A real backend would verify the Stellar signature against the public key.
  if (typeof signedChallenge !== "string" || signedChallenge.trim() === "") {
    return NextResponse.json(
      { message: "Invalid signed challenge" },
      { status: 422 }
    )
  }

  const token = Buffer.from(
    `${publicKey}:${signedChallenge}:${Date.now()}`
  ).toString("base64")

  return NextResponse.json({
    token,
    user: {
      id: `user_${publicKey.slice(0, 8)}`,
      publicKey,
      displayName: `Stellar User ${publicKey.slice(0, 6)}`,
      email: `${publicKey.slice(0, 8).toLowerCase()}@rentar.demo`,
      createdAt: new Date().toISOString(),
      kycStatus: "verified",
    },
  })
}
