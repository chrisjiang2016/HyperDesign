import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { TeamInvitesService } from './team-invites.service'

describe('TeamInvitesService', () => {
  const now = new Date('2026-09-11T04:00:00.000Z')
  let prisma: any
  let workspace: any
  let service: TeamInvitesService

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(now)
    prisma = {
      teamInvite: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      teamMember: { findUnique: jest.fn(), create: jest.fn() },
      operationLog: { create: jest.fn().mockResolvedValue({}) },
    }
    workspace = { isSuperAdmin: jest.fn().mockResolvedValue(false) }
    service = new TeamInvitesService(prisma, workspace)
  })

  afterEach(() => jest.useRealTimers())

  it('creates a 7-day invitation using a hashed token', async () => {
    prisma.teamMember.findUnique.mockResolvedValue({ role: 'ADMIN' })
    prisma.teamInvite.create.mockImplementation(async ({ data }: any) => ({ id: 'invite-1', ...data, status: 'ACTIVE' }))

    const result = await service.create('admin-1', 'team-1')

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(result.expiresAt).toEqual(new Date('2026-09-18T04:00:00.000Z'))
    expect(prisma.teamInvite.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ teamId: 'team-1', createdById: 'admin-1', tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }) }))
  })

  it('denies invitation creation for non-admin members', async () => {
    prisma.teamMember.findUnique.mockResolvedValue({ role: 'MEMBER' })
    await expect(service.create('member-1', 'team-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('adds an invited user as a regular member and is idempotent', async () => {
    prisma.teamInvite.findUnique.mockResolvedValue({ id: 'invite-1', teamId: 'team-1', status: 'ACTIVE', expiresAt: new Date('2026-09-18T04:00:00.000Z'), team: { id: 'team-1', name: '产品团队', description: '协作团队' } })
    prisma.teamMember.findUnique.mockResolvedValue(null)
    prisma.teamMember.create.mockResolvedValue({})

    await expect(service.accept('guest-1', 'valid-token')).resolves.toEqual({ teamId: 'team-1', teamName: '产品团队', alreadyMember: false })
    expect(prisma.teamMember.create).toHaveBeenCalledWith({ data: { teamId: 'team-1', userId: 'guest-1', role: 'MEMBER', canUpload: false } })
  })

  it('rejects an expired invitation', async () => {
    prisma.teamInvite.findUnique.mockResolvedValue({ status: 'ACTIVE', expiresAt: new Date('2026-09-10T04:00:00.000Z') })
    await expect(service.inspect('expired-token')).rejects.toBeInstanceOf(NotFoundException)
  })
})
