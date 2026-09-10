import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import * as argon2 from 'argon2'
import { randomBytes } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service'
import { AdminCreateUserDto, AdminUpdateUserDto, ChangePasswordDto, LoginDto, RegisterDto } from './dto'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    if (dto.username !== dto.confirmUsername) {
      throw new ConflictException({ errorCode: 'VALIDATION_ERROR', message: '两次用户名输入不一致' })
    }

    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (existing) {
      throw new ConflictException({ errorCode: 'DUPLICATE_USERNAME', message: '用户名已存在' })
    }

    const user = await this.prisma.user.create({
      data: { username: dto.username, passwordHash: await argon2.hash(dto.password) },
    })
    await this.log(user.id, 'AUTH_REGISTER', 'user', user.id)
    return this.toPublicUser(user)
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      await this.log(null, 'AUTH_LOGIN_FAILED', 'user', user?.id, dto.username)
      throw new UnauthorizedException({ errorCode: 'INVALID_USERNAME_OR_PASSWORD', message: '用户名或密码错误' })
    }
    if (user.status === 'DISABLED') {
      throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '账号已被禁用' })
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const token = randomBytes(32).toString('base64url')
    await this.prisma.session.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    })
    await this.log(user.id, 'AUTH_LOGIN_SUCCESS', 'user', user.id)
    return { token, user: this.toPublicUser(user) }
  }

  async logout(token?: string) {
    if (token) await this.prisma.session.deleteMany({ where: { token } })
  }

  async getCurrentUser(token?: string) {
    if (!token) throw new UnauthorizedException({ errorCode: 'UNAUTHORIZED', message: '未登录' })
    const session = await this.prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session || session.expiresAt <= new Date() || session.user.status === 'DISABLED') {
      if (session) await this.prisma.session.delete({ where: { id: session.id } })
      throw new UnauthorizedException({ errorCode: 'UNAUTHORIZED', message: '登录已失效' })
    }
    return session.user
  }

  async resetPassword(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user) {
      // Keep the response intentionally non-enumerating; V1 UI can still say request processed.
      return null
    }
    const temporaryPassword = randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10)
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await argon2.hash(temporaryPassword) } })
    await this.prisma.session.deleteMany({ where: { userId: user.id } })
    await this.log(user.id, 'AUTH_PASSWORD_RESET', 'user', user.id)
    return temporaryPassword
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new ConflictException({ errorCode: 'VALIDATION_ERROR', message: '两次新密码输入不一致' })
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(await argon2.verify(user.passwordHash, dto.oldPassword))) {
      throw new UnauthorizedException({ errorCode: 'INVALID_USERNAME_OR_PASSWORD', message: '原密码错误' })
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(dto.newPassword) } })
    await this.prisma.session.deleteMany({ where: { userId, NOT: { token: undefined } } })
    await this.log(userId, 'AUTH_PASSWORD_CHANGED', 'user', userId)
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, username: true, role: true, status: true, lastLoginAt: true, createdAt: true },
    })
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }))
  }

  async createUser(dto: AdminCreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (existing) throw new ConflictException({ errorCode: 'DUPLICATE_USERNAME', message: '用户名已存在' })
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash: await argon2.hash(dto.password),
        role: (dto.role ?? 'employee').toUpperCase() as any,
        status: (dto.status ?? 'active').toUpperCase() as any,
      },
    })
    await this.log(user.id, 'ADMIN_CREATE_USER', 'user', user.id)
    return this.toPublicUser(user)
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '用户不存在' })
    const data: { role?: any; status?: any; passwordHash?: string } = {}
    if (dto.role) data.role = dto.role.toUpperCase() as any
    if (dto.status) data.status = dto.status.toUpperCase() as any
    if (dto.password) data.passwordHash = await argon2.hash(dto.password)
    if (Object.keys(data).length === 0) throw new ConflictException({ errorCode: 'VALIDATION_ERROR', message: '未提供可更新字段' })
    const updated = await this.prisma.user.update({ where: { id }, data })
    await this.log(id, 'ADMIN_UPDATE_USER', 'user', id)
    return this.toPublicUser(updated)
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, username: true } })
    if (!user) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '用户不存在' })
    if (user.username === 'system') throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '系统超级管理员账号不可删除' })
    await this.prisma.session.deleteMany({ where: { userId: id } })
    await this.prisma.user.delete({ where: { id } })
    await this.log(id, 'ADMIN_DELETE_USER', 'user', id)
    return { id }
  }

  private toPublicUser(user: { id: string; username: string; role: string; status: string; lastLoginAt?: Date | null }) {
    return { id: user.id, username: user.username, role: user.role.toLowerCase(), status: user.status.toLowerCase(), lastLoginAt: user.lastLoginAt ?? null }
  }

  private async log(userId: string | null, action: string, targetType?: string, targetId?: string, detail?: string) {
    await this.prisma.operationLog.create({ data: { userId, action, targetType, targetId, detail } })
  }
}
