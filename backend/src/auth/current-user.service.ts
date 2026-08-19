import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import type { ProjectPermissionLevel, TeamRole } from '@prisma/client'
import { rm } from 'node:fs/promises'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'

const SESSION_COOKIE = 'hd_sid'

export interface CurrentUser {
  id: string
  username: string
  role: 'super_admin' | 'sub_admin' | 'employee'
  status: 'active' | 'disabled'
  lastLoginAt: Date | null
}

@Injectable()
export class CurrentUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getCurrentUserFromToken(token?: string): Promise<CurrentUser> {
    if (!token) throw new UnauthorizedException({ errorCode: 'UNAUTHORIZED', message: '未登录' })
    const session = await this.prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session || session.expiresAt <= new Date() || session.user.status === 'DISABLED') {
      if (session) await this.prisma.session.delete({ where: { id: session.id } })
      throw new UnauthorizedException({ errorCode: 'UNAUTHORIZED', message: '登录已失效' })
    }
    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role.toLowerCase() as CurrentUser['role'],
      status: session.user.status.toLowerCase() as CurrentUser['status'],
      lastLoginAt: session.user.lastLoginAt ?? null,
    }
  }

  getSessionCookieName() {
    return SESSION_COOKIE
  }
}

export type TeamListItem = {
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

export type WorkspaceActivityItem = {
  id: string
  title: string
  summary: string
}

export type TeamDetailProject = {
  id: string
  name: string
  description: string
  fileCount: number
  updatedAt: string
  permission: 'view' | 'edit'
}

export type TeamDetailMember = {
  id: string
  name: string
  email: string
  initials: string
  role: '管理员' | '成员'
  canUpload: boolean
}

export type TeamDetailResponse = {
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
  projects: TeamDetailProject[]
  members: TeamDetailMember[]
}

export type ProjectDetailResponse = {
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

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getWorkspace(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: { select: { members: true, projects: true } },
            projects: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const teams: TeamListItem[] = memberships.map((membership: any) => ({
      id: membership.team.id,
      name: membership.team.name,
      description: membership.team.description,
      icon: membership.team.icon,
      color: membership.team.color,
      roleLabel: this.mapTeamRole(membership.role),
      memberCount: membership.team._count.members,
      projectCount: membership.team._count.projects,
      extraStat: `${membership.team.projects.filter((project: any) => project.permissions.some((permission: any) => permission.userId === userId)).length} 个我可访问项目`,
    }))

    const totalProjects = memberships.reduce((sum: number, membership: any) => {
      return (
        sum +
        membership.team.projects.filter((project: any) =>
          project.permissions.some((permission: any) => permission.userId === userId),
        ).length
      )
    }, 0)

    const summary: WorkspaceSummaryCard[] = [
      {
        id: 's1',
        label: '我参与的团队',
        value: teams.length,
        metaPrimary: teams.length > 0 ? '已接入真实数据' : '暂无团队',
        metaSecondary: '来源于团队成员关系',
        tone: 'success',
      },
      {
        id: 's2',
        label: '进行中项目',
        value: totalProjects,
        metaPrimary: '按当前用户项目权限过滤',
        metaSecondary: 'Sprint 2 实时返回',
        tone: 'success',
      },
      {
        id: 's3',
        label: '可上传团队',
        value: memberships.filter((item: any) => item.canUpload).length,
        metaPrimary: '基于 team_members.canUpload',
        tone: 'warning',
      },
      {
        id: 's4',
        label: '协作状态',
        value: 'Sprint 2',
        metaPrimary: '团队/项目权限已打通',
        tone: 'neutral',
      },
    ]

    const activities: WorkspaceActivityItem[] = teams.slice(0, 3).map((team, index) => ({
      id: `act-${team.id}`,
      title: `${team.name} 已接入真实团队数据`,
      summary: `${team.projectCount} 个项目、${team.memberCount} 位成员可直接进入协作工作台 · 顺位 ${index + 1}`,
    }))

    return { teams, summary, activities }
  }

  async createTeam(userId: string, payload: { name: string; description?: string }) {
    const team = await this.prisma.team.create({
      data: {
        name: payload.name,
        description: payload.description?.trim() || '新创建的协作团队，可在团队详情中继续完善项目与成员。',
        icon: '👥',
        color: '#2563eb',
        members: {
          create: {
            userId,
            role: 'ADMIN',
            canUpload: true,
          },
        },
      },
      include: {
        _count: { select: { members: true, projects: true } },
        members: { where: { userId }, take: 1 },
      },
    })

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      icon: team.icon,
      color: team.color,
      roleLabel: '管理员' as const,
      memberCount: team._count.members,
      projectCount: team._count.projects,
      extraStat: '刚创建',
    }
  }

  async getTeamDetail(userId: string, teamId: string): Promise<TeamDetailResponse | null> {
    const membership = await this.prisma.teamMember.findFirst({
      where: { teamId, userId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
            projects: {
              include: {
                permissions: true,
                _count: { select: { files: true } },
                files: { select: { pageCount: true } },
              },
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
    })

    if (!membership) return null

    const visibleProjects = membership.team.projects
      .map((project: any) => {
        const permission = project.permissions.find((item: any) => item.userId === userId)
        if (!permission) return null
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          fileCount: project._count.files,
          updatedAt: this.formatRelativeDate(project.updatedAt),
          permission: this.mapProjectPermission(permission.level),
        }
      })
      .filter(Boolean) as TeamDetailProject[]

    const members: TeamDetailMember[] = membership.team.members.map((member: any) => ({
      id: member.user.id,
      name: member.user.username,
      email: `${member.user.username}@example.com`,
      initials: this.getInitials(member.user.username),
      role: this.mapTeamRole(member.role),
      canUpload: member.canUpload,
    }))

    return {
      id: membership.team.id,
      name: membership.team.name,
      description: membership.team.description,
      icon: membership.team.icon,
      color: membership.team.color,
      roleLabel: this.mapTeamRole(membership.role),
      memberCount: members.length,
      projectCount: membership.team.projects.length,
      fileCountEstimate: membership.team.projects.reduce((sum: number, project: any) => sum + project._count.files, 0),
      pendingFeedbackCount: 0,
      adminCount: members.filter((item: any) => item.role === '管理员').length,
      canUpload: membership.canUpload,
      projects: visibleProjects,
      members,
    }
  }

  async getProjectDetail(userId: string, projectId: string): Promise<ProjectDetailResponse | null> {
    const permission = await this.prisma.projectPermission.findFirst({
      where: { projectId, userId },
      include: {
        project: {
          include: {
            team: {
              include: {
                members: { where: { userId }, select: { role: true } },
              },
            },
            permissions: true,
            _count: { select: { files: true } },
          },
        },
      },
    })

    if (!permission) return null

    return {
      id: permission.project.id,
      teamId: permission.project.teamId,
      teamName: permission.project.team.name,
      name: permission.project.name,
      description: permission.project.description,
      permission: this.mapProjectPermission(permission.level),
      canDelete: permission.project.team.members[0]?.role === 'ADMIN',
      stats: {
        fileCount: permission.project._count.files,
        collaboratorCount: permission.project.permissions.length,
        pendingCommentCount: await this.prisma.annotation.count({
          where: { file: { projectId }, status: 'OPEN' },
        }),
        pageCountEstimate: await this.getProjectPageCount(projectId),
      },
    }
  }

  async getTeamProjectsForNav(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            projects: {
              include: {
                permissions: {
                  where: { userId },
                },
              },
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return memberships.map((membership: any) => ({
      id: membership.team.id,
      name: membership.team.name,
      color: membership.team.color,
      projectCount: membership.team.projects.length,
      roleLabel: this.mapTeamRole(membership.role),
      projects: membership.team.projects
        .filter((project: any) => project.permissions.length > 0)
        .map((project: any) => ({
          id: project.id,
          name: project.name,
          permission: this.mapProjectPermission(project.permissions[0].level),
        })),
    }))
  }

  async updateTeam(userId: string, teamId: string, payload: { name?: string; description?: string }) {
    await this.requireTeamAdmin(userId, teamId)
    const data = Object.fromEntries(
      Object.entries({ name: payload.name?.trim(), description: payload.description?.trim() }).filter(([, value]) => value),
    )
    if (Object.keys(data).length === 0) throw new ConflictException({ errorCode: 'VALIDATION_ERROR', message: '未提供可更新字段' })
    return this.prisma.team.update({ where: { id: teamId }, data })
  }

  async deleteTeam(userId: string, teamId: string) {
    await this.requireTeamAdmin(userId, teamId)
    const projects = await this.prisma.project.findMany({ where: { teamId }, select: { id: true } })
    for (const project of projects) await this.deleteProjectAssets(project.id)
    await this.prisma.team.delete({ where: { id: teamId } })
  }

  async listTeamMembers(userId: string, teamId: string) {
    await this.requireTeamMember(userId, teamId)
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { id: true, username: true, role: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })
    return members.map((member) => ({
      userId: member.user.id,
      username: member.user.username,
      role: this.mapTeamRole(member.role),
      canUpload: member.canUpload,
      joinedAt: member.createdAt,
    }))
  }

  async addTeamMember(userId: string, teamId: string, payload: { username: string; canUpload?: boolean }) {
    await this.requireTeamAdmin(userId, teamId)
    const user = await this.prisma.user.findUnique({ where: { username: payload.username } })
    if (!user) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '用户不存在' })
    const exists = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } })
    if (exists) throw new ConflictException({ errorCode: 'MEMBER_EXISTS', message: '用户已经是团队成员' })
    const member = await this.prisma.teamMember.create({
      data: { teamId, userId: user.id, role: 'MEMBER', canUpload: payload.canUpload ?? false },
      include: { user: { select: { id: true, username: true } } },
    })
    return { userId: member.user.id, username: member.user.username, role: '成员' as const, canUpload: member.canUpload, joinedAt: member.createdAt }
  }

  async updateMemberUploadPermission(userId: string, teamId: string, memberUserId: string, canUpload: boolean) {
    await this.requireTeamAdmin(userId, teamId)
    const member = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: memberUserId } } })
    if (!member) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '团队成员不存在' })
    return this.prisma.teamMember.update({ where: { id: member.id }, data: { canUpload } })
  }

  async removeTeamMember(userId: string, teamId: string, memberUserId: string) {
    const caller = await this.requireTeamAdmin(userId, teamId)
    const member = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: memberUserId } } })
    if (!member) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '团队成员不存在' })
    if (member.role === 'ADMIN') {
      const adminCount = await this.prisma.teamMember.count({ where: { teamId, role: 'ADMIN' } })
      if (adminCount <= 1) throw new ConflictException({ errorCode: 'LAST_TEAM_ADMIN', message: '不能移除团队最后一位管理员' })
    }
    if (caller.userId === memberUserId && member.role === 'ADMIN') {
      throw new ConflictException({ errorCode: 'SELF_REMOVE_FORBIDDEN', message: '管理员不能移除自己，请先指定其他管理员' })
    }
    await this.prisma.teamMember.delete({ where: { id: member.id } })
  }

  async requireProjectUpload(userId: string, projectId: string) {
    await this.requireProjectEdit(userId, projectId)
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true } })
    if (!project) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目不存在或无权访问' })
    const membership = await this.requireTeamMember(userId, project.teamId)
    if (membership.role !== 'ADMIN' && !membership.canUpload) {
      throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '没有向该团队上传原型的权限' })
    }
  }

  async requireProjectFolder(userId: string, projectId: string, folderId: string) {
    await this.requireProjectEdit(userId, projectId)
    return this.requireFolderInProject(projectId, folderId)
  }

  async canAccessPrototypeFile(userId: string, fileId: string) {
    const file = await this.prisma.prototypeFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        uploaderId: true,
        projectId: true,
        storageKey: true,
        entryPageId: true,
        permissions: { where: { userId }, select: { canView: true, canComment: true, canEdit: true, canDelete: true } },
        shareLinks: { where: { status: 'ACTIVE', expiresAt: { gt: new Date() }, grants: { some: { userId } } }, select: { id: true }, take: 1 },
      },
    })
    if (!file) return null
    const filePermission = file.permissions[0]
    const hasActiveShareGrant = file.shareLinks.length > 0
    if (hasActiveShareGrant) return { ...file, permission: { canView: true, canComment: false, canEdit: false, canDelete: false } }
    if (!file.projectId) return file.uploaderId === userId || filePermission?.canView ? { ...file, permission: filePermission } : null
    const viewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (viewer?.role === 'SUPER_ADMIN') return { ...file, permission: file.permissions[0] ?? { canView: true, canComment: true, canEdit: true, canDelete: true } }
    const projectPermission = await this.prisma.projectPermission.findUnique({ where: { projectId_userId: { projectId: file.projectId, userId } } })
    if (!projectPermission) return null
    // File permissions are explicit and never inherited from project permissions. Legacy files
    // temporarily remain visible to their uploader until a permission row is configured.
    if (file.uploaderId === userId || file.permissions[0]?.canView) return { ...file, permission: file.permissions[0] }
    return null
  }

  async requireProjectFileEdit(userId: string, projectId: string, fileId: string) {
    await this.requireProjectEdit(userId, projectId)
    const file = await this.prisma.prototypeFile.findFirst({ where: { id: fileId, projectId } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目文件不存在' })
    return file
  }

  async listProjectFiles(userId: string, projectId: string) {
    await this.requireProjectView(userId, projectId)
    const membership = await this.prisma.teamMember.findFirst({ where: { userId, team: { projects: { some: { id: projectId } } } }, select: { role: true } })
    const isTeamAdmin = membership?.role === 'ADMIN'
    const files = await this.prisma.prototypeFile.findMany({
      where: isTeamAdmin ? { projectId } : { projectId, OR: [{ uploaderId: userId }, { permissions: { some: { userId, canView: true } } }] },
      include: { uploader: { select: { username: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    const filePermissions = await this.prisma.filePermission.findMany({ where: { userId, fileId: { in: files.map((file) => file.id) } }, select: { fileId: true, canDelete: true } })
    const permissionsByFileId = new Map(filePermissions.map((permission) => [permission.fileId, permission.canDelete]))
    return files.map((file) => ({
      id: file.id,
      folderId: file.folderId,
      name: this.normalizeLegacyFilename(file.name),
      originalFilename: this.normalizeLegacyFilename(file.originalFilename),
      parseStatus: file.parseStatus.toLowerCase(),
      parseError: file.parseError,
      pageCount: file.pageCount,
      fileSize: file.fileSize,
      uploader: file.uploader.username,
      canDelete: isTeamAdmin || file.uploaderId === userId || permissionsByFileId.get(file.id) === true,
      entryPageId: file.entryPageId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }))
  }

  async deleteProjectFile(userId: string, projectId: string, fileId: string) {
    const file = await this.prisma.prototypeFile.findFirst({
      where: { id: fileId, projectId },
      select: { id: true, uploaderId: true, storageKey: true, project: { select: { teamId: true } } },
    })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目文件不存在' })
    if (!file.project) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目文件不存在' })
    const membership = await this.requireTeamMember(userId, file.project.teamId)
    const permission = await this.prisma.filePermission.findUnique({ where: { fileId_userId: { fileId, userId } }, select: { canDelete: true } })
    if (membership.role !== 'ADMIN' && file.uploaderId !== userId && !permission?.canDelete) {
      throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '没有删除该原型文件的权限' })
    }
    await this.prisma.prototypeFile.delete({ where: { id: fileId } })
    if (file.storageKey) {
      await Promise.allSettled([
        rm(this.storage.getOriginalZipPath(file.storageKey), { recursive: true, force: true }),
        rm(this.storage.getExtractedPath(file.storageKey), { recursive: true, force: true }),
      ])
    }
  }

  async getFilePermission(userId: string, fileId: string) {
    const file = await this.canAccessPrototypeFile(userId, fileId)
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '文件不存在或无权访问' })
    return this.toFilePermissionResponse(file.permission)
  }

  async updateFilePermission(
    userId: string,
    projectId: string,
    fileId: string,
    targetUserId: string,
    payload: { canView: boolean; canComment: boolean; canEdit: boolean; canDelete: boolean },
  ) {
    await this.requireProjectEdit(userId, projectId)
    const file = await this.prisma.prototypeFile.findFirst({ where: { id: fileId, projectId }, select: { id: true } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目文件不存在' })
    const member = await this.prisma.teamMember.findFirst({ where: { userId: targetUserId, team: { projects: { some: { id: projectId } } } } })
    if (!member) throw new ConflictException({ errorCode: 'INVALID_FILE_PERMISSION_TARGET', message: '授权用户不属于当前项目团队' })
    const permission = await this.prisma.filePermission.upsert({
      where: { fileId_userId: { fileId, userId: targetUserId } },
      update: { ...payload, grantedById: userId },
      create: { fileId, userId: targetUserId, ...payload, grantedById: userId },
    })
    return this.toFilePermissionResponse(permission)
  }

  async listFilePermissions(userId: string, projectId: string, fileId: string) {
    await this.requireProjectEdit(userId, projectId)
    const file = await this.prisma.prototypeFile.findFirst({ where: { id: fileId, projectId }, select: { id: true, uploaderId: true } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目文件不存在' })
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        team: {
          select: {
            members: { include: { user: { select: { id: true, username: true } } }, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    })
    const granted = await this.prisma.filePermission.findMany({ where: { fileId }, select: { userId: true, canView: true, canComment: true, canEdit: true, canDelete: true } })
    const grants = new Map(granted.map((item) => [item.userId, item]))
    return project?.team.members.map((member) => ({
      userId: member.user.id,
      username: member.user.username,
      role: this.mapTeamRole(member.role),
      isUploader: member.user.id === file.uploaderId,
      permissions: this.toFilePermissionResponse(grants.get(member.user.id) ?? (member.user.id === file.uploaderId ? { canView: true, canComment: true, canEdit: true, canDelete: true } : null)),
    })) ?? []
  }

  async getFirstPreview(userId: string, projectId: string) {
    await this.requireProjectView(userId, projectId)
    const file = await this.prisma.prototypeFile.findFirst({
      where: {
        projectId,
        parseStatus: 'SUCCESS',
        entryPageId: { not: null },
        OR: [{ uploaderId: userId }, { permissions: { some: { userId, canView: true } } }],
      },
      select: { id: true, entryPageId: true, pages: { where: { isEntry: true }, select: { relativePath: true }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    })
    if (!file?.entryPageId) return null
    return { fileId: file.id, entryPageId: file.entryPageId, entryRelativePath: file.pages[0]?.relativePath ?? null }
  }

  toFilePermissionResponse(permission?: { canView: boolean; canComment: boolean; canEdit: boolean; canDelete: boolean } | null) {
    return {
      canView: permission?.canView ?? false,
      canComment: permission?.canComment ?? false,
      canEdit: permission?.canEdit ?? false,
      canDelete: permission?.canDelete ?? false,
    }
  }

  async getProjectDirectory(userId: string, projectId: string) {
    await this.requireProjectView(userId, projectId)
    const [folders, files] = await Promise.all([
      this.prisma.projectFolder.findMany({ where: { projectId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.listProjectFiles(userId, projectId),
    ])
    const map = new Map(folders.map((folder) => [folder.id, { ...folder, children: [] as any[], files: [] as any[] }]))
    const roots: any[] = []
    for (const folder of map.values()) {
      if (folder.parentId) map.get(folder.parentId)?.children.push(folder)
      else roots.push(folder)
    }
    for (const file of files) {
      if (file.folderId) map.get(file.folderId)?.files.push(file)
    }
    return { folders: roots, rootFiles: files.filter((file) => !file.folderId) }
  }

  async createFolder(userId: string, projectId: string, payload: { name: string; parentId?: string }) {
    await this.requireProjectEdit(userId, projectId)
    if (payload.parentId) await this.requireFolderInProject(projectId, payload.parentId)
    const sortOrder = await this.prisma.projectFolder.count({ where: { projectId, parentId: payload.parentId ?? null } })
    try {
      return await this.prisma.projectFolder.create({ data: { projectId, parentId: payload.parentId ?? null, name: payload.name.trim(), sortOrder } })
    } catch {
      throw new ConflictException({ errorCode: 'FOLDER_EXISTS', message: '同级目录中已存在同名文件夹' })
    }
  }

  async updateFolder(userId: string, projectId: string, folderId: string, payload: { name?: string; parentId?: string }) {
    await this.requireProjectEdit(userId, projectId)
    const folder = await this.requireFolderInProject(projectId, folderId)
    if (payload.parentId === folderId) throw new ConflictException({ errorCode: 'INVALID_FOLDER_PARENT', message: '文件夹不能移动到自身' })
    if (payload.parentId) {
      await this.requireFolderInProject(projectId, payload.parentId)
      const descendants = await this.listFolderDescendantIds(projectId, folderId)
      if (descendants.includes(payload.parentId)) throw new ConflictException({ errorCode: 'INVALID_FOLDER_PARENT', message: '文件夹不能移动到其子目录中' })
    }
    const data = Object.fromEntries(Object.entries({ name: payload.name?.trim(), parentId: payload.parentId }).filter(([, value]) => value !== undefined && value !== ''))
    if (!Object.keys(data).length) throw new ConflictException({ errorCode: 'VALIDATION_ERROR', message: '未提供可更新字段' })
    try {
      return await this.prisma.projectFolder.update({ where: { id: folderId }, data })
    } catch {
      throw new ConflictException({ errorCode: 'FOLDER_EXISTS', message: '同级目录中已存在同名文件夹' })
    }
  }

  async deleteFolder(userId: string, projectId: string, folderId: string) {
    await this.requireProjectEdit(userId, projectId)
    await this.requireFolderInProject(projectId, folderId)
    // Preserve uploaded files by returning all descendant files to the project root before cascade deletion.
    const folderIds = await this.listFolderDescendantIds(projectId, folderId)
    await this.prisma.$transaction([
      this.prisma.prototypeFile.updateMany({ where: { folderId: { in: folderIds } }, data: { folderId: null } }),
      this.prisma.projectFolder.delete({ where: { id: folderId } }),
    ])
  }

  async moveProjectFile(userId: string, projectId: string, fileId: string, folderId?: string) {
    await this.requireProjectEdit(userId, projectId)
    const file = await this.prisma.prototypeFile.findFirst({ where: { id: fileId, projectId } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目文件不存在' })
    if (folderId) await this.requireFolderInProject(projectId, folderId)
    return this.prisma.prototypeFile.update({ where: { id: fileId }, data: { folderId: folderId ?? null } })
  }

  async listTeamProjects(userId: string, teamId: string) {
    await this.requireTeamMember(userId, teamId)
    const projects = await this.prisma.project.findMany({
      where: { teamId, permissions: { some: { userId } } },
      include: { permissions: { where: { userId }, select: { level: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      permission: this.mapProjectPermission(project.permissions[0].level),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }))
  }

  async createProject(userId: string, teamId: string, payload: { name: string; description?: string }) {
    await this.requireTeamAdmin(userId, teamId)
    const project = await this.prisma.project.create({
      data: {
        teamId,
        name: payload.name.trim(),
        description: payload.description?.trim() || '新创建的协作项目，等待上传原型文件。',
        permissions: { create: { userId, level: 'EDIT', grantedById: userId } },
      },
      include: { permissions: { where: { userId }, select: { level: true } } },
    })
    return { id: project.id, name: project.name, description: project.description, permission: this.mapProjectPermission(project.permissions[0].level), createdAt: project.createdAt, updatedAt: project.updatedAt }
  }

  async updateProject(userId: string, projectId: string, payload: { name?: string; description?: string }) {
    await this.requireProjectEdit(userId, projectId)
    const data = Object.fromEntries(
      Object.entries({ name: payload.name?.trim(), description: payload.description?.trim() }).filter(([, value]) => value),
    )
    if (Object.keys(data).length === 0) throw new ConflictException({ errorCode: 'VALIDATION_ERROR', message: '未提供可更新字段' })
    return this.prisma.project.update({ where: { id: projectId }, data })
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true } })
    if (!project) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目不存在' })
    await this.requireTeamAdmin(userId, project.teamId)
    await this.deleteProjectAssets(projectId)
    await this.prisma.project.delete({ where: { id: projectId } })
  }

  private async deleteProjectAssets(projectId: string) {
    const files = await this.prisma.prototypeFile.findMany({
      where: { projectId },
      select: { storageKey: true },
    })
    await this.prisma.prototypeFile.deleteMany({ where: { projectId } })
    await Promise.allSettled(
      files
        .filter((file) => file.storageKey)
        .flatMap((file) => [
          rm(this.storage.getOriginalZipPath(file.storageKey), { recursive: true, force: true }),
          rm(this.storage.getExtractedPath(file.storageKey), { recursive: true, force: true }),
        ]),
    )
  }

  private async requireTeamMember(userId: string, teamId: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } })
    if (!member) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '团队不存在或无权访问' })
    return member
  }

  private async requireTeamAdmin(userId: string, teamId: string) {
    const member = await this.requireTeamMember(userId, teamId)
    if (member.role !== 'ADMIN') throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅团队管理员可执行此操作' })
    return member
  }

  private async getProjectPageCount(projectId: string) {
    const result = await this.prisma.prototypeFile.aggregate({ where: { projectId }, _sum: { pageCount: true } })
    return result._sum.pageCount ?? 0
  }

  private async requireFolderInProject(projectId: string, folderId: string) {
    const folder = await this.prisma.projectFolder.findFirst({ where: { id: folderId, projectId } })
    if (!folder) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '文件夹不存在或不属于当前项目' })
    return folder
  }

  private async listFolderDescendantIds(projectId: string, rootFolderId: string) {
    const folders = await this.prisma.projectFolder.findMany({ where: { projectId }, select: { id: true, parentId: true } })
    const ids = [rootFolderId]
    for (let index = 0; index < ids.length; index += 1) {
      ids.push(...folders.filter((folder) => folder.parentId === ids[index]).map((folder) => folder.id))
    }
    return ids
  }

  private async requireProjectView(userId: string, projectId: string) {
    const permission = await this.prisma.projectPermission.findUnique({ where: { projectId_userId: { projectId, userId } } })
    if (!permission) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目不存在或无权访问' })
    return permission
  }

  private async requireProjectEdit(userId: string, projectId: string) {
    const permission = await this.requireProjectView(userId, projectId)
    if (permission.level !== 'EDIT') throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '没有项目编辑权限' })
    return permission
  }

  private mapTeamRole(role: TeamRole): '管理员' | '成员' {
    return role === 'ADMIN' ? '管理员' : '成员'
  }

  private mapProjectPermission(level: ProjectPermissionLevel): 'view' | 'edit' {
    return level === 'EDIT' ? 'edit' : 'view'
  }

  private normalizeLegacyFilename(filename: string): string {
    // Records created before the multipart filename fix can still contain
    // UTF-8 bytes interpreted as Latin-1. Repair only when the result contains
    // CJK text, so ordinary ASCII/Latin filenames remain untouched.
    if (!filename || filename.includes('\ufffd')) return filename
    const repaired = Buffer.from(filename, 'latin1').toString('utf8')
    return !repaired.includes('\ufffd') && /[\u3400-\u9fff]/.test(repaired) ? repaired : filename
  }

  private getInitials(username: string) {
    return username.slice(0, 2).toUpperCase()
  }

  private formatRelativeDate(date: Date) {
    const diffHours = Math.max(1, Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60)))
    if (diffHours < 24) return `${diffHours} 小时前更新`
    const diffDays = Math.round(diffHours / 24)
    return `${diffDays} 天前更新`
  }
}
