import { create } from 'zustand'
import type { AuthUser } from '@/api/auth'

interface AuthState {
  user: AuthUser | null
  hydrated: boolean
  setUser: (user: AuthUser | null) => void
  setHydrated: (hydrated: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  logout: () => set({ user: null, hydrated: true }),
}))
