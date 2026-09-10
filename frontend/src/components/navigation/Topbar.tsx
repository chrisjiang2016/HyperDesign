import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BellOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

export interface TopbarProps {
  breadcrumb?: ReactNode
  searchPlaceholder?: string
  showSearch?: boolean
  leftExtra?: ReactNode
  rightExtra?: ReactNode
}

export function Topbar({
  breadcrumb,
  searchPlaceholder = '搜索团队、项目、原型文件',
  showSearch = true,
  leftExtra,
  rightExtra,
}: TopbarProps) {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.username || 'Admin'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'A'

  return (
    <header className="hd-topbar">
      <div className="hd-topbar__left">
        <Link to="/" className="hd-brand">
          <span className="hd-brand__mark">H</span>
          <span className="hd-brand__text">HyperDesign</span>
        </Link>
        {breadcrumb ? <div className="hd-breadcrumb">{breadcrumb}</div> : null}
        {leftExtra}
      </div>

      <div className="hd-topbar__right">
        {showSearch ? (
          <label className="hd-search-inline">
            <SearchOutlined className="hd-search-inline__icon" aria-hidden="true" />
            <input type="search" placeholder={searchPlaceholder} />
          </label>
        ) : null}
        {rightExtra}
        {user?.role === 'super_admin' ? (
          <Link to="/admin/users" className="hd-icon-btn" title="账号管理" aria-label="账号管理" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <UserAddOutlined />
            <span>账号管理</span>
          </Link>
        ) : null}
        <button type="button" className="hd-icon-btn" title="通知" aria-label="通知">
          <BellOutlined />
        </button>
        <Link to="/settings" className="hd-user-entry">
          <span className="hd-avatar-btn">{initial}</span>
          <span className="hd-user-entry__meta">
            <span className="hd-user-entry__name">{displayName}</span>
            <span className="hd-user-entry__role">管理员</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
