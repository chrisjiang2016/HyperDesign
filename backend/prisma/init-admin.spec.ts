import * as argon2 from 'argon2'
import { createInitialAdmin, readAdminCredentials } from './init-admin'

describe('initial administrator setup', () => {
  it('accepts production-safe credentials that remain compatible with login validation', () => {
    expect(readAdminCredentials({ ADMIN_USERNAME: 'prodadmin', ADMIN_PASSWORD: 'StrongAdmin2026' })).toEqual({
      username: 'prodadmin',
      password: 'StrongAdmin2026',
    })
  })

  it.each([
    [{}, 'ADMIN_USERNAME'],
    [{ ADMIN_USERNAME: 'root!', ADMIN_PASSWORD: 'StrongAdmin2026' }, 'ADMIN_USERNAME'],
    [{ ADMIN_USERNAME: 'prodadmin', ADMIN_PASSWORD: 'short1A' }, 'ADMIN_PASSWORD'],
    [{ ADMIN_USERNAME: 'prodadmin', ADMIN_PASSWORD: 'alllowercase2026' }, 'ADMIN_PASSWORD'],
    [{ ADMIN_USERNAME: 'prodadmin', ADMIN_PASSWORD: 'PRODADMIN2026Aa' }, 'must not contain'],
  ])('rejects invalid environment values', (env, message) => {
    expect(() => readAdminCredentials(env)).toThrow(message)
  })

  it('creates one active super administrator with a hashed password', async () => {
    const user = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'user-1', ...data })),
    }

    await createInitialAdmin({ username: 'prodadmin', password: 'StrongAdmin2026' }, { user } as never)

    expect(user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: 'prodadmin', role: 'SUPER_ADMIN', status: 'ACTIVE' }),
    })
    const passwordHash = user.create.mock.calls[0][0].data.passwordHash
    expect(passwordHash).not.toBe('StrongAdmin2026')
    await expect(argon2.verify(passwordHash, 'StrongAdmin2026')).resolves.toBe(true)
  })

  it('refuses to overwrite an existing account', async () => {
    const user = {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', username: 'prodadmin' }),
      create: jest.fn(),
    }

    await expect(createInitialAdmin({ username: 'prodadmin', password: 'StrongAdmin2026' }, { user } as never)).rejects.toThrow(
      'refusing to overwrite',
    )
    expect(user.create).not.toHaveBeenCalled()
  })
})
