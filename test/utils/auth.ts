import { signToken } from "../../lib/external/jwt"
import { TEST_USER_IDS } from "../fixtures/data"

export function createTestToken(overrides: { userId: string; vpfId: string; email?: string | null; role?: "user" | "admin" } = { userId: TEST_USER_IDS.VPF000901, vpfId: "VPF000901", email: "athlete1@test.vpf", role: "user" }): string {
  return signToken({
    userId: overrides.userId,
    vpfId: overrides.vpfId,
    email: overrides.email ?? null,
    role: overrides.role ?? "user",
  })
}
