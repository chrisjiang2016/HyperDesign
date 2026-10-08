import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { CollaborationService } from './collaboration.service'

describe('CollaborationService', () => {
  let prisma: any
  let workspace: any
  let service: CollaborationService

  beforeEach(() => {
    prisma = {
      annotationComment: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
      annotation: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    }
    workspace = {
      canAccessPrototypeFile: jest.fn(),
      toFilePermissionResponse: jest.fn((permission) => permission),
    }
    service = new CollaborationService(prisma, workspace)
  })

  const comment = { id: 'comment-1', annotationId: 'annotation-1', createdById: 'author-1', content: 'old', createdBy: { username: '作者' } }

  it('numbers annotations independently for each page', async () => {
    workspace.canAccessPrototypeFile.mockResolvedValue({ permission: { canView: true, canComment: true, canEdit: false, canDelete: false } })
    prisma.prototypePage = { findFirst: jest.fn().mockResolvedValue({ id: 'page-1' }) }
    const numbers = new Map<string, number>()
    prisma.annotation.aggregate = jest.fn(async ({ where }) => ({ _max: { number: numbers.get(where.pageId) ?? null } }))
    prisma.annotation.create = jest.fn(async ({ data }) => {
      numbers.set(data.pageId, data.number)
      return { ...data, id: `annotation-${data.pageId}-${data.number}`, status: 'OPEN', createdAt: new Date(), createdBy: { username: '作者' }, comments: [] }
    })
    prisma.$transaction = jest.fn(async (callback) => callback(prisma))
    const dto = { title: '标注', content: '评论', topPercent: 20, leftPercent: 30, pageScrollTop: 0, pageScrollHeight: 100 }

    const first = await service.createAnnotation('author-1', 'file-1', 'page-1', dto)
    const second = await service.createAnnotation('author-1', 'file-1', 'page-1', dto)
    const otherPage = await service.createAnnotation('author-1', 'file-1', 'page-2', dto)

    expect([first.number, second.number, otherPage.number]).toEqual([1, 2, 1])
    expect(prisma.annotation.aggregate).toHaveBeenLastCalledWith({ where: { fileId: 'file-1', pageId: 'page-2' }, _max: { number: true } })
  })

  it('blocks a read-only shared user from adding a comment', async () => {
    workspace.canAccessPrototypeFile.mockResolvedValue({ permission: { canView: true, canComment: false, canEdit: false, canDelete: false } })
    await expect(service.addComment('guest-1', 'file-1', 'annotation-1', { content: '不能评论' })).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.annotationComment.findFirst).not.toHaveBeenCalled()
  })

  it('allows a comment author to update their own comment', async () => {
    workspace.canAccessPrototypeFile.mockResolvedValue({ permission: { canView: true, canComment: true, canEdit: false, canDelete: false } })
    prisma.annotationComment.findFirst.mockResolvedValue(comment)
    prisma.annotationComment.update.mockResolvedValue({ ...comment, content: 'new value' })
    await expect(service.updateComment('author-1', 'file-1', 'annotation-1', 'comment-1', { content: ' new value ' })).resolves.toMatchObject({ content: 'new value', author: '作者' })
  })

  it('blocks unrelated users from deleting another author comment', async () => {
    workspace.canAccessPrototypeFile.mockResolvedValue({ permission: { canView: true, canComment: true, canEdit: false, canDelete: false } })
    prisma.annotationComment.findFirst.mockResolvedValue({ id: 'comment-1', createdById: 'author-1' })
    await expect(service.deleteComment('reader-1', 'file-1', 'annotation-1', 'comment-1')).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.annotationComment.delete).not.toHaveBeenCalled()
  })

  it('allows a file editor to resolve another user annotation', async () => {
    workspace.canAccessPrototypeFile.mockResolvedValue({ permission: { canView: true, canComment: true, canEdit: true, canDelete: false } })
    prisma.annotation.findFirst.mockResolvedValue({ id: 'annotation-1', createdById: 'author-1', status: 'OPEN' })
    prisma.annotation.update.mockResolvedValue({ id: 'annotation-1', status: 'RESOLVED' })
    await expect(service.toggleResolved('editor-1', 'file-1', 'annotation-1')).resolves.toEqual({ id: 'annotation-1', status: 'resolved' })
  })

  it('returns not found for an annotation outside the current file boundary', async () => {
    workspace.canAccessPrototypeFile.mockResolvedValue({ permission: { canView: true, canComment: true, canEdit: true, canDelete: true } })
    prisma.annotation.findFirst.mockResolvedValue(null)
    await expect(service.deleteAnnotation('editor-1', 'file-1', 'foreign-annotation')).rejects.toBeInstanceOf(NotFoundException)
  })
})
