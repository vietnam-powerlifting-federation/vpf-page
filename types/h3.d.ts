import type { JwtPayload } from "~/lib/utils/jwt"

declare module "h3" {
  interface H3EventContext {
    user?: JwtPayload | null
  }
}
