export interface ViewerPageSummary {
  id: string
  name: string
  path: string
  previewPath?: string
  isCurrent?: boolean
}

export interface ViewerCommentReply {
  id: string
  commentId: string
  author: string
  content: string
}

export interface ViewerComment {
  id: string
  pageId: string
  markerId: string
  author: string
  avatar: string
  time: string
  anchor: string
  content: string
  actions: string[]
  replies?: ViewerCommentReply[]
}

export interface ViewerMarker {
  id: string
  number: number
  pageId: string
  commentId: string
  topPercent: number
  leftPercent: number
  /** Scroll offset (px) of the iframe document when the annotation was created. */
  pageScrollTop: number
  /** Document scrollHeight (px) when the annotation was created. */
  pageScrollHeight: number
  title: string
  note?: string
}

export interface ViewerAnnotationPayload {
  fileId: string
  pageId: string
  marker: {
    id: string
    number: number
    title: string
    note?: string
    position: {
      topPercent: number
      leftPercent: number
    }
  }
  comment: {
    id: string
    author: string
    avatar: string
    time: string
    anchor: string
    content: string
    actions: string[]
  }
  replies: Array<{
    id: string
    commentId: string
    author: string
    content: string
  }>
}

export interface ViewerFileDetail {
  id: string
  title: string
  subtitle: string
  pageCount: number
  previewBasePath: string
  pages: ViewerPageSummary[]
  comments: ViewerComment[]
  markers: ViewerMarker[]
}


/**
 * 当前 mock 中每个项目的首个可预览原型文件。
 * Viewer 的项目切换使用该映射，并通过首个 page id 打开文件的第一页。
 */
export const mockProjectFirstViewerFile: Record<string, string> = {
  'project-1': 'file-1',
  'project-2': 'file-2',
  'project-4': 'file-3',
}

export const mockViewerFiles: Record<string, ViewerFileDetail> = {
  'file-1': {
    id: 'file-1',
    title: 'HTML 原型分享平台 · 核心流程演示',
    subtitle: '8 个真实 HTML 页面 · 本地原型预览 · 最近更新 18:11',
    pageCount: 9,
    previewBasePath: '/prototype-assets',
    pages: [
      { id: 'viewer-page-1', name: '登录页', path: 'login.html', previewPath: 'login.html' },
      { id: 'viewer-page-2', name: '注册页', path: 'register.html', previewPath: 'register.html' },
      { id: 'viewer-page-3', name: '忘记密码', path: 'forgot-password.html', previewPath: 'forgot-password.html' },
      { id: 'viewer-page-4', name: '我的团队', path: 'index.html', previewPath: 'index.html' },
      { id: 'viewer-page-5', name: '团队详情', path: 'team-detail.html', previewPath: 'team-detail.html' },
      { id: 'viewer-page-6', name: '项目详情', path: 'project-detail.html', previewPath: 'project-detail.html' },
      { id: 'viewer-page-7', name: '原型预览页', path: 'prototype-viewer.html', previewPath: 'prototype-viewer.html' },
      { id: 'viewer-page-8', name: '个人设置', path: 'user-settings.html', previewPath: 'user-settings.html' },
      { id: 'viewer-page-9', name: '统一账户流水查询', path: '统一账户流水查询.html', previewPath: '统一账户流水查询.html', isCurrent: true },
    ],
    markers: [
      {
        id: 'marker-1',
        number: 1,
        pageId: 'viewer-page-1',
        commentId: 'comment-1',
        topPercent: 35,
        leftPercent: 51,
        pageScrollTop: 0,
        pageScrollHeight: 800,
        title: '登录卡片主区域',
        note: '登录表单已经接近可用状态，后续只需替换为真实接口和错误态返回。',
      },
      {
        id: 'marker-2',
        number: 2,
        pageId: 'viewer-page-4',
        commentId: 'comment-2',
        topPercent: 31,
        leftPercent: 20,
        pageScrollTop: 0,
        pageScrollHeight: 800,
        title: '团队卡片列表',
        note: '团队首页信息密度合适，后续接接口时注意分页和搜索态。',
      },
      {
        id: 'marker-3',
        number: 3,
        pageId: 'viewer-page-6',
        commentId: 'comment-3',
        topPercent: 44,
        leftPercent: 78,
        pageScrollTop: 0,
        pageScrollHeight: 800,
        title: '上传 ZIP 入口',
        note: '后续这里需要接入真实上传、解析进度和失败重试。',
      },
      {
        id: 'marker-4',
        number: 4,
        pageId: 'viewer-page-7',
        commentId: 'comment-4',
        topPercent: 24,
        leftPercent: 68,
        pageScrollTop: 0,
        pageScrollHeight: 800,
        title: '预览区顶部工具栏',
        note: '当前这页是静态 HTML 原型，可作为最终 React Viewer 的真实预览内容来源。',
      },
    ],
    comments: [
      {
        id: 'comment-1',
        pageId: 'viewer-page-1',
        markerId: 'marker-1',
        author: '张三',
        avatar: '张',
        time: '2 小时前',
        anchor: '登录页 · 锚点 #1',
        content: '登录页的视觉层级已经够清晰，下一步重点是接入真实登录接口、错误提示和记住我逻辑。',
        actions: ['👍 3', '💬 回复', '🔖 标记待处理'],
        replies: [
          {
            id: 'reply-1',
            commentId: 'comment-1',
            author: 'Admin 回复：',
            content: '收到，这一版先保持真实 HTML 预览，接口接入放到正式研发阶段。',
          },
        ],
      },
      {
        id: 'comment-2',
        pageId: 'viewer-page-4',
        markerId: 'marker-2',
        author: '李四',
        avatar: '李',
        time: '5 小时前',
        anchor: '我的团队 · 锚点 #2',
        content: '团队卡片浏览体验不错，建议后续补一个空状态和团队过多时的筛选能力。',
        actions: ['👍 1', '💬 回复', '✅ 已确认'],
      },
      {
        id: 'comment-3',
        pageId: 'viewer-page-6',
        markerId: 'marker-3',
        author: 'Mia',
        avatar: 'M',
        time: '1 小时前',
        anchor: '项目详情 · 锚点 #3',
        content: '上传 ZIP 是核心入口，后续最好把上传状态、解析结果和失败原因直接在这里反馈。',
        actions: ['👍 2', '💬 回复', '🔧 待实现'],
      },
      {
        id: 'comment-4',
        pageId: 'viewer-page-7',
        markerId: 'marker-4',
        author: 'Leo',
        avatar: 'L',
        time: '刚刚',
        anchor: '原型预览页 · 锚点 #4',
        content: '这次把 Viewer 改成真实 HTML 预览是对的，后面只要叠加真实标注创建能力，就更接近正式产品了。',
        actions: ['👍 4', '💬 回复', '✅ 已确认'],
      },
    ],
  },
  'file-2': {
    id: 'file-2',
    title: 'HTML 原型分享平台 · 账户流程细化',
    subtitle: '3 个真实 HTML 页面 · 设计评审中 · 最近更新 17:23',
    pageCount: 3,
    previewBasePath: '/prototype-assets',
    pages: [
      { id: 'viewer-page-21', name: '登录页', path: 'login.html', previewPath: 'login.html', isCurrent: true },
      { id: 'viewer-page-22', name: '注册页', path: 'register.html', previewPath: 'register.html' },
      { id: 'viewer-page-23', name: '忘记密码', path: 'forgot-password.html', previewPath: 'forgot-password.html' },
    ],
    markers: [],
    comments: [],
  },
  'file-3': {
    id: 'file-3',
    title: 'HTML 原型分享平台 · 预览链路验证',
    subtitle: '2 个真实 HTML 页面 · 等待评审 · 最近更新 18:09',
    pageCount: 2,
    previewBasePath: '/prototype-assets',
    pages: [
      { id: 'viewer-page-31', name: '项目详情', path: 'project-detail.html', previewPath: 'project-detail.html', isCurrent: true },
      { id: 'viewer-page-32', name: '原型预览页', path: 'prototype-viewer.html', previewPath: 'prototype-viewer.html' },
    ],
    markers: [],
    comments: [],
  },
}
