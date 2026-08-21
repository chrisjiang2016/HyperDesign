import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Req, Res, UseGuards } from '@nestjs/common'
import type { Request, Response } from 'express'
import { ok } from '../common/api-response'
import { RateLimit } from '../rate-limit/rate-limit.decorator'
import { RateLimitGuard } from '../rate-limit/rate-limit.guard'
import { AuthService } from './auth.service'
import {
  AddTeamMemberDto,
  ChangePasswordDto,
  CreateFolderDto,
  CreateProjectDto,
  CreateTeamDto,
  LoginDto,
  MoveProjectFileDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProjectDto,
  UpdateFolderDto,
  UpdateTeamDto,
  UpdateUploadPermissionDto,
  UpdateFilePermissionDto,
} from './dto'
import { CurrentUserService, WorkspaceService } from './current-user.service'

const SESSION_COOKIE = 'hd_sid'

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly currentUserService: CurrentUserService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Post('auth/register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'register', limit: 10, windowSeconds: 3600 })
  async register(@Body() dto: RegisterDto) {
    return ok(await this.authService.register(dto), '注册成功')
  }

  @Post('auth/login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'login', limit: 10, windowSeconds: 300, identityField: 'username' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto)
    response.cookie(SESSION_COOKIE, result.token, this.cookieOptions())
    return ok(result.user, '登录成功')
  }

  @Post('auth/logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(request.cookies?.[SESSION_COOKIE])
    response.clearCookie(SESSION_COOKIE, this.cookieOptions())
    return ok(null, '已退出登录')
  }

  @Get('auth/me')
  async me(@Req() request: Request) {
    const user = await this.authService.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok({
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
      lastLoginAt: user.lastLoginAt,
    })
  }

  @Post('auth/reset-password')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'reset-password', limit: 5, windowSeconds: 3600, identityField: 'username' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const temporaryPassword = await this.authService.resetPassword(dto.username)
    return ok(temporaryPassword ? { temporaryPassword } : null, '若账号存在，密码已重置')
  }

  @Post('auth/change-password')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'change-password', limit: 10, windowSeconds: 3600 })
  async changePassword(@Req() request: Request, @Body() dto: ChangePasswordDto) {
    const user = await this.authService.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    await this.authService.changePassword(user.id, dto)
    return ok(null, '密码修改成功，请重新登录')
  }

  @Get('workspace')
  async workspace(@Req() request: Request) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.getWorkspace(user.id), '工作台数据获取成功')
  }

  @Get('teams')
  async teams(@Req() request: Request) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    const workspace = await this.workspaceService.getWorkspace(user.id)
    return ok(workspace.teams, '团队列表获取成功')
  }

  @Post('teams')
  async createTeam(@Req() request: Request, @Body() dto: CreateTeamDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.createTeam(user.id, dto), '团队创建成功')
  }

  @Get('teams/:teamId')
  async teamDetail(@Req() request: Request & { params: { teamId: string } }) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    const data = await this.workspaceService.getTeamDetail(user.id, request.params.teamId)
    if (!data) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '团队不存在或无权访问' })
    return ok(data, '团队详情获取成功')
  }

  @Put('teams/:teamId')
  async updateTeam(@Req() request: Request, @Param('teamId') teamId: string, @Body() dto: UpdateTeamDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.updateTeam(user.id, teamId, dto), '团队更新成功')
  }

  @Delete('teams/:teamId')
  async deleteTeam(@Req() request: Request, @Param('teamId') teamId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    await this.workspaceService.deleteTeam(user.id, teamId)
    return ok(null, '团队已删除')
  }

  @Get('teams/:teamId/members')
  async teamMembers(@Req() request: Request, @Param('teamId') teamId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.listTeamMembers(user.id, teamId), '团队成员获取成功')
  }

  @Post('teams/:teamId/members')
  async addTeamMember(@Req() request: Request, @Param('teamId') teamId: string, @Body() dto: AddTeamMemberDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.addTeamMember(user.id, teamId, dto), '团队成员添加成功')
  }

  @Patch('teams/:teamId/members/:userId/upload-permission')
  async updateUploadPermission(
    @Req() request: Request,
    @Param('teamId') teamId: string,
    @Param('userId') memberUserId: string,
    @Body() dto: UpdateUploadPermissionDto,
  ) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.updateMemberUploadPermission(user.id, teamId, memberUserId, dto.canUpload), '上传权限更新成功')
  }

  @Delete('teams/:teamId/members/:userId')
  async removeTeamMember(@Req() request: Request, @Param('teamId') teamId: string, @Param('userId') memberUserId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    await this.workspaceService.removeTeamMember(user.id, teamId, memberUserId)
    return ok(null, '团队成员已移除')
  }

  @Get('teams/:teamId/projects')
  async teamProjects(@Req() request: Request, @Param('teamId') teamId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.listTeamProjects(user.id, teamId), '项目列表获取成功')
  }

  @Post('teams/:teamId/projects')
  async createProject(@Req() request: Request, @Param('teamId') teamId: string, @Body() dto: CreateProjectDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.createProject(user.id, teamId, dto), '项目创建成功')
  }

  @Get('projects/:projectId/files')
  async projectFiles(@Req() request: Request, @Param('projectId') projectId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.listProjectFiles(user.id, projectId), '项目文件列表获取成功')
  }

  @Delete('projects/:projectId/files/:fileId')
  async deleteProjectFile(@Req() request: Request, @Param('projectId') projectId: string, @Param('fileId') fileId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    await this.workspaceService.deleteProjectFile(user.id, projectId, fileId)
    return ok(null, '原型文件已删除')
  }

  @Get('projects/:projectId/first-preview')
  async firstPreview(@Req() request: Request, @Param('projectId') projectId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.getFirstPreview(user.id, projectId), '首个可预览文件获取成功')
  }

  @Put('projects/:projectId/files/:fileId/permissions/:userId')
  async updateFilePermission(
    @Req() request: Request,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateFilePermissionDto,
  ) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.updateFilePermission(user.id, projectId, fileId, targetUserId, dto), '文件权限已更新')
  }

  @Get('projects/:projectId/files/:fileId/permissions')
  async listFilePermissions(@Req() request: Request, @Param('projectId') projectId: string, @Param('fileId') fileId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.listFilePermissions(user.id, projectId, fileId), '文件权限成员列表获取成功')
  }

  @Get('files/:fileId/permissions/me')
  async filePermission(@Req() request: Request, @Param('fileId') fileId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.getFilePermission(user.id, fileId), '当前文件权限获取成功')
  }

  @Patch('projects/:projectId/files/:fileId/folder')
  async moveProjectFile(@Req() request: Request, @Param('projectId') projectId: string, @Param('fileId') fileId: string, @Body() dto: MoveProjectFileDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.moveProjectFile(user.id, projectId, fileId, dto.folderId), '原型文件已移动')
  }

  @Get('projects/:projectId/folders')
  async projectFolders(@Req() request: Request, @Param('projectId') projectId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.getProjectDirectory(user.id, projectId), '项目目录获取成功')
  }

  @Post('projects/:projectId/folders')
  async createFolder(@Req() request: Request, @Param('projectId') projectId: string, @Body() dto: CreateFolderDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.createFolder(user.id, projectId, dto), '文件夹创建成功')
  }

  @Put('projects/:projectId/folders/:folderId')
  async updateFolder(@Req() request: Request, @Param('projectId') projectId: string, @Param('folderId') folderId: string, @Body() dto: UpdateFolderDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.updateFolder(user.id, projectId, folderId, dto), '文件夹更新成功')
  }

  @Delete('projects/:projectId/folders/:folderId')
  async deleteFolder(@Req() request: Request, @Param('projectId') projectId: string, @Param('folderId') folderId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    await this.workspaceService.deleteFolder(user.id, projectId, folderId)
    return ok(null, '文件夹已删除')
  }

  @Get('projects/:projectId')
  async projectDetail(@Req() request: Request & { params: { projectId: string } }) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    const data = await this.workspaceService.getProjectDetail(user.id, request.params.projectId)
    if (!data) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '项目不存在或无权访问' })
    return ok(data, '项目详情获取成功')
  }

  @Put('projects/:projectId')
  async updateProject(@Req() request: Request, @Param('projectId') projectId: string, @Body() dto: UpdateProjectDto) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.updateProject(user.id, projectId, dto), '项目更新成功')
  }

  @Delete('projects/:projectId')
  async deleteProject(@Req() request: Request, @Param('projectId') projectId: string) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    await this.workspaceService.deleteProject(user.id, projectId)
    return ok(null, '项目已删除')
  }

  @Get('nav/teams-projects')
  async navTree(@Req() request: Request) {
    const user = await this.currentUserService.getCurrentUserFromToken(request.cookies?.[SESSION_COOKIE])
    return ok(await this.workspaceService.getTeamProjectsForNav(user.id), '导航数据获取成功')
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.SESSION_COOKIE_SECURE === 'true',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    }
  }
}
