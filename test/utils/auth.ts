import { signToken } from "../../lib/utils/jwt"

export function createTestToken(overrides: { vpfId: string; email?: string | null; role?: "user" | "admin" } = { vpfId: "VPF000901", email: "athlete1@test.vpf", role: "user" }): string {
  return signToken({
    vpfId: overrides.vpfId,
    email: overrides.email ?? null,
    role: overrides.role ?? "user",
  })
}
