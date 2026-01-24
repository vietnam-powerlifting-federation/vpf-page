import type { Attempt } from "./attempts"
import type { MeetPublic } from "./meets"
import type { UserPublic } from "./users"

export type Record = Attempt | Pick<UserPublic, "vpfId"> & Pick<MeetPublic, "meetId"> & {
  lift: "total"
  weight: number | null
}