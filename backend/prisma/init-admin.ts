import { PrismaClient, SystemRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()
const usernamePattern = /^[A-Za-z0-9]{5,64}$/
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z0-9]{12,128}$/

export function readAdminCredentials(env: NodeJS.ProcessEnv) {
  const username = env.ADMIN_USERNAME?.trim()
  const password = env.ADMIN_PASSWORD

  if (!username || !usernamePattern.test(username)) {
    throw new Error('ADMIN_USERNAME must contain 5-64 ASCII letters or digits')
  }
  if (!password || !passwordPattern.test(password)) {
    throw new Error('ADMIN_PASSWORD must contain 12-128 ASCII letters or digits, including uppercase, lowercase and a number')
  }
  if (password.toLowerCase().includes(username.toLowerCase())) {
    throw new Error('ADMIN_PASSWORD must not contain ADMIN_USERNAME')
  }

  return { username, password }
}

export async function createInitialAdmin(
  credentials: { username: string; password: string },
  client: Pick<PrismaClient, 'user'> = prisma,
) {
  const existing = await client.user.findUnique({ where: { username: credentials.username } })
  if (existing) {
    throw new Error(`User '${credentials.username}' already exists; refusing to overwrite credentials or privileges`)
  }

  return client.user.create({
    data: {
      username: credentials.username,
      passwordHash: await argon2.hash(credentials.password),
      role: SystemRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  })
}

async function main() {
  const credentials = readAdminCredentials(process.env)
  const admin = await createInitialAdmin(credentials)
  console.log(`Initial administrator '${admin.username}' created`)
}

if (require.main === module) {
  void main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
    .finally(async () => prisma.$disconnect())
}
