import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PageLoading } from '@/components/common/pagestates'

export function RequireAuth({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((state) => state.hydrated)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!hydrated) return <PageLoading label="正在恢复登录会话" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}
