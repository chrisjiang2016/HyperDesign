import { useEffect, useSyncExternalStore } from 'react'
import { getCurrentUser } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { router } from '@/router'

const subscribeToRoute = (notify: () => void) => router.subscribe(notify)
const getPathname = () => router.state.location.pathname

export function AuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser)
  const setHydrated = useAuthStore((state) => state.setHydrated)
  const pathname = useSyncExternalStore(subscribeToRoute, getPathname)
  const isShareRoute = /^\/shares\/[^/]+\/?$/.test(pathname)

  useEffect(() => {
    // Public links must not depend on session recovery. On leaving a share
    // route, bootstrap normally; RequireAuth remains unchanged and enforced.
    if (isShareRoute) return
    setHydrated(false)
    let active = true
    void getCurrentUser()
      .then((user) => active && setUser(user))
      .catch(() => active && setUser(null))
      .finally(() => active && setHydrated(true))
    return () => {
      active = false
    }
  }, [isShareRoute, setHydrated, setUser])

  return null
}
