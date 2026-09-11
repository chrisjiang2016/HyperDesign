import { createHash, randomBytes } from 'node:crypto'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WorkspaceService } from '../auth/current-user.service'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

@Injectable()
export class TeamInvitesService {
  constructor(private readonly prisma: PrismaService, private readonly workspace: WorkspaceService) {}

  async create(userId: string, teamId: string) {
    await this.requireTeamAdmin(userId, teamId)
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const invite = await this.prisma.teamInvite.create({ data: { teamId, tokenHash: hashToken(token), expiresAt, createdById: userId } })
    await this.log(userId, 'TEAM_INVITE_CREATED', teamId, `expiresAt=${expiresAt.toISOString()}`)
    return { id: invite.id, token, expiresAt: invite.expiresAt, status: 'active' as const }
  }

  async revoke(userId: string, teamId: string, inviteId: string) {
    await this.requireTeamAdmin(userId, teamId)
    const invite = await this.prisma.teamInvite.findFirst({ where: { id: inviteId, teamId } })
    if (!invite) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '团队邀请不存在' })
    if (invite.status === 'REVOKED') return { id: invite.id, status: 'revoked' as const, revokedAt: invite.revokedAt }
    const revoked = await this.prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'REVOKED', revokedAt: new Date() } })
    await this.log(userId, 'TEAM_INVITE_REVOKED', teamId, `invite=${invite.id}`)
    return { id: revoked.id, status: 'revoked' as const, revokedAt: revoked.revokedAt }
  }

  async inspect(token: string) {
    const invite = await this.findActiveToken(token)
    return { team: { id: invite.team.id, name: invite.team.name, description: invite.team.description }, expiresAt: invite.expiresAt }
  }

  async accept(userId: string, token: string) {
    const invite = await this.findActiveToken(token)
    const existing = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: invite.teamId, userId } }, select: { id: true } })
    if (!existing) {
      await this.prisma.teamMember.create({ data: { teamId: invite.teamId, userId, role: 'MEMBER', canUpload: false } })
      await this.log(userId, 'TEAM_JOINED_VIA_INVITE', invite.teamId, `invite=${invite.id}`)
    }
    return { teamId: invite.teamId, teamName: invite.team.name, alreadyMember: Boolean(existing) }
  }

  private async requireTeamAdmin(userId: string, teamId: string) {
    if (await this.workspace.isSuperAdmin(userId)) return
    const member = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } }, select: { role: true } })
    if (!member || member.role !== 'ADMIN') throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅团队管理员可管理邀请链接' })
  }

  private async findActiveToken(token: string) {
    const invite = await this.prisma.teamInvite.findUnique({ where: { tokenHash: hashToken(token) }, include: { team: { select: { id: true, name: true, description: true } } } })
    if (!invite || invite.status !== 'ACTIVE' || invite.expiresAt <= new Date()) {
      throw new NotFoundException({ errorCode: 'TEAM_INVITE_UNAVAILABLE', message: '团队邀请链接无效、已过期或已撤销' })
    }
    return invite
  }

  private async log(userId: string, action: string, teamId: string, detail?: string) {
    await this.prisma.operationLog.create({ data: { userId, action, targetType: 'team', targetId: teamId, detail } })
  }
}
