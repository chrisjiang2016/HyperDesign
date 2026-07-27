export interface TeamSummary {
  id: string
  name: string
  description: string
  icon: string
  roleLabel: '管理员' | '成员'
  memberCount: number
  projectCount: number
  /** Extra metric line, e.g. "26 条反馈" */
  extraStat: string
  color: string
}

export interface TeamProjectSummary {
  id: string
  name: string
  description: string
  fileCount: number
  updatedAt: string
}

export interface TeamMemberSummary {
  id: string
  name: string
  email: string
  initials: string
  role: '管理员' | '成员'
}

export interface PrototypeFileSummary {
  id: string
  name: string
  updatedAt: string
  pageCount: number
}

export interface PrototypeFolderSummary {
  id: string
  name: string
  fileCount: number
  files: PrototypeFileSummary[]
}

export interface ProjectDetailSummary {
  id: string
  teamId: string
  name: string
  description: string
  folders: PrototypeFolderSummary[]
  rootFiles: PrototypeFileSummary[]
}

export interface WorkspaceSummaryCard {
  id: string
  label: string
  value: number | string
  metaPrimary: string
  metaSecondary?: string
  tone?: 'success' | 'warning' | 'neutral'
}

export interface WorkspaceActivityItem {
  id: string
  title: string
  summary: string
}

export const mockTeams: TeamSummary[] = [
  {
    id: 'team-1',
    name: '产品设计团队',
    description:
      '负责产品原型设计、评审协同与研发交付，当前重点项目为电商平台改版与 CRM 系统升级。',
    icon: '📐',
    roleLabel: '管理员',
    memberCount: 12,
    projectCount: 8,
    extraStat: '26 条反馈',
    color: '#6366f1',
  },
  {
    id: 'team-2',
    name: '技术研发团队',
    description:
      '重点跟进原型实现、样式还原与前端联调，当前有多个高保真原型等待研发评估。',
    icon: '🛠',
    roleLabel: '成员',
    memberCount: 25,
    projectCount: 15,
    extraStat: '9 个联调中',
    color: '#10b981',
  },
  {
    id: 'team-3',
    name: 'UI / UX 设计组',
    description: '沉淀视觉规范、体验评审与设计协作，支持原型方案的视觉打磨和设计验收。',
    icon: '🎨',
    roleLabel: '成员',
    memberCount: 8,
    projectCount: 20,
    extraStat: '5 个视觉升级',
    color: '#f59e0b',
  },
  {
    id: 'team-4',
    name: '数据分析协作组',
    description: '负责数据看板、大屏可视化和业务分析类原型，强调数据逻辑与展示表现的统一。',
    icon: '📊',
    roleLabel: '成员',
    memberCount: 6,
    projectCount: 4,
    extraStat: '3 个大屏方案',
    color: '#2563eb',
  },
]

export const mockWorkspaceSummary: WorkspaceSummaryCard[] = [
  {
    id: 's1',
    label: '我参与的团队',
    value: 3,
    metaPrimary: '较上周 +1',
    metaSecondary: '新增协作团队',
    tone: 'success',
  },
  {
    id: 's2',
    label: '进行中项目',
    value: 11,
    metaPrimary: '本周 +2',
    metaSecondary: '新增原型项目',
    tone: 'success',
  },
  {
    id: 's3',
    label: '待评审原型',
    value: 18,
    metaPrimary: '6 个待研发确认',
    tone: 'warning',
  },
  {
    id: 's4',
    label: '评论与反馈',
    value: 46,
    metaPrimary: '今日新增 9 条评审意见',
    tone: 'neutral',
  },
]

export const mockWorkspaceActivities: WorkspaceActivityItem[] = [
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

export const mockTeamProjects: Record<string, TeamProjectSummary[]> = {
  'team-1': [
    { id: 'project-1', name: '电商平台改版', description: '移动端购物体验优化', fileCount: 15, updatedAt: '2 天前更新' },
    { id: 'project-2', name: '客户管理系统', description: 'CRM 系统原型设计', fileCount: 8, updatedAt: '5 天前更新' },
    { id: 'project-3', name: '数据可视化大屏', description: '运营数据实时展示', fileCount: 6, updatedAt: '1 周前更新' },
    { id: 'project-4', name: '移动端 APP V3.0', description: '新版本交互设计', fileCount: 23, updatedAt: '3 天前更新' },
  ],
  'team-2': [
    { id: 'project-5', name: '组件库升级', description: '统一 B 端视觉规范', fileCount: 11, updatedAt: '昨天更新' },
    { id: 'project-6', name: '品牌官网重构', description: '官网体验改版与品牌强化', fileCount: 9, updatedAt: '4 天前更新' },
  ],
  'team-3': [
    { id: 'project-7', name: '业务协同平台', description: '跨团队流程管理优化', fileCount: 14, updatedAt: '今天更新' },
  ],
  'team-4': [
    { id: 'project-8', name: '经营分析大屏', description: '经营指标可视化', fileCount: 5, updatedAt: '3 天前更新' },
  ],
}


export type ProjectAccessLevel = 'view' | 'edit'

/**
 * 当前登录用户（Chris J）的项目级权限 mock。
 * 正式联调后由“当前用户项目权限”接口替换；未配置的项目视为无权限，不应出现在项目切换器中。
 */
export const mockCurrentUserProjectAccess: Record<string, ProjectAccessLevel> = {
  'project-1': 'edit',
  'project-2': 'view',
  'project-4': 'edit',
  'project-5': 'view',
  'project-7': 'edit',
}

export const mockTeamMembers: Record<string, TeamMemberSummary[]> = {
  'team-1': [
    { id: 'member-1', name: 'Admin', email: 'admin@example.com', initials: 'A', role: '管理员' },
    { id: 'member-2', name: '张三', email: 'zhangsan@example.com', initials: '张', role: '成员' },
    { id: 'member-3', name: '李四', email: 'lisi@example.com', initials: '李', role: '成员' },
    { id: 'member-4', name: '王五', email: 'wangwu@example.com', initials: '王', role: '成员' },
  ],
  'team-2': [
    { id: 'member-5', name: 'Mia', email: 'mia@example.com', initials: 'M', role: '管理员' },
    { id: 'member-6', name: '周周', email: 'zhouzhou@example.com', initials: '周', role: '成员' },
  ],
  'team-3': [
    { id: 'member-7', name: 'Leo', email: 'leo@example.com', initials: 'L', role: '管理员' },
    { id: 'member-8', name: '陈晨', email: 'chenchen@example.com', initials: '陈', role: '成员' },
  ],
  'team-4': [
    { id: 'member-9', name: 'Data', email: 'data@example.com', initials: 'D', role: '管理员' },
  ],
}

export const mockProjectDetails: Record<string, ProjectDetailSummary> = {
  'project-1': {
    id: 'project-1',
    teamId: 'team-1',
    name: '电商平台改版',
    description: '移动端购物体验优化，提升用户转化率',
    folders: [
      {
        id: 'folder-1',
        name: '移动端设计',
        fileCount: 2,
        files: [
          { id: 'file-1', name: '首页改版方案 V2.0', updatedAt: '2 天前', pageCount: 12 },
          { id: 'file-2', name: '商品详情页优化', updatedAt: '3 天前', pageCount: 8 },
        ],
      },
    ],
    rootFiles: [
      { id: 'file-3', name: '购物车流程重构', updatedAt: '5 天前', pageCount: 15 },
      { id: 'file-4', name: '支付页面优化', updatedAt: '1 周前', pageCount: 6 },
    ],
  },
  'project-2': {
    id: 'project-2',
    teamId: 'team-1',
    name: '客户管理系统',
    description: 'CRM 系统原型设计',
    folders: [],
    rootFiles: [
      { id: 'file-5', name: '客户列表管理', updatedAt: '2 天前', pageCount: 9 },
      { id: 'file-6', name: '客户画像详情', updatedAt: '4 天前', pageCount: 7 },
    ],
  },
}
