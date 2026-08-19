import { test, expect } from '@playwright/test';
import { generateRandomUsername, login, logout, waitForLoadingComplete } from './helpers';

/** 团队与项目当前可用闭环：成员邀请入口尚处于禁用状态，权限配置由后端 HTTP 集成测试覆盖。 */
test.describe('团队、项目与权限管理', () => {
  const adminUsername = 'admin';
  const adminPassword = 'Demo123456';
  let createdTeamId: string | undefined;

  test.afterEach(async ({ page }) => {
    if (!createdTeamId) return;
    await page.request.delete(`/api/teams/${createdTeamId}`);
    createdTeamId = undefined;
  });

  test('管理员可以创建团队并在团队内创建项目', async ({ page }) => {
    const suffix = Date.now();
    const teamName = `E2ETeam${suffix}`;
    const projectName = `E2EProject${suffix}`;

    await login(page, adminUsername, adminPassword);
    await waitForLoadingComplete(page);

    await page.getByRole('button', { name: '创建团队' }).first().click();
    const dialog = page.getByRole('dialog', { name: '创建团队' });
    await dialog.getByLabel('团队名称').fill(teamName);
    await dialog.getByLabel('团队描述').fill('E2E 团队');
    await dialog.getByRole('button', { name: /创\s*建/ }).click();
    const teamCard = page.locator('.hd-team-card', { hasText: teamName });
    await expect(teamCard).toBeVisible({ timeout: 5000 });
    await teamCard.click();
    await page.waitForURL(/\/teams\//, { timeout: 5000 });
    const teamId = new URL(page.url()).pathname.split('/').at(-1)!;
    createdTeamId = teamId;
    await expect(page.locator('.hd-team-title')).toHaveText(teamName);
    await page.getByRole('button', { name: '新建项目', exact: true }).click();
    const projectDialog = page.getByRole('dialog', { name: '新建项目' });
    await projectDialog.getByLabel('项目名称').fill(projectName);
    await projectDialog.getByLabel('项目描述').fill('E2E 项目');
    await projectDialog.getByRole('button', { name: /创\s*建/ }).click();
    await page.waitForURL(/\/projects\//, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  });

  test('未授权的普通用户不能读取不存在或不可访问的项目', async ({ page }) => {
    const username = generateRandomUsername();
    const password = 'Test123456';
    await page.goto('/register');
    await page.getByRole('textbox', { name: '用户名', exact: true }).fill(username);
    await page.getByRole('textbox', { name: '确认用户名', exact: true }).fill(username);
    await page.getByRole('textbox', { name: '设置密码', exact: true }).fill(password);
    await page.getByRole('textbox', { name: '确认密码', exact: true }).fill(password);
    await page.locator('button.hd-auth-primary-btn').click();
    await page.waitForURL('/login');
    await login(page, username, password);
    // 通过页面同源 request 带上会话 Cookie，避免 page.goto 把 /api 当文档导航时受前端路由/代理时序影响
    const response = await page.request.get('/api/projects/not-accessible-project');
    expect([401, 403, 404]).toContain(response.status());
    await logout(page);
  });
});
