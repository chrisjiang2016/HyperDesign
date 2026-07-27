import { test, expect } from '@playwright/test';
import { generateRandomUsername, login, logout, waitForLoadingComplete } from './helpers';

/** 用户身份认证流程：按当前用户名登录与注册 UI 契约验证。 */
test.describe('用户身份认证流程', () => {
  let testUsername: string;
  const testPassword = 'Test123456';
  const registerUsername = (page: import('@playwright/test').Page) => page.getByRole('textbox', { name: '用户名', exact: true });
  const confirmUsername = (page: import('@playwright/test').Page) => page.getByRole('textbox', { name: '确认用户名', exact: true });
  const registerPassword = (page: import('@playwright/test').Page) => page.getByRole('textbox', { name: '设置密码', exact: true });
  const confirmPassword = (page: import('@playwright/test').Page) => page.getByRole('textbox', { name: '确认密码', exact: true });
  const submitAuth = (page: import('@playwright/test').Page) => page.locator('button.hd-auth-primary-btn');

  test.beforeEach(() => { testUsername = generateRandomUsername(); });

  test('应该完成注册 → 登录 → 会话恢复 → 登出的完整流程', async ({ page }) => {
    await test.step('用户注册', async () => {
      await page.goto('/register');
      await registerUsername(page).fill(testUsername);
      await confirmUsername(page).fill(testUsername);
      await registerPassword(page).fill(testPassword);
      await confirmPassword(page).fill(testPassword);
      await submitAuth(page).click();
      await page.waitForURL('/login', { timeout: 5000 });
    });
    await test.step('用户登录', async () => {
      // 重新导航到登录页，等待 Ant Design 初始值完成后再覆盖账号字段，避免路由切换时的表单初始化竞争。
      await login(page, testUsername, testPassword);
      await expect(page.getByText(testUsername, { exact: true })).toBeVisible();
    });
    await test.step('会话恢复', async () => {
      await page.reload();
      await waitForLoadingComplete(page);
      await expect(page).toHaveURL('/');
      await expect(page.getByText(testUsername, { exact: true })).toBeVisible();
    });
    await test.step('用户登出', async () => {
      await logout(page);
      await page.goto('/');
      await page.waitForURL('/login', { timeout: 5000 });
    });
  });

  test('应该阻止未登录用户访问受保护页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page.getByRole('textbox', { name: '用户名', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '密码', exact: true })).toBeVisible();
  });

  test('应该拒绝错误的登录凭据', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: '用户名', exact: true }).fill('notexist');
    await page.getByRole('textbox', { name: '密码', exact: true }).fill('wrongpassword');
    await submitAuth(page).click();
    await expect(page.locator('.hd-auth-error')).toBeVisible({ timeout: 3000 });
    await expect(page).toHaveURL('/login');
  });

  test('应该验证注册表单必填项', async ({ page }) => {
    await page.goto('/register');
    await submitAuth(page).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
    await expect(page).toHaveURL('/register');
  });

  test('应该验证密码确认必须一致', async ({ page }) => {
    await page.goto('/register');
    await registerUsername(page).fill(testUsername);
    await confirmUsername(page).fill(testUsername);
    await registerPassword(page).fill(testPassword);
    await confirmPassword(page).fill('Different123');
    await submitAuth(page).click();
    await expect(page.getByText('两次输入的密码不一致', { exact: true })).toBeVisible({ timeout: 3000 });
  });
});
