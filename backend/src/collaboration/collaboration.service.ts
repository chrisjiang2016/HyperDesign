import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WorkspaceService } from '../auth/current-user.service'
import { CreateAnnotationDto, CreateCommentDto, UpdateCommentDto } from './dto'

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService, private readonly workspace: WorkspaceService) {}

  async listAnnotations(userId: string, fileId: string, pageId?: string) {
    await this.requireView(userId, fileId)
    const annotations = await this.prisma.annotation.findMany({
      where: { fileId, ...(pageId ? { pageId } : {}) },
      include: {
        createdBy: { select: { username: true } },
        comments: {
          where: { parentId: null },
          include: {
            createdBy: { select: { username: true } },
            replies: {
              include: { createdBy: { select: { username: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    })
    return annotations.map((annotation) => this.serializeAnnotation(annotation))
  }

  async createAnnotation(userId: string, fileId: string, pageId: string, dto: CreateAnnotationDto) {
    await this.requireComment(userId, fileId)
    const page = await this.prisma.prototypePage.findFirst({ where: { id: pageId, fileId }, select: { id: true } })
    if (!page) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '原型页面不存在或不属于当前文件' })
    const result = await this.prisma.$transaction(async (tx) => {
      const last = await tx.annotation.aggregate({ where: { fileId }, _max: { number: true } })
      const annotation = await tx.annotation.create({
        data: { fileId, pageId, number: (last._max.number ?? 0) + 1, title: dto.title.trim(), topPercent: dto.topPercent, leftPercent: dto.leftPercent, pageScrollTop: dto.pageScrollTop, pageScrollHeight: dto.pageScrollHeight, createdById: userId, comments: { create: { content: dto.content.trim(), createdById: userId } } },
        include: { createdBy: { select: { username: true } }, comments: { where: { parentId: null }, include: { createdBy: { select: { username: true } }, replies: { include: { createdBy: { select: { username: true } } } } } } },
      })
      return annotation
    })
    return this.serializeAnnotation(result)
  }

  async addComment(userId: string, fileId: string, annotationId: string, dto: CreateCommentDto) {
    await this.requireComment(userId, fileId)
    const annotation = await this.prisma.annotation.findFirst({ where: { id: annotationId, fileId }, select: { id: true } })
    if (!annotation) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '标注不存在或无权访问' })
    if (dto.parentId) {
      const parent = await this.prisma.annotationComment.findFirst({ where: { id: dto.parentId, annotationId }, select: { id: true, parentId: true } })
      if (!parent || parent.parentId) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '回复目标不存在' })
    }
    const comment = await this.prisma.annotationComment.create({ data: { annotationId, parentId: dto.parentId, content: dto.content.trim(), createdById: userId }, include: { createdBy: { select: { username: true } } } })
    return this.serializeComment(comment)
  }

  async toggleResolved(userId: string, fileId: string, annotationId: string) {
    const access = await this.requireView(userId, fileId)
    const annotation = await this.prisma.annotation.findFirst({ where: { id: annotationId, fileId }, select: { id: true, createdById: true, status: true } })
    if (!annotation) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '标注不存在或无权访问' })
    if (annotation.createdById !== userId && !access.canEdit) throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅标注创建者或文件编辑者可变更处理状态' })
    const updated = await this.prisma.annotation.update({ where: { id: annotationId }, data: { status: annotation.status === 'OPEN' ? 'RESOLVED' : 'OPEN' } })
    return { id: updated.id, status: updated.status.toLowerCase() }
  }

  async updateComment(userId: string, fileId: string, annotationId: string, commentId: string, dto: UpdateCommentDto) {
    const access = await this.requireView(userId, fileId)
    const comment = await this.prisma.annotationComment.findFirst({
      where: { id: commentId, annotationId, annotation: { fileId } },
      include: { createdBy: { select: { username: true } } },
    })
    if (!comment) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '评论不存在或无权访问' })
    if (comment.createdById !== userId && !access.canEdit) throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅评论创建者或文件编辑者可编辑评论' })
    const updated = await this.prisma.annotationComment.update({
      where: { id: commentId },
      data: { content: dto.content.trim() },
      include: { createdBy: { select: { username: true } } },
    })
    return this.serializeComment(updated)
  }

  async deleteComment(userId: string, fileId: string, annotationId: string, commentId: string) {
    const access = await this.requireView(userId, fileId)
    const comment = await this.prisma.annotationComment.findFirst({
      where: { id: commentId, annotationId, annotation: { fileId } },
      select: { id: true, createdById: true },
    })
    if (!comment) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '评论不存在或无权访问' })
    if (comment.createdById !== userId && !access.canEdit) throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅评论创建者或文件编辑者可删除评论' })
    await this.prisma.annotationComment.delete({ where: { id: commentId } })
    return { id: commentId }
  }

  async deleteAnnotation(userId: string, fileId: string, annotationId: string) {
    const access = await this.requireView(userId, fileId)
    const annotation = await this.prisma.annotation.findFirst({ where: { id: annotationId, fileId }, select: { id: true, createdById: true } })
    if (!annotation) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '标注不存在或无权访问' })
    if (annotation.createdById !== userId && !access.canEdit) throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '仅标注创建者或文件编辑者可删除标注' })
    await this.prisma.annotation.delete({ where: { id: annotationId } })
    return { id: annotationId }
  }

  private async requireView(userId: string, fileId: string) {
    const file = await this.workspace.canAccessPrototypeFile(userId, fileId)
    if (!file) throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '文件不存在或无权访问' })
    return this.workspace.toFilePermissionResponse(file.permission)
  }

  private async requireComment(userId: string, fileId: string) {
    const permission = await this.requireView(userId, fileId)
    if (!permission.canComment) throw new ForbiddenException({ errorCode: 'FORBIDDEN', message: '没有该文件的评论权限' })
  }

  private serializeComment(comment: any) {
    return { id: comment.id, parentId: comment.parentId, content: comment.content, authorId: comment.createdById, author: comment.createdBy.username, createdAt: comment.createdAt }
  }

  private serializeAnnotation(annotation: any) {
    return {
      id: annotation.id, number: annotation.number, pageId: annotation.pageId, title: annotation.title, topPercent: annotation.topPercent, leftPercent: annotation.leftPercent, pageScrollTop: annotation.pageScrollTop, pageScrollHeight: annotation.pageScrollHeight,
      status: annotation.status.toLowerCase(), authorId: annotation.createdById, author: annotation.createdBy.username, createdAt: annotation.createdAt,
      comments: annotation.comments.map((comment: any) => ({ ...this.serializeComment(comment), replies: comment.replies.map((reply: any) => this.serializeComment(reply)) })),
    }
  }
}
