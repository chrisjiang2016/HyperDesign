import { http } from './http'

export type TeamSummary = {
  id: string
  name: string
  description: string
  icon: string
  color: string
  roleLabel: '管理员' | '成员'
  memberCount: number
  projectCount: number
  extraStat: string
}

export type WorkspaceSummaryCard = {
  id: string
  label: string
  value: number | string
  metaPrimary: string
  metaSecondary?: string
  tone?: 'success' | 'warning' | 'neutral'
}

export type WorkspaceActivity = {
  id: string
  title: string
  summary: string
}

export type WorkspaceData = {
  teams: TeamSummary[]
  summary: WorkspaceSummaryCard[]
  activities: WorkspaceActivity[]
}

export type NavTeam = {
  id: string
  name: string
  color: string
  projectCount: number
  roleLabel: '管理员' | '成员'
  projects: Array<{ id: string; name: string; permission: 'view' | 'edit' }>
}

export type TeamDetail = {
  id: string
  name: string
  description: string
  icon: string
  color: string
  roleLabel: '管理员' | '成员'
  memberCount: number
  projectCount: number
  fileCountEstimate: number
  pendingFeedbackCount: number
  adminCount: number
  canUpload: boolean
  isSystemUser: boolean  // 当前用户是否为 system 超级管理员
  projects: Array<{
    id: string
    name: string
    description: string
    fileCount: number
    updatedAt: string
    permission: 'view' | 'edit'
  }>
  members: Array<{
    id: string
    name: string
    email: string
    initials: string
    role: '管理员' | '成员'
    canUpload: boolean
  }>
}

export type ProjectDetail = {
  id: string
  teamId: string
  teamName: string
  name: string
  description: string
  permission: 'view' | 'edit'
  canDelete: boolean
  stats: {
    fileCount: number
    collaboratorCount: number
    pendingCommentCount: number
    pageCountEstimate: number
  }
}

export type ProjectFile = {
  id: string
  folderId: string | null
  name: string
  originalFilename: string
  parseStatus: string
  parseError: string | null
  pageCount: number
  fileSize: number
  uploader: string
  canDelete: boolean
  entryPageId: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectFolder = {
  id: string
  parentId: string | null
  name: string
  children: ProjectFolder[]
  files: ProjectFile[]
}

export type PrototypePage = {
  id: string
  title: string | null
  relativePath: string
  isEntry: boolean
  sortOrder: number
  depth?: number
}

export type FilePermission = {
  canView: boolean
  canComment: boolean
  canEdit: boolean
  canDelete: boolean
}

export type FilePermissionMember = {
  userId: string
  username: string
  role: '管理员' | '成员'
  isUploader: boolean
  permissions: FilePermission
}

export type CollaborationComment = {
  id: string
  parentId: string | null
  content: string
  authorId: string
  author: string
  createdAt: string
  replies?: CollaborationComment[]
}

export type CollaborationAnnotation = {
  id: string
  number: number
  pageId: string
  title: string
  topPercent: number
  leftPercent: number
  pageScrollTop: number
  pageScrollHeight: number
  status: 'open' | 'resolved'
  authorId: string
  author: string
  createdAt: string
  comments: CollaborationComment[]
}

/** 分享类型：登录后仅查看 / 加入团队 / 免登录仅查看 */
export type ShareAccessType = 'VIEW_ONLY' | 'JOIN_TEAM' | 'PUBLIC_VIEW_ONLY'

export const shareAccessLabels: Record<ShareAccessType, string> = {
  VIEW_ONLY: '登录后仅查看',
  JOIN_TEAM: '可加入团队',
  PUBLIC_VIEW_ONLY: '免登录仅查看',
}

export type PublicSharePreview = {
  name: string
  entryPageId: string | null
  pages: PrototypePage[]
  expiresAt: string
  serverTime: string
}

export async function getPublicSharePreview(token: string): Promise<PublicSharePreview> {
  // No session credentials, and no persistent workspace grant.
  const response = await fetch(`/api/public/shares/${encodeURIComponent(token)}/pages`, { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('分享链接已失效或预览尚未就绪')
  return (await response.json() as ApiResponse<PublicSharePreview>).data
}

export function publicShareResourceUrl(token: string, path: string) {
  return `/api/public/shares/${encodeURIComponent(token)}/resources/${path.split('/').map(encodeURIComponent).join('/')}`
}

export type ShareLink = {
  id: string
  status: 'active' | 'revoked'
  accessType: ShareAccessType
  expiresAt: string
  createdAt: string
  revokedAt: string | null
  acceptedCount: number
  token: string
}

export type CreatedShareLink = Pick<ShareLink, 'id' | 'status' | 'expiresAt' | 'accessType'> & { token: string }

type ApiResponse<T> = { success: true; data: T; message: string }

export async function getWorkspace() {
  return (await http.get<ApiResponse<WorkspaceData>>('/workspace')).data.data
}

export async function createTeam(payload: { name: string; description?: string }) {
  return (await http.post<ApiResponse<TeamSummary>>('/teams', payload)).data.data
}

export async function getNavTeamsProjects() {
  return (await http.get<ApiResponse<NavTeam[]>>('/nav/teams-projects')).data.data
}

export async function getTeamDetail(teamId: string) {
  return (await http.get<ApiResponse<TeamDetail>>(`/teams/${teamId}`)).data.data
}

export async function updateTeam(teamId: string, payload: { name?: string; description?: string }) {
  return (await http.put<ApiResponse<TeamDetail>>(`/teams/${teamId}`, payload)).data.data
}

export async function deleteTeam(teamId: string) {
  return (await http.delete<ApiResponse<null>>(`/teams/${teamId}`)).data.data
}

export async function createProject(teamId: string, payload: { name: string; description?: string }) {
  return (await http.post<ApiResponse<{ id: string }>>(`/teams/${teamId}/projects`, payload)).data.data
}

export async function getProjectDetail(projectId: string) {
  return (await http.get<ApiResponse<ProjectDetail>>(`/projects/${projectId}`)).data.data
}

export async function updateProject(projectId: string, payload: { name?: string; description?: string }) {
  return (await http.put<ApiResponse<ProjectDetail>>(`/projects/${projectId}`, payload)).data.data
}

export async function deleteProject(projectId: string) {
  return (await http.delete<ApiResponse<null>>(`/projects/${projectId}`)).data.data
}

export async function getProjectFiles(projectId: string) {
  return (await http.get<ApiResponse<ProjectFile[]>>(`/projects/${projectId}/files`)).data.data
}

export async function deleteProjectFile(projectId: string, fileId: string) {
  return (await http.delete<ApiResponse<null>>(`/projects/${projectId}/files/${fileId}`)).data.data
}

export async function downloadProjectFile(projectId: string, fileId: string) {
  try {
    const response = await http.get(`/projects/${projectId}/files/${fileId}/download`, { responseType: 'blob' })
    const contentDisposition = response.headers['content-disposition']
    let filename = 'download'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i)
      if (match?.[1]) filename = decodeURIComponent(match[1])
    }
    const blob = response.data
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    console.error('下载失败详情:', error)
    console.error('错误响应:', error.response?.data)
    console.error('错误状态:', error.response?.status)
    throw error
  }
}

export async function retryProjectFileParse(projectId: string, fileId: string) {
  return (await http.post<ApiResponse<{ id: string; parseStatus: string }>>(`/projects/${projectId}/files/${fileId}/retry-parse`)).data.data
}

export async function getProjectDirectory(projectId: string) {
  return (await http.get<ApiResponse<{ folders: ProjectFolder[]; rootFiles: ProjectFile[] }>>(`/projects/${projectId}/folders`)).data.data
}

export async function createProjectFolder(projectId: string, payload: { name: string; parentId?: string }) {
  return (await http.post<ApiResponse<ProjectFolder>>(`/projects/${projectId}/folders`, payload)).data.data
}

export async function uploadProjectFile(projectId: string, file: File, name?: string, folderId?: string) {
  const formData = new FormData()
  formData.append('file', file)
  const query = new URLSearchParams()
  if (name?.trim()) query.set('name', name.trim())
  if (folderId) query.set('folderId', folderId)
  const queryText = query.size ? `?${query.toString()}` : ''
  return (await http.post<ApiResponse<{ id: string }>>(`/projects/${projectId}/files/upload${queryText}`, formData)).data.data
}

export async function getPrototypePages(fileId: string) {
  return (await http.get<ApiResponse<{ fileId: string; projectId: string | null; entryPageId: string | null; permissions: FilePermission; pages: PrototypePage[] }>>(`/files/${fileId}/pages`)).data.data
}

export async function getFirstPreview(projectId: string) {
  return (await http.get<ApiResponse<{ fileId: string; entryPageId: string; entryRelativePath: string | null } | null>>(`/projects/${projectId}/first-preview`)).data.data
}

export async function getProjectFilePermissions(projectId: string, fileId: string) {
  return (await http.get<ApiResponse<FilePermissionMember[]>>(`/projects/${projectId}/files/${fileId}/permissions`)).data.data
}

export async function updateProjectFilePermission(projectId: string, fileId: string, userId: string, permissions: FilePermission) {
  return (await http.put<ApiResponse<FilePermission>>(`/projects/${projectId}/files/${fileId}/permissions/${userId}`, permissions)).data.data
}

export async function getFileAnnotations(fileId: string, pageId?: string) {
  return (await http.get<ApiResponse<CollaborationAnnotation[]>>(`/files/${fileId}/annotations`, { params: pageId ? { pageId } : undefined })).data.data
}

export async function createFileAnnotation(fileId: string, pageId: string, payload: { title: string; content: string; topPercent: number; leftPercent: number; pageScrollTop: number; pageScrollHeight: number }) {
  return (await http.post<ApiResponse<CollaborationAnnotation>>(`/files/${fileId}/pages/${pageId}/annotations`, payload)).data.data
}

export async function createAnnotationComment(fileId: string, annotationId: string, payload: { content: string; parentId?: string }) {
  return (await http.post<ApiResponse<CollaborationComment>>(`/files/${fileId}/annotations/${annotationId}/comments`, payload)).data.data
}

export async function getFileShareLinks(fileId: string) {
  return (await http.get<ApiResponse<ShareLink[]>>(`/files/${fileId}/shares`)).data.data
}

export async function createFileShareLink(fileId: string, expiresInDays: number, accessType: ShareAccessType = 'VIEW_ONLY') {
  return (await http.post<ApiResponse<CreatedShareLink>>(`/files/${fileId}/shares`, { expiresInDays, accessType })).data.data
}

export async function revokeFileShareLink(fileId: string, shareId: string) {
  return (await http.delete<ApiResponse<ShareLink>>(`/files/${fileId}/shares/${shareId}`)).data.data
}

export async function rotateFileShareLink(fileId: string, shareId: string) {
  return (await http.post<ApiResponse<ShareLink>>(`/files/${fileId}/shares/${shareId}/rotate`)).data.data
}

export type ShareInfo =
  | { file: { name: string; pageCount: number }; expiresAt: string; accessType: 'PUBLIC_VIEW_ONLY' }
  | { file: { id: string; name: string; pageCount: number; projectName: string }; expiresAt: string; accessType: 'VIEW_ONLY' | 'JOIN_TEAM'; teamName: string | null }

export async function inspectShareLink(token: string) {
  return (await http.get<ApiResponse<ShareInfo>>(`/shares/${encodeURIComponent(token)}`, { withCredentials: false })).data.data
}

export async function acceptShareLink(token: string) {
  return (await http.post<ApiResponse<{ fileId: string; accessType: ShareAccessType; joinedTeamId: string | null }>>(`/shares/${token}/accept`)).data.data
}

export type CreatedTeamInvite = {
  id: string
  token: string
  expiresAt: string
  status: 'active'
}

export async function createTeamInvite(teamId: string) {
  return (await http.post<ApiResponse<CreatedTeamInvite>>(`/teams/${teamId}/invites`)).data.data
}

export async function inspectTeamInvite(token: string) {
  return (await http.get<ApiResponse<{ team: { id: string; name: string; description: string }; expiresAt: string }>>(`/team-invites/${token}`)).data.data
}

export async function acceptTeamInvite(token: string) {
  return (await http.post<ApiResponse<{ teamId: string; teamName: string; alreadyMember: boolean }>>(`/team-invites/${token}/accept`)).data.data
}

export async function deleteTeamMember(teamId: string, userId: string) {
  return (await http.delete<ApiResponse<null>>(`/teams/${teamId}/members/${userId}`)).data.data
}
