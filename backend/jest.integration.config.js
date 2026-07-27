/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.integration-spec\.ts$',
  transform: { '^.+\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  testEnvironment: 'node',
  clearMocks: true,
  globalSetup: '<rootDir>/test/integration.global-setup.ts',
  globalTeardown: '<rootDir>/test/integration.global-teardown.ts',
  testTimeout: 30000,
}
