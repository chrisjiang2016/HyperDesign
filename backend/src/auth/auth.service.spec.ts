import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import * as argon2 from 'argon2'
import { AuthService } from './auth.service'

jest.mock('argon2', () => ({ hash: jest.fn(), verify: jest.fn() }))

const mockedArgon2 = jest.mocked(argon2)

describe('AuthService', () => {
  const baseUser = { id: 'user-1', username: 'tester1', passwordHash: 'hash', role: 'EMPLOYEE', status: 'ACTIVE', lastLoginAt: null }
  let prisma: any
  let service: AuthService

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      session: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
      operationLog: { create: jest.fn().mockResolvedValue({}) },
    }
    service = new AuthService(prisma)
  })

  it('rejects registration when usernames differ before touching persistence', async () => {
    await expect(service.register({ username: 'tester1', confirmUsername: 'tester2', password: 'Demo123456' })).rejects.toBeInstanceOf(ConflictException)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('creates a user and writes an audit record on registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue(baseUser)
    mockedArgon2.hash.mockResolvedValue('new-hash' as never)

    await expect(service.register({ username: 'tester1', confirmUsername: 'tester1', password: 'Demo123456' })).resolves.toMatchObject({ id: 'user-1', role: 'employee', status: 'active' })
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { username: 'tester1', passwordHash: 'new-hash' } })
    expect(prisma.operationLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'AUTH_REGISTER', userId: 'user-1' }) }))
  })

  it('does not disclose whether an unknown username exists on login', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    await expect(service.login({ username: 'tester1', password: 'Demo123456' })).rejects.toBeInstanceOf(UnauthorizedException)
    expect(prisma.operationLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'AUTH_LOGIN_FAILED', userId: null }) }))
  })

  it('blocks disabled users even with a valid password', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, status: 'DISABLED' })
    mockedArgon2.verify.mockResolvedValue(true as never)
    await expect(service.login({ username: 'tester1', password: 'Demo123456' })).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.session.create).not.toHaveBeenCalled()
  })

  it('creates a session only after valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser)
    mockedArgon2.verify.mockResolvedValue(true as never)
    prisma.user.update.mockResolvedValue(baseUser)
    prisma.session.create.mockResolvedValue({})

    const result = await service.login({ username: 'tester1', password: 'Demo123456' })
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(result.user).toMatchObject({ id: 'user-1', role: 'employee' })
    expect(prisma.session.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', token: result.token }) }))
  })

  it('deletes an expired session and rejects the request', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 'session-1', expiresAt: new Date(Date.now() - 1), user: baseUser })
    await expect(service.getCurrentUser('expired-token')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } })
  })
})
