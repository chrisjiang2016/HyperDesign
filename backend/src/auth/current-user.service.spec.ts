import { ForbiddenException } from '@nestjs/common'
import { WorkspaceService } from './current-user.service'

describe('WorkspaceService team permissions', () => {
  let prisma: any
  let service: WorkspaceService

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      teamMember: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
      team: { findMany: jest.fn(), findUnique: jest.fn() },
      project: { create: jest.fn(), findFirst: jest.fn() },
    }
    service = new WorkspaceService(prisma, {} as any)
  })

  it('allows sub-admins to create projects in their teams', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'SUB_ADMIN' })
    prisma.teamMember.findUnique.mockResolvedValue({ teamId: 'team-1', userId: 'user-1', role: 'MEMBER', canUpload: false })
    prisma.project.create.mockResolvedValue({
      id: 'project-1',
      name: 'Project',
      description: 'Description',
      permissions: [{ level: 'EDIT' }],
    })

    await expect(service.createProject('user-1', 'team-1', { name: 'Project' })).resolves.toMatchObject({ id: 'project-1' })
    expect(prisma.project.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ teamId: 'team-1', permissions: { create: { userId: 'user-1', level: 'EDIT', grantedById: 'user-1' } } }),
    }))
  })

  it('shows sub-admins as team admins and grants project edit access', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'SUB_ADMIN' })
    prisma.teamMember.findFirst.mockResolvedValue({ role: 'MEMBER', team: {
      id: 'team-1', name: 'Team', description: '', icon: '', color: '', members: [],
      projects: [{ id: 'project-1', name: 'Project', description: '', updatedAt: new Date(), permissions: [], _count: { files: 0 }, files: [] }],
    } })

    const detail = await service.getTeamDetail('user-1', 'team-1')
    expect(detail?.roleLabel).toBe('管理员')
    expect(detail?.projects[0].permission).toBe('edit')
  })

  it('does not allow employees without team admin role to create projects', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'EMPLOYEE' })
    prisma.teamMember.findUnique.mockResolvedValue({ teamId: 'team-1', userId: 'user-1', role: 'MEMBER', canUpload: true })

    await expect(service.createProject('user-1', 'team-1', { name: 'Project' })).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.project.create).not.toHaveBeenCalled()
  })
})
