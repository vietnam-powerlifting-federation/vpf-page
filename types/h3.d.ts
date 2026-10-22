import type { JwtPayload } from "~/lib/external/jwt"

declare module "h3" {
  interface H3EventContext {
    user?: JwtPayload | null
  }
}
