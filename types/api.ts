export type ApiResponse<T> = {
  success: true
  data: T
  message: {
    en: string
    vi: string
  }
} | {
  success: false
  data: null
  message: {
    en: string
    vi: string
  }
}

export type LoginResponse = {
  user: import("~/types/users").UserPublic
  token: string
  emailVerified: boolean
}

export type RegisterResponse = LoginResponse