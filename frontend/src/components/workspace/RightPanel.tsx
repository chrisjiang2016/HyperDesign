import type { ReactNode } from 'react'

export interface ActivityItemData {
  id: string
  title: string
  summary: string
}

const defaultActivities: ActivityItemData[] = [
  {
    id: 'act-1',
    title: '首页改版方案 V2.0 收到新评论',
    summary: '张三在原型预览页中新增 2 条研发实现反馈 · 10 分钟前',
  },
  {
    id: 'act-2',
    title: '电商平台改版项目新增 ZIP 包',
    summary: 'Admin 上传了新的高保真 HTML 原型，已完成页面目录识别 · 38 分钟前',
  },
  {
    id: 'act-3',
    title: 'CRM 系统升级进入待评审',
    summary: '产品设计团队已同步最新页面结构，等待研发确认 · 2 小时前',
  },
]

export interface RightPanelProps {
  title?: string
  activities?: ActivityItemData[]
  children?: ReactNode
  footer?: ReactNode
}

export function RightPanel({
  title = '最近活动',
  activities = defaultActivities,
  children,
  footer,
}: RightPanelProps) {
  return (
    <aside className="hd-rightbar">
      {children ? (
        children
      ) : (
        <div className="hd-rightbar-section">
          <div className="hd-rightbar-title">{title}</div>
          <div className="hd-activity-list">
            {activities.map((item) => (
              <div key={item.id} className="hd-activity-card">
                <div className="hd-activity-item">
                  <div className="hd-activity-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {footer ? <div className="hd-rightbar-footer">{footer}</div> : null}
    </aside>
  )
}
