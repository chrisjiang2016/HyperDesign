import { execFileSync } from 'node:child_process'

export default async function globalSetup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is required for integration tests')
  }

  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'reset', '--force', '--skip-seed', '--skip-generate'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
}
