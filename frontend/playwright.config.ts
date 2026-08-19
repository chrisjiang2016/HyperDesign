import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* 单个测试最大超时时间 */
  timeout: 30 * 1000,
  
  /* 每个测试预期超时 */
  expect: {
    timeout: 5000
  },
  
  /* 失败时重试 */
  retries: process.env.CI ? 2 : 0,
  
  /* E2E 先强制串行，避免共享账号/项目/上传解析状态互相污染 */
  fullyParallel: false,
  workers: 1,
  
  /* Reporter */
  reporter: [
    ['html'],
    ['list']
  ],
  
  /* 所有测试共享配置 */
  use: {
    /* 基础 URL */
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8080',
    
    /* 失败时截图 */
    screenshot: 'only-on-failure',
    
    /* 失败时录制视频 */
    video: 'retain-on-failure',
    
    /* 追踪 */
    trace: 'on-first-retry',
  },

  /* 配置测试项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Deployment-prep E2E runs against the production-shaped Docker Web
   * container. This exercises Nginx, the MySQL-backed API, and storage mounts
   * without introducing a separate Vite dev-server lifecycle. */
  webServer: undefined,
});
