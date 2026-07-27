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
    baseURL: 'http://127.0.0.1:5173',
    
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

  /*
   * 本地 E2E 改为优先复用已启动的前后端服务。
   * 原因：Vite strictPort + Playwright webServer 自动起停在 Windows 上会出现端口争抢，
   * 导致后续用例拿到 ERR_CONNECTION_REFUSED，污染真实失败结果。
   *
   * 推荐本地执行顺序：
   * 1. backend: npm start（3001）
   * 2. frontend: npm run dev -- --host 127.0.0.1 --strictPort（5173）
   * 3. frontend: npm run test:e2e
   */
  webServer: undefined,
});
