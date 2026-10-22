/** What a national-record certificate prints. */
export type CertificateData = {
  fullName: string
  liftLabel: string
  weight: number
  sex: string | null
  division: string | null
  weightClass: number | null
  meetName: string
  hostDate: string | null | undefined
}
