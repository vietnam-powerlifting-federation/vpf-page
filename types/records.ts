import type { Attempt } from "./attempts"

export type Record = Attempt | {
  lift: "total"
  weight: number | null
}