import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/auth/admin-guard"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const { isAdmin } = verifyAdminToken(authHeader)

  if (!isAdmin) {
    return NextResponse.json(
      { message: "Forbidden: Administrator privileges required" },
      { status: 403 }
    )
  }

  return NextResponse.json(
    Array.from({ length: 20 }, (_, i) => ({
      id: `user_${i}`,
      publicKey: `G${Math.random().toString(36).substring(2).toUpperCase()}...`,
      displayName: `User ${i + 1}`,
      email: `user${i + 1}@rentar.demo`,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      kycStatus: i % 3 === 0 ? "verified" : i % 3 === 1 ? "pending" : "unverified",
    }))
  )
}
