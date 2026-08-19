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

export type ShareLink = {
  id: string
  status: 'active' | 'revoked'
  expiresAt: string
  createdAt: string
  revokedAt: string | null
  acceptedCount: number
}

export type CreatedShareLink = Pick<ShareLink, 'id' | 'status' | 'expiresAt'> & { token: string }

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

export async function deleteTeam(teamId: string) {
  return (await http.delete<ApiResponse<null>>(`/teams/${teamId}`)).data.data
}

export async function createProject(teamId: string, payload: { name: string; description?: string }) {
  return (await http.post<ApiResponse<{ id: string }>>(`/teams/${teamId}/projects`, payload)).data.data
}

export async function getProjectDetail(projectId: string) {
  return (await http.get<ApiResponse<ProjectDetail>>(`/projects/${projectId}`)).data.data
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

export async function createFileShareLink(fileId: string, expiresInDays: number) {
  return (await http.post<ApiResponse<CreatedShareLink>>(`/files/${fileId}/shares`, { expiresInDays })).data.data
}

export async function revokeFileShareLink(fileId: string, shareId: string) {
  return (await http.delete<ApiResponse<ShareLink>>(`/files/${fileId}/shares/${shareId}`)).data.data
}

export async function inspectShareLink(token: string) {
  return (await http.get<ApiResponse<{ file: { id: string; name: string; pageCount: number; projectName: string }; expiresAt: string }>>(`/shares/${token}`)).data.data
}

export async function acceptShareLink(token: string) {
  return (await http.post<ApiResponse<{ fileId: string }>>(`/shares/${token}/accept`)).data.data
}
