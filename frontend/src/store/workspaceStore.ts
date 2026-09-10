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
  /** defaultCollapsed 为该分组在未手动操作时的默认状态，必须传入才能保证首次点击取反正确 */
  toggleGroup: (groupId: string, defaultCollapsed?: boolean) => void
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
  toggleGroup: (groupId, defaultCollapsed = false) => {
    const stored = get().collapsedGroups
    // 未手动设置过时要基于"当前实际显示状态"取反，否则默认折叠的分组首次点击后仍是折叠
    const current = groupId in stored ? stored[groupId] : defaultCollapsed
    const next = {
      ...stored,
      [groupId]: !current,
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
