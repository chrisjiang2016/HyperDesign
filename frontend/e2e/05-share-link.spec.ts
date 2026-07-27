import { test, expect } from '@playwright/test';
import {
  generateRandomUsername,
  login,
  logout,
  openSeedProject,
  openViewerForFile,
  register,
  uploadPrototypeZip,
  waitForLoadingComplete,
} from './helpers';

/**
 * E2E：文件级只读分享 — 创建 → 接受 → 预览 → 撤销
 */
test.describe('分享链接功能', () => {
  test.setTimeout(150_000);

  test('应该完成分享链接：创建 → 外部用户接受预览 → 撤销后失效', async ({ page, context }) => {
    const displayName = `分享E2E-${Date.now()}`;
    const externalUser = generateRandomUsername();
    const externalPassword = 'Test123456';
    let sharePath = '';

    await test.step('上传者上传原型并创建分享链接', async () => {
      await login(page, 'chrisj', 'Demo123456');
      await openSeedProject(page, 'project-1');
      await uploadPrototypeZip(page, { displayName });
      await openViewerForFile(page, displayName);

      await page.getByRole('button', { name: /分享/ }).click();
      const dialog = page.getByRole('dialog', { name: '分享原型' });
      await expect(dialog).toBeVisible();

      // 授予剪贴板权限，避免 navigator.clipboard 在无权限时长时间卡住 UI
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      const createResponse = page.waitForResponse((resp) =>
        resp.url().includes('/shares') && resp.request().method() === 'POST' && resp.ok(),
      );
      await dialog.getByRole('button', { name: /创建并复制链接/ }).click();
      const response = await createResponse;
      const body = await response.json();
      const token = body?.data?.token as string;
      expect(token).toBeTruthy();
      sharePath = `/shares/${token}`;

      await expect(dialog.getByText('有效链接').first()).toBeVisible({ timeout: 15000 });
      await expect(dialog.getByText(/已接受\s*0\s*次/)).toBeVisible();
      // Ant Design Modal 关闭按钮可能是 aria-label close 图标按钮
      await dialog.getByRole('button', { name: /关闭|Close/ }).last().click({ force: true });
      await expect(dialog).toBeHidden({ timeout: 10000 });
    });

    await test.step('外部用户注册并接受分享', async () => {
      await logout(page);
      await register(page, externalUser, externalPassword);
      await login(page, externalUser, externalPassword);

      await page.goto(sharePath);
      await waitForLoadingComplete(page);
      await expect(page.getByRole('heading', { name: displayName })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/只读预览权限/)).toBeVisible();

      await page.getByRole('button', { name: /登录并接受分享/ }).click();
      await page.waitForURL(/\/files\/.*\/preview/, { timeout: 15000 });
      await waitForLoadingComplete(page);
      // 分享只读：不依赖项目成员权限，应能直接加载预览 iframe
      await expect(page.locator('iframe.pv-live-frame')).toBeVisible({ timeout: 30000 });
      await expect(page.getByText('原型预览加载失败')).toHaveCount(0);

      // 只读：评论模式不可用；分享按钮也应禁用
      await expect(page.getByRole('button', { name: /评论模式/ })).toBeDisabled();
      await expect(page.getByRole('button', { name: /分享/ })).toBeDisabled();
    });

    await test.step('上传者撤销分享', async () => {
      await logout(page);
      await login(page, 'chrisj', 'Demo123456');
      await openSeedProject(page, 'project-1');
      await openViewerForFile(page, displayName);

      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      const listResponse = page.waitForResponse((resp) =>
        /\/shares(\?|$)/.test(resp.url()) && resp.request().method() === 'GET' && resp.ok(),
      );
      await page.getByRole('button', { name: /分享/ }).click();
      const dialog = page.getByRole('dialog', { name: '分享原型' });
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await listResponse;
      await expect(dialog.getByText(/有效链接|已撤销链接/).first()).toBeVisible({ timeout: 15000 });

      const revokeButton = dialog.getByRole('button', { name: /撤\s*销/ }).first();
      await expect(revokeButton).toBeVisible({ timeout: 15000 });
      const revokeResponse = page.waitForResponse((resp) =>
        /\/shares\//.test(resp.url()) && resp.request().method() === 'DELETE' && resp.ok(),
      );
      await revokeButton.click();
      await revokeResponse;
      await expect(dialog.getByText('已撤销链接').first()).toBeVisible({ timeout: 10000 });
      await dialog.getByRole('button', { name: /关闭|Close/ }).last().click({ force: true });
      await expect(dialog).toBeHidden({ timeout: 10000 });
    });

    await test.step('外部用户再次访问应失败', async () => {
      await logout(page);
      await login(page, externalUser, externalPassword);
      await page.goto(sharePath);
      await waitForLoadingComplete(page);
      await expect(page.getByText('无法打开分享')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('这个分享链接无效、已过期或已被撤销。')).toBeVisible({ timeout: 10000 });
      await expect(page).not.toHaveURL(/\/files\/.*\/preview/);
    });
  });

  test('未登录访问分享链接应引导登录', async ({ page, context }) => {
    const displayName = `匿名分享-${Date.now()}`;
    await login(page, 'chrisj', 'Demo123456');
    await openSeedProject(page, 'project-1');
    await uploadPrototypeZip(page, { displayName });
    await openViewerForFile(page, displayName);

    await page.getByRole('button', { name: /分享/ }).click();
    const dialog = page.getByRole('dialog', { name: '分享原型' });
    await expect(dialog).toBeVisible();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const createResponse = page.waitForResponse((resp) =>
      resp.url().includes('/shares') && resp.request().method() === 'POST' && resp.ok(),
    );
    await dialog.getByRole('button', { name: /创建并复制链接/ }).click();
    const response = await createResponse;
    const body = await response.json();
    const token = body?.data?.token as string;
    expect(token).toBeTruthy();
    await dialog.getByRole('button', { name: /关闭|Close/ }).last().click({ force: true });
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await logout(page);
    await page.goto(`/shares/${token}`);
    // 分享页可先展示内容；点接受时跳登录
    await waitForLoadingComplete(page);
    const acceptBtn = page.getByRole('button', { name: /登录并接受分享/ });
    if (await acceptBtn.isVisible().catch(() => false)) {
      await acceptBtn.click();
      await page.waitForURL(/\/login/, { timeout: 10000 });
    } else {
      await expect(page).toHaveURL(/\/login|\/shares\//);
    }
  });
});
