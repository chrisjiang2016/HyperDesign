import { createHash, randomBytes } from 'node:crypto'
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WorkspaceService } from '../auth/current-user.service'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export type ShareAccessTypeInput = 'VIEW_ONLY' | 'JOIN_TEAM'

@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService, private readonly workspace: WorkspaceService) {}

  async create(userId: string, fileId: string, expiresInDays: number, accessType: ShareAccessTypeInput = 'VIEW_ONLY') {
    await this.requireFileManager(userId, fileId)
    // 「加入团队」类型会提升对方权限，必须确认该文件确实归属某个团队，否则无从加入
    if (accessType === 'JOIN_TEAM') {
      const teamId = await this.resolveTeamId(fileId)
      if (!teamId) {
        throw new BadRequestException({ errorCode: 'SHARE_TEAM_UNAVAILABLE', message: '该原型未归属任何团队，无法创建「加入团队」类型的分享链接' })
      }
    }
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    const link = await this.prisma.shareLink.create({ data: { fileId, tokenHash: hashToken(token), token, expiresAt, createdById: userId, accessType } })
    await this.log(userId, 'SHARE_LINK_CREATED', 'share_link', link.id, `file=${fileId};expiresAt=${expiresAt.toISOString()};accessType=${accessType}`)
    return { id: link.id, token, expiresAt: link.expiresAt, status: 'active' as const, accessType: link.accessType }
  }

  async list(userId: string, fileId: string) {
    await this.requireFileManager(userId, fileId)
    const links = await this.prisma.shareLink.findMany({ where: { fileId }, include: { _count: { select: { grants: true } } }, orderBy: { createdAt: 'desc' } })
    return links.map((link) => this.serialize(link))
  }

  async revoke(userId: string, fileId: string, shareId: string) {
    await this.requireFileManager(userId, fileId)
    const link = await this.prisma.shareLink.findFirst({ where: { id: shareId, fileId } })
    if (!link) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '分享链接不存在' })
    if (link.status === 'REVOKED') return this.serialize(link)
    const revoked = await this.prisma.shareLink.update({ where: { id: shareId }, data: { status: 'REVOKED', revokedAt: new Date() } })
    await this.log(userId, 'SHARE_LINK_REVOKED', 'share_link', shareId)
    return this.serialize(revoked)
  }

  async inspect(token: string) {
    const link = await this.findActiveToken(token)
    const file = await this.prisma.prototypeFile.findUnique({ where: { id: link.fileId }, select: { id: true, name: true, pageCount: true, project: { select: { name: true, team: { select: { name: true } } } } } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '分享目标已不存在' })
    return {
      file: { id: file.id, name: file.name, pageCount: file.pageCount, projectName: file.project?.name ?? '未归档项目' },
      expiresAt: link.expiresAt,
      accessType: link.accessType,
      teamName: file.project?.team?.name ?? null,
    }
  }

  async accept(userId: string, token: string) {
    const link = await this.findActiveToken(token)
    const joinTeam = link.accessType === 'JOIN_TEAM'
    const teamId = joinTeam ? await this.resolveTeamId(link.fileId) : null

    await this.prisma.$transaction(async (tx) => {
      await tx.shareGrant.upsert({ where: { shareLinkId_userId: { shareLinkId: link.id, userId } }, update: {}, create: { shareLinkId: link.id, userId } })
      // 「加入团队」类型：把接受者加为团队普通成员；已是成员则保持其现有角色不变（避免把管理员降级）
      if (teamId) {
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId, userId } },
          update: {},
          create: { teamId, userId, role: 'MEMBER' },
        })
      }
    })

    await this.log(userId, 'SHARE_LINK_ACCEPTED', 'share_link', link.id, `file=${link.fileId};accessType=${link.accessType}${teamId ? `;joinedTeam=${teamId}` : ''}`)
    if (teamId) await this.log(userId, 'TEAM_JOINED_VIA_SHARE', 'team', teamId, `shareLink=${link.id}`)
    return { fileId: link.fileId, accessType: link.accessType, joinedTeamId: teamId }
  }

  /** 通过文件反查所属团队；未归档文件（projectId 为空）返回 null */
  private async resolveTeamId(fileId: string) {
    const file = await this.prisma.prototypeFile.findUnique({ where: { id: fileId }, select: { project: { select: { teamId: true } } } })
    return file?.project?.teamId ?? null
  }

  private async requireFileManager(userId: string, fileId: string) {
    const file = await this.prisma.prototypeFile.findUnique({ where: { id: fileId }, select: { id: true, uploaderId: true, permissions: { where: { userId }, select: { canEdit: true } } } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '文件不存在' })
    if (file.uploaderId === userId || file.permissions[0]?.canEdit) return
    // 平台级超级管理员拥有全局数据权限，可管理任意文件的分享链接
    if (await this.workspace.isSuperAdmin(userId)) return
    throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅文件上传者或编辑者可管理分享链接' })
  }

  private async findActiveToken(token: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { tokenHash: hashToken(token) } })
    if (!link || link.status !== 'ACTIVE' || link.expiresAt <= new Date()) {
      throw new NotFoundException({ errorCode: 'SHARE_LINK_UNAVAILABLE', message: '分享链接无效、已过期或已撤销' })
    }
    return link
  }

  private serialize(link: { id: string; status: string; accessType: string; expiresAt: Date; createdAt: Date; revokedAt: Date | null; token: string; _count?: { grants: number } }) {
    return { id: link.id, status: link.status.toLowerCase(), accessType: link.accessType, expiresAt: link.expiresAt, createdAt: link.createdAt, revokedAt: link.revokedAt, token: link.token, acceptedCount: link._count?.grants ?? 0 }
  }

  private async log(userId: string | null, action: string, targetType?: string, targetId?: string, detail?: string) {
    await this.prisma.operationLog.create({ data: { userId, action, targetType, targetId, detail } })
  }
}
