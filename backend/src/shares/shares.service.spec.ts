import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { SharesService } from './shares.service'

describe('SharesService', () => {
  const now = new Date('2026-07-20T10:00:00.000Z')
  let prisma: any
  let service: SharesService

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(now)
    prisma = {
      prototypeFile: { findUnique: jest.fn() },
      shareLink: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      shareGrant: { upsert: jest.fn() },
      operationLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (callback) => callback({ shareGrant: prisma.shareGrant })),
    }
    service = new SharesService(prisma, {} as never)
  })

  afterEach(() => jest.useRealTimers())

  const managerFile = { id: 'file-1', uploaderId: 'owner-1', permissions: [] }
  const activeLink = { id: 'share-1', fileId: 'file-1', tokenHash: 'ignored', status: 'ACTIVE', expiresAt: new Date('2026-07-27T10:00:00.000Z'), createdById: 'owner-1', createdAt: now, revokedAt: null }

  it('creates a high-entropy token but persists only its hash', async () => {
    prisma.prototypeFile.findUnique.mockResolvedValue(managerFile)
    prisma.shareLink.create.mockImplementation(async ({ data }: any) => ({ id: 'share-1', ...data, status: 'ACTIVE', createdAt: now, revokedAt: null }))

    const result = await service.create('owner-1', 'file-1', 7)
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    const persisted = prisma.shareLink.create.mock.calls[0][0].data
    expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(persisted.tokenHash).not.toBe(result.token)
    expect(persisted.expiresAt).toEqual(new Date('2026-07-27T10:00:00.000Z'))
  })

  it('rejects non-owner and non-editor share management', async () => {
    prisma.prototypeFile.findUnique.mockResolvedValue({ id: 'file-1', uploaderId: 'owner-1', permissions: [{ canEdit: false }] })
    await expect(service.list('member-1', 'file-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('does not expose the token in share link listing', async () => {
    prisma.prototypeFile.findUnique.mockResolvedValue(managerFile)
    prisma.shareLink.findMany.mockResolvedValue([{ ...activeLink, _count: { grants: 2 } }])
    await expect(service.list('owner-1', 'file-1')).resolves.toEqual([expect.objectContaining({ id: 'share-1', acceptedCount: 2 })])
    await expect(service.list('owner-1', 'file-1')).resolves.not.toEqual([expect.objectContaining({ token: expect.anything() })])
  })

  it('allows acceptance only while the link is active and unexpired', async () => {
    prisma.shareLink.findUnique.mockResolvedValue(activeLink)
    prisma.shareGrant.upsert.mockResolvedValue({})
    await expect(service.accept('guest-1', 'valid-token')).resolves.toEqual({ fileId: 'file-1' })
    expect(prisma.shareGrant.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { shareLinkId: 'share-1', userId: 'guest-1' } }))
  })

  it.each([
    [{ ...activeLink, status: 'REVOKED' }, 'revoked'],
    [{ ...activeLink, expiresAt: new Date('2026-07-19T10:00:00.000Z') }, 'expired'],
  ])('rejects %s link during inspection', async (link) => {
    prisma.shareLink.findUnique.mockResolvedValue(link)
    await expect(service.inspect('token')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('revokes an active link and writes an audit entry', async () => {
    prisma.prototypeFile.findUnique.mockResolvedValue(managerFile)
    prisma.shareLink.findFirst.mockResolvedValue(activeLink)
    prisma.shareLink.update.mockResolvedValue({ ...activeLink, status: 'REVOKED', revokedAt: now })
    await expect(service.revoke('owner-1', 'file-1', 'share-1')).resolves.toMatchObject({ status: 'revoked' })
    expect(prisma.operationLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'SHARE_LINK_REVOKED', targetId: 'share-1' }) }))
  })
})
