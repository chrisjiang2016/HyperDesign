import { test, expect } from '@playwright/test';
import {
  generateRandomUsername,
  login,
  openSeedProject,
  openViewerForFile,
  logout,
  uploadPrototypeZip,
  waitForLoadingComplete,
} from './helpers';

/**
 * E2E：Viewer 评论模式 + 返回项目
 * Inspector 依赖 iframe postMessage，本轮聚焦可稳定验证的评论持久化链路。
 */
test.describe('实时标注与评论功能', () => {
  test.setTimeout(120_000);

  test('应该能够从 Viewer 返回项目工作台', async ({ page }) => {
    const username = generateRandomUsername();
    const password = 'Test123456';
    const teamName = `ViewerBackTeam-${Date.now()}`;
    const projectName = `ViewerBackProject-${Date.now()}`;

    await page.goto('/register');
    await page.getByRole('textbox', { name: '用户名', exact: true }).fill(username);
    await page.getByRole('textbox', { name: '确认用户名', exact: true }).fill(username);
    await page.getByRole('textbox', { name: '设置密码', exact: true }).fill(password);
    await page.getByRole('textbox', { name: '确认密码', exact: true }).fill(password);
    await page.locator('button.hd-auth-primary-btn').click();
    await page.waitForURL('/login');

    await login(page, username, password);
    await waitForLoadingComplete(page);

    await page.getByRole('button', { name: '创建团队' }).first().click();
    const teamDialog = page.getByRole('dialog', { name: '创建团队' });
    await teamDialog.getByLabel('团队名称').fill(teamName);
    await teamDialog.getByLabel('团队描述').fill('Viewer back navigation E2E');
    await teamDialog.getByRole('button', { name: /创\s*建/ }).click();

    const teamCard = page.locator('.hd-team-card', { hasText: teamName });
    await expect(teamCard).toBeVisible({ timeout: 10000 });
    await teamCard.click();
    await page.waitForURL(/\/teams\//, { timeout: 10000 });
    await expect(page.locator('.hd-team-title')).toHaveText(teamName);

    await page.getByRole('button', { name: '新建项目', exact: true }).click();
    const projectDialog = page.getByRole('dialog', { name: '新建项目' });
    await projectDialog.getByLabel('项目名称').fill(projectName);
    await projectDialog.getByLabel('项目描述').fill('Viewer back navigation project');
    await projectDialog.getByRole('button', { name: /创\s*建/ }).click();
    await page.waitForURL(/\/projects\//, { timeout: 10000 });
    await expect(page.locator('.hd-project-hero')).toBeVisible({ timeout: 10000 });

    const displayName = await uploadPrototypeZip(page, {
      displayName: `返回项目E2E-${Date.now()}`,
    });
    await openViewerForFile(page, displayName);

    const backButton = page.getByTestId('viewer-back-to-project');
    await expect(backButton).toBeVisible({ timeout: 10000 });
    const viewerUrl = page.url();
    await backButton.click();

    // The Viewer URL contains `/api/preview/...` in an iframe, so assert the
    // browser pathname instead of matching its full URL with a loose regexp.
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15000 })
      .toMatch(/^\/projects\/[^/]+$/);
    await waitForLoadingComplete(page);
    expect(page.url()).not.toBe(viewerUrl);
    await expect(page).toHaveURL(new RegExp(`/projects/[^/]+$`));
    await expect(page.locator('.hd-project-hero')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.hd-project-kicker')).toContainText('项目工作台');
    await expect(page.locator('.hd-asset-row', { hasText: displayName })).toBeVisible({ timeout: 10000 });

    await logout(page);
  });

  test('应该完成评论模式：点位 → 创建标注 → 回复 → 刷新后保留', async ({ page }) => {
    const displayName = `评论E2E-${Date.now()}`;
    const commentText = `E2E 测试评论 ${Date.now()}`;
    const replyText = `E2E 测试回复 ${Date.now()}`;

    await login(page, 'chrisj', 'Demo123456');
    await openSeedProject(page, 'project-1');
    await uploadPrototypeZip(page, { displayName });
    await openViewerForFile(page, displayName);

    await test.step('开启评论模式并落点草稿', async () => {
      const commentBtn = page.getByRole('button', { name: /评论模式/ });
      await expect(commentBtn).toBeEnabled({ timeout: 10000 });
      await commentBtn.click();
      await expect(commentBtn).toHaveClass(/is-active/);
      await expect(page.getByText('评论模式中')).toBeVisible();

      const overlay = page.locator('.pv-overlay-layer');
      await expect(overlay).toBeVisible();
      await overlay.dispatchEvent('pointerdown', {
        clientX: 420,
        clientY: 320,
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: 1,
      });

      // 使用真实坐标点击更稳：按 overlay 中心点
      const box = await overlay.boundingBox();
      expect(box).toBeTruthy();
      await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.4);
      await page.mouse.down();
      await page.mouse.up();

      await expect(page.locator('.pv-comment-marker.is-draft')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.pv-draft-tip')).toContainText('草稿位置');
      await expect(page.getByPlaceholder('输入对这个位置的评论...')).toBeVisible();
    });

    await test.step('创建标注并持久化', async () => {
      await page.getByPlaceholder('输入对这个位置的评论...').fill(commentText);
      const createResponse = page.waitForResponse((resp) =>
        resp.url().includes('/annotations') && resp.request().method() === 'POST' && resp.status() < 300,
      );
      await page.getByRole('button', { name: '创建标注' }).click();
      await createResponse;
      await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 8000 });
      await expect(page.locator('.pv-comment-item').filter({ hasText: commentText })).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.pv-comment-marker').first()).toBeVisible();
    });

    await test.step('回复已有标注', async () => {
      // 创建标注后会自动选中；handleMarkerSelect 是 toggle，已激活时再点会取消
      const commentItem = page.locator('.pv-comment-item').filter({ hasText: commentText });
      await expect(commentItem).toBeVisible({ timeout: 10000 });
      if (!(await commentItem.evaluate((el) => el.classList.contains('is-active')))) {
        await commentItem.click();
      }
      await expect(page.getByPlaceholder(/回复标注 #/)).toBeVisible({ timeout: 8000 });
      await page.getByPlaceholder(/回复标注 #/).fill(replyText);
      const replyResponse = page.waitForResponse((resp) =>
        resp.url().includes('/comments') && resp.request().method() === 'POST' && resp.ok(),
      );
      await page.getByRole('button', { name: '发送回复' }).click();
      await replyResponse;
      await expect(page.locator('.pv-reply-item').filter({ hasText: replyText })).toBeVisible({ timeout: 10000 });
    });

    await test.step('刷新后评论与回复仍在', async () => {
      await page.reload();
      await waitForLoadingComplete(page);
      await expect(page.locator('iframe.pv-live-frame')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('.pv-comment-item').filter({ hasText: commentText })).toBeVisible({ timeout: 15000 });
      await page.locator('.pv-comment-item').filter({ hasText: commentText }).click();
      await expect(page.locator('.pv-reply-item').filter({ hasText: replyText })).toBeVisible({ timeout: 10000 });
    });

    // 返回项目链路单独追踪；本用例专注覆盖评论模式、标注持久化、回复与刷新保留。
  });

  test('无评论权限时评论模式按钮应禁用', async ({ page }) => {
    // project-2 对 chrisj 是 VIEW；若无文件则跳过业务断言
    await login(page, 'chrisj', 'Demo123456');
    await page.goto('/projects/project-2');
    await waitForLoadingComplete(page);

    const successRow = page.locator('.hd-asset-row', { hasText: '解析完成' }).first();
    if (!(await successRow.count())) {
      test.skip(true, 'project-2 暂无已解析文件，跳过权限按钮断言');
      return;
    }

    const name = (await successRow.locator('.hd-asset-title').innerText()).trim();
    await openViewerForFile(page, name);
    const commentBtn = page.getByRole('button', { name: /评论模式/ });
    await expect(commentBtn).toBeDisabled();
  });

  test('开启实时标注后模式文案切换为规格面板', async ({ page }) => {
    await login(page, 'chrisj', 'Demo123456');
    await openSeedProject(page, 'project-1');
    const displayName = await uploadPrototypeZip(page, { displayName: `InspectorE2E-${Date.now()}` });
    await openViewerForFile(page, displayName);

    await page.getByRole('button', { name: /实时标注/ }).click();
    await expect(page.getByRole('button', { name: /实时标注/ })).toHaveClass(/is-active/);
    await expect(page.getByText('规格面板已开启')).toBeVisible();
    await expect(page.getByText('检查器')).toBeVisible();
  });
});
