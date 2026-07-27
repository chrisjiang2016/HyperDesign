import { create } from 'zustand'
import { getNavTeamsProjects, type NavTeam } from '@/api/workspace'

const STORAGE_KEY = 'hyperdesign.nav.collapsed'

function readCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

interface WorkspaceState {
  collapsedGroups: Record<string, boolean>
  rightbarVisible: boolean
  navTeams: NavTeam[]
  navLoading: boolean
  fetchNavTeams: () => Promise<void>
  toggleGroup: (groupId: string) => void
  setGroupCollapsed: (groupId: string, collapsed: boolean) => void
  setRightbarVisible: (visible: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  collapsedGroups: readCollapsed(),
  rightbarVisible: true,
  navTeams: [],
  navLoading: false,
  fetchNavTeams: async () => {
    if (get().navLoading) return
    set({ navLoading: true })
    try {
      set({ navTeams: await getNavTeamsProjects() })
    } catch {
      // 导航请求失败时保留当前缓存，页面级请求仍可正常展示错误状态。
    } finally {
      set({ navLoading: false })
    }
  },
  toggleGroup: (groupId) => {
    const next = {
      ...get().collapsedGroups,
      [groupId]: !get().collapsedGroups[groupId],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    set({ collapsedGroups: next })
  },
  setGroupCollapsed: (groupId, collapsed) => {
    const next = {
      ...get().collapsedGroups,
      [groupId]: collapsed,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    set({ collapsedGroups: next })
  },
  setRightbarVisible: (visible) => set({ rightbarVisible: visible }),
}))
