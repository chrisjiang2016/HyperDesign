import { http } from './http'

export type AdminUser = {
  id: string
  username: string
  role: 'super_admin' | 'sub_admin' | 'employee'
  status: 'active' | 'disabled'
  lastLoginAt?: string | null
  createdAt?: string
}

type ApiResponse<T> = { success: boolean; data: T; message: string }

export async function listUsers() {
  return (await http.get<ApiResponse<AdminUser[]>>('/admin/users')).data.data
}

export async function createUser(payload: { username: string; password: string; role?: AdminUser['role']; status?: AdminUser['status'] }) {
  return (await http.post<ApiResponse<AdminUser>>('/admin/users', payload)).data.data
}

export async function updateUser(id: string, payload: { role?: AdminUser['role']; status?: AdminUser['status']; password?: string }) {
  return (await http.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, payload)).data.data
}

export async function deleteUser(id: string) {
  return (await http.delete<ApiResponse<null>>(`/admin/users/${id}`)).data.data
}
