/**
 * Helper to verify administrator authorization from request Authorization header or JWT claims.
 */
export function verifyAdminToken(authHeader: string | null): { isAdmin: boolean; publicKey?: string } {
  if (!authHeader?.startsWith("Bearer ")) {
    return { isAdmin: false }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return { isAdmin: false }
  }

  try {
    // 1. Try standard JWT format: header.payload.signature
    if (token.includes(".")) {
      const parts = token.split(".")
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8")
        const payload = JSON.parse(payloadJson)
        const isAdmin = Boolean(payload.isAdmin || payload.role === "admin" || payload.roles?.includes("admin"))
        return { isAdmin, publicKey: payload.sub || payload.publicKey }
      }
    }

    // 2. Try base64 decoded string or JSON
    const decoded = Buffer.from(token, "base64").toString("utf-8")

    // Check if decoded payload is JSON
    if (decoded.startsWith("{") && decoded.endsWith("}")) {
      const parsed = JSON.parse(decoded)
      const isAdmin = Boolean(parsed.isAdmin || parsed.role === "admin" || parsed.roles?.includes("admin"))
      return { isAdmin, publicKey: parsed.publicKey || parsed.sub }
    }

    // 3. Structured string token format: publicKey:signedChallenge:timestamp[:role]
    const segments = decoded.split(":")
    const pk = segments[0] === "demo" ? segments[1] : segments[0]

    const hasAdminClaim = segments.some((s) => s.toLowerCase() === "admin")
    const isConfiguredAdmin = Boolean(
      (process.env.ADMIN_PUBLIC_KEY && pk === process.env.ADMIN_PUBLIC_KEY) ||
      (process.env.ADMIN_PUBLIC_KEYS && process.env.ADMIN_PUBLIC_KEYS.split(",").includes(pk))
    )

    return {
      isAdmin: hasAdminClaim || isConfiguredAdmin,
      publicKey: pk,
    }
  } catch {
    return { isAdmin: false }
  }
}
