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

  return NextResponse.json({
    totalUsers: 1248,
    totalSaved: 2_450_000,
    totalTransactions: 8943,
    activeGoals: 892,
  })
}
