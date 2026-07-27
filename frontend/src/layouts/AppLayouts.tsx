import type { ReactNode } from 'react'
import { Topbar } from '@/components/navigation/Topbar'
import { NavTree } from '@/components/navigation/NavTree'
import { RightPanel } from '@/components/workspace/RightPanel'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="hd-auth-shell">
      <div className="hd-auth-shell__content">
        <div className="hd-auth-card-wrap">{children}</div>
      </div>
    </div>
  )
}

interface AppShellLayoutProps {
  children: ReactNode
  breadcrumb?: ReactNode
  rightbar?: ReactNode
  showRightbar?: boolean
  showSearch?: boolean
  searchPlaceholder?: string
  sidebarExtra?: ReactNode
  topbarRightExtra?: ReactNode
}

export function AppShellLayout({
  children,
  breadcrumb,
  rightbar,
  showRightbar = true,
  showSearch = true,
  searchPlaceholder,
  sidebarExtra,
  topbarRightExtra,
}: AppShellLayoutProps) {
  return (
    <div className="hd-app-shell">
      <Topbar
        breadcrumb={breadcrumb}
        showSearch={showSearch}
        searchPlaceholder={searchPlaceholder}
        rightExtra={topbarRightExtra}
      />
      <div className={`hd-workspace${showRightbar ? '' : ' hd-workspace--no-right'}`}>
        <aside className="hd-sidebar">
          {sidebarExtra}
          <NavTree />
        </aside>
        <main className="hd-main">{children}</main>
        {showRightbar ? rightbar ?? <RightPanel /> : null}
      </div>
    </div>
  )
}

/** @deprecated 兼容旧命名，内部已切到 AppShellLayout */
export function MainLayout(props: AppShellLayoutProps) {
  return <AppShellLayout {...props} />
}

interface ViewerShellLayoutProps {
  children: ReactNode
  topbar: ReactNode
  leftSidebar?: ReactNode
  rightSidebar?: ReactNode
  leftCollapsed?: boolean
  rightCollapsed?: boolean
}

export function ViewerShellLayout({
  children,
  topbar,
  leftSidebar,
  rightSidebar,
  leftCollapsed = false,
  rightCollapsed = false,
}: ViewerShellLayoutProps) {
  const workspaceClass = [
    'hd-viewer-workspace',
    leftCollapsed ? 'is-left-collapsed' : '',
    rightCollapsed ? 'is-right-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="hd-viewer-shell">
      {topbar}
      <div className={workspaceClass}>
        <aside className="hd-viewer-sidebar hd-viewer-sidebar--left">{leftSidebar}</aside>
        <main className="hd-viewer-main">{children}</main>
        <aside className="hd-viewer-sidebar hd-viewer-sidebar--right">{rightSidebar}</aside>
      </div>
    </div>
  )
}
