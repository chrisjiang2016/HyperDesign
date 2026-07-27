import { http } from './http'

export interface AuthUser {
  id: string
  username: string
  role: 'super_admin' | 'sub_admin' | 'employee'
  status: 'active' | 'disabled'
  lastLoginAt?: string | null
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export async function login(payload: { username: string; password: string }) {
  const { data } = await http.post<ApiResponse<AuthUser>>('/auth/login', payload)
  return data.data
}

export async function register(payload: { username: string; confirmUsername: string; password: string }) {
  const { data } = await http.post<ApiResponse<AuthUser>>('/auth/register', payload)
  return data.data
}

export async function getCurrentUser() {
  const { data } = await http.get<ApiResponse<AuthUser>>('/auth/me')
  return data.data
}

export async function logout() {
  await http.post('/auth/logout')
}

export async function resetPassword(username: string) {
  const { data } = await http.post<ApiResponse<{ temporaryPassword: string } | null>>('/auth/reset-password', { username })
  return data.data
}

export async function changePassword(payload: { oldPassword: string; newPassword: string; confirmNewPassword: string }) {
  await http.post('/auth/change-password', payload)
}
