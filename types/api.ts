export type ApiResponse<T> = {
  success: boolean
  data: T | null
  message: {
    en: string
    vi: string
  }
}

export type LoginResponse = {
  user: import("~/types/users").UserPublic
  token: string
}