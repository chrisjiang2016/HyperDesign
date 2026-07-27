import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

const databasePath = join(process.cwd(), 'prisma', 'integration-test.db')

export default async function globalSetup() {
  if (existsSync(databasePath)) await rm(databasePath, { force: true })
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: 'file:./integration-test.db' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
}
