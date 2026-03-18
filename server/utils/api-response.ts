import type { H3Event } from "h3"
import type { ApiResponse } from "~/types/api"

export type I18nMessage = { en: string; vi: string }

export function ok<T>(data: T, message: I18nMessage): ApiResponse<T> {
  return { success: true, data, message }
}

export function fail(event: H3Event, status: number, message: I18nMessage): ApiResponse<null> {
  setResponseStatus(event, status)
  return { success: false, data: null, message }
}