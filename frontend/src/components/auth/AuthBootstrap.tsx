import { useEffect } from 'react'
import { getCurrentUser } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

export function AuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser)
  const setHydrated = useAuthStore((state) => state.setHydrated)

  useEffect(() => {
    let active = true
    void getCurrentUser()
      .then((user) => active && setUser(user))
      .catch(() => active && setUser(null))
      .finally(() => active && setHydrated(true))
    return () => {
      active = false
    }
  }, [setHydrated, setUser])

  return null
}
