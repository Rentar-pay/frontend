import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { verifyAdminToken } from "@/lib/auth/admin-guard"
import { GET as getStats } from "@/app/api/admin/stats/route"
import { GET as getUsers } from "@/app/api/admin/users/route"
import { NextRequest } from "next/server"

describe("Admin Authorization Guard & API Protection", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_PUBLIC_KEY: "GADMIN_STELLAR_KEY_12345" }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("verifyAdminToken unit verification", () => {
    it("rejects missing or non-Bearer authorization headers", () => {
      expect(verifyAdminToken(null).isAdmin).toBe(false)
      expect(verifyAdminToken("").isAdmin).toBe(false)
      expect(verifyAdminToken("Basic 12345").isAdmin).toBe(false)
    })

    it("rejects standard user tokens without admin claims", () => {
      const userToken = Buffer.from("GUSER12345:challenge:1600000000").toString("base64")
      expect(verifyAdminToken(`Bearer ${userToken}`).isAdmin).toBe(false)
    })

    it("accepts tokens bearing admin role claim", () => {
      const adminToken = Buffer.from("GUSER12345:challenge:1600000000:admin").toString("base64")
      expect(verifyAdminToken(`Bearer ${adminToken}`).isAdmin).toBe(true)
    })

    it("accepts tokens issued for designated ADMIN_PUBLIC_KEY", () => {
      const adminKeyToken = Buffer.from("GADMIN_STELLAR_KEY_12345:challenge:1600000000").toString("base64")
      expect(verifyAdminToken(`Bearer ${adminKeyToken}`).isAdmin).toBe(true)
    })
  })

  describe("Server-Side API Route Protection (/api/admin/*)", () => {
    it("returns 403 Forbidden for /api/admin/stats when unauthenticated", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/stats")
      const res = await getStats(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.message).toMatch(/administrator/i)
    })

    it("returns 403 Forbidden for /api/admin/stats with non-admin bearer token", async () => {
      const userToken = Buffer.from("GREGULAR_USER:sig:16000000").toString("base64")
      const req = new NextRequest("http://localhost:3000/api/admin/stats", {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      const res = await getStats(req)
      expect(res.status).toBe(403)
    })

    it("returns 200 OK with metrics for /api/admin/stats when authorized as admin", async () => {
      const adminToken = Buffer.from("GUSER:sig:16000000:admin").toString("base64")
      const req = new NextRequest("http://localhost:3000/api/admin/stats", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const res = await getStats(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.totalUsers).toBeGreaterThan(0)
      expect(data.totalSaved).toBeGreaterThan(0)
    })

    it("returns 403 Forbidden for /api/admin/users when unauthorized", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users")
      const res = await getUsers(req)
      expect(res.status).toBe(403)
    })

    it("returns 200 OK with user list for /api/admin/users when authorized as admin", async () => {
      const adminToken = Buffer.from("GUSER:sig:16000000:admin").toString("base64")
      const req = new NextRequest("http://localhost:3000/api/admin/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const res = await getUsers(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(20)
    })
  })
})
