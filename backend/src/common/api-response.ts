export interface ApiSuccess<T> {
  success: true
  data: T
  message: string
}

export function ok<T>(data: T, message = 'ok'): ApiSuccess<T> {
  return { success: true, data, message }
}
