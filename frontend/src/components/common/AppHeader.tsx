import { Link, useLocation } from 'react-router-dom'
import { Layout, Avatar, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'

const { Header } = Layout
const { Text } = Typography

interface AppHeaderProps {
  showNav?: boolean
  breadcrumb?: ReactNode
}

const navItems = [
  { label: '我的团队', to: '/' },
  { label: '个人设置', to: '/settings' },
]

export function AppHeader({ showNav = true, breadcrumb }: AppHeaderProps) {
  const location = useLocation()
  const username = useAuthStore((state) => state.user?.username)

  return (
    <Header className="app-header">
      <div className="app-header__left">
        <div className="app-header__brand-wrap">
          <Link to="/" className="brand">
            <span className="brand__icon">📐</span>
            <span className="brand__text">HTML 原型分享平台</span>
          </Link>
          {breadcrumb ? <div className="app-header__breadcrumb">{breadcrumb}</div> : null}
        </div>

        {showNav ? (
          <nav className="main-nav">
            {navItems.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`main-nav__item${active ? ' is-active' : ''}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        ) : null}
      </div>

      <Link to="/settings" className="user-entry">
        <Avatar size={36} icon={<UserOutlined />} />
        <Text>{username || '未登录用户'}</Text>
      </Link>
    </Header>
  )
}
