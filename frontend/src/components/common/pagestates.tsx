import type { ReactNode } from 'react'
import { Button, Empty, Result, Spin } from 'antd'
import { ExclamationCircleOutlined, FileSearchOutlined, InboxOutlined } from '@ant-design/icons'

interface StateAction {
  label: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

interface PageStateProps {
  title: string
  description?: string
  action?: StateAction
  className?: string
}

export function PageLoading({ label = '正在加载数据' }: { label?: string }) {
  return (
    <div className="hd-state hd-state--loading" role="status" aria-live="polite" aria-busy="true">
      <Spin size="large" />
      <span>{label}</span>
    </div>
  )
}

export function PageError({ title, description, action, className }: PageStateProps) {
  return (
    <Result
      className={`hd-state hd-state--error${className ? ` ${className}` : ''}`}
      status="error"
      icon={<ExclamationCircleOutlined />}
      title={title}
      subTitle={description}
      extra={action ? <Button type="primary" className="hd-btn-primary" onClick={action.onClick} disabled={action.disabled} loading={action.loading}>{action.label}</Button> : undefined}
      role="alert"
    />
  )
}

interface PageEmptyProps extends PageStateProps {
  variant?: 'default' | 'files'
  children?: ReactNode
}

export function PageEmpty({ title, description, action, variant = 'default', className, children }: PageEmptyProps) {
  const image = variant === 'files' ? <InboxOutlined /> : <FileSearchOutlined />

  return (
    <Empty
      className={`hd-state hd-state--empty${className ? ` ${className}` : ''}`}
      image={image}
      imageStyle={{ height: 44 }}
      description={<span><strong>{title}</strong>{description ? <small>{description}</small> : null}</span>}
    >
      {action ? <Button type="primary" className="hd-btn-primary" onClick={action.onClick} disabled={action.disabled} loading={action.loading}>{action.label}</Button> : null}
      {children}
    </Empty>
  )
}
