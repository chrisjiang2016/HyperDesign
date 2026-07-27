import { createHash, randomBytes } from 'node:crypto'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WorkspaceService } from '../auth/current-user.service'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService, private readonly workspace: WorkspaceService) {}

  async create(userId: string, fileId: string, expiresInDays: number) {
    await this.requireFileManager(userId, fileId)
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    const link = await this.prisma.shareLink.create({ data: { fileId, tokenHash: hashToken(token), expiresAt, createdById: userId } })
    await this.log(userId, 'SHARE_LINK_CREATED', 'share_link', link.id, `file=${fileId};expiresAt=${expiresAt.toISOString()}`)
    return { id: link.id, token, expiresAt: link.expiresAt, status: 'active' as const }
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
    const file = await this.prisma.prototypeFile.findUnique({ where: { id: link.fileId }, select: { id: true, name: true, pageCount: true, project: { select: { name: true } } } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '分享目标已不存在' })
    return { file: { id: file.id, name: file.name, pageCount: file.pageCount, projectName: file.project?.name ?? '未归档项目' }, expiresAt: link.expiresAt }
  }

  async accept(userId: string, token: string) {
    const link = await this.findActiveToken(token)
    await this.prisma.$transaction(async (tx) => {
      await tx.shareGrant.upsert({ where: { shareLinkId_userId: { shareLinkId: link.id, userId } }, update: {}, create: { shareLinkId: link.id, userId } })
    })
    await this.log(userId, 'SHARE_LINK_ACCEPTED', 'share_link', link.id, `file=${link.fileId}`)
    return { fileId: link.fileId }
  }

  private async requireFileManager(userId: string, fileId: string) {
    const file = await this.prisma.prototypeFile.findUnique({ where: { id: fileId }, select: { id: true, uploaderId: true, permissions: { where: { userId }, select: { canEdit: true } } } })
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '文件不存在' })
    if (file.uploaderId !== userId && !file.permissions[0]?.canEdit) throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅文件上传者或编辑者可管理分享链接' })
  }

  private async findActiveToken(token: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { tokenHash: hashToken(token) } })
    if (!link || link.status !== 'ACTIVE' || link.expiresAt <= new Date()) {
      throw new NotFoundException({ errorCode: 'SHARE_LINK_UNAVAILABLE', message: '分享链接无效、已过期或已撤销' })
    }
    return link
  }

  private serialize(link: { id: string; status: string; expiresAt: Date; createdAt: Date; revokedAt: Date | null; _count?: { grants: number } }) {
    return { id: link.id, status: link.status.toLowerCase(), expiresAt: link.expiresAt, createdAt: link.createdAt, revokedAt: link.revokedAt, acceptedCount: link._count?.grants ?? 0 }
  }

  private async log(userId: string | null, action: string, targetType?: string, targetId?: string, detail?: string) {
    await this.prisma.operationLog.create({ data: { userId, action, targetType, targetId, detail } })
  }
}
