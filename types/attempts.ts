import type { UserPublic } from "./users"
import type { MeetPublic } from "./meets"

export type Attempt = Pick<UserPublic, "vpfId"> & Pick<MeetPublic, "meetId"> & {
  lift: "squat" | "bench" | "deadlift"
  attempt: 1 | 2 | 3
  weight: number | null
}