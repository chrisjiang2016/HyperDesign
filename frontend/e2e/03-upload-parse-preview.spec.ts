import { test, expect } from '@playwright/test';
import {
  login,
  openSeedProject,
  openViewerForFile,
  samplePrototypeZip,
  uploadPrototypeZip,
  waitForLoadingComplete,
  notAZipFile,
  emptyZip,
} from './helpers';

/**
 * E2E：ZIP 上传 → 解析 → 页面目录 → iframe 预览
 * 选择器对齐当前 ProjectDetail / Viewer 真实 DOM。
 */
test.describe('文件上传、解析与预览', () => {
  test.setTimeout(120_000);

  test('应该完成 ZIP 上传 → 解析 → Viewer iframe 预览，并正确展示中文显示名', async ({ page }) => {
    const displayName = `HSB2B-小程序-演示版本-${Date.now()}`;

    await login(page, 'chrisj', 'Demo123456');
    await openSeedProject(page, 'project-1');

    await test.step('上传并等待解析完成', async () => {
      await uploadPrototypeZip(page, {
        zipPath: samplePrototypeZip,
        displayName,
      });
      const row = page.locator('.hd-asset-row', { hasText: displayName }).first();
      await expect(row.locator('.hd-asset-title')).toHaveText(displayName);
      await expect(row).toContainText('解析完成');
      await expect(row).toContainText(/个页面/);
    });

    await test.step('进入 Viewer 并验证 iframe / 页面目录', async () => {
      await openViewerForFile(page, displayName);
      await expect(page.locator('.pv-title')).toContainText(displayName);
      await expect(page.locator('.pv-page-item').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('iframe.pv-live-frame')).toBeVisible({ timeout: 20000 });
    });

    await test.step('切换页面与设备模式', async () => {
      const pages = page.locator('.pv-page-item');
      const pageCount = await pages.count();
      if (pageCount > 1) {
        await pages.nth(1).click();
        await expect(pages.nth(1)).toHaveClass(/is-active/);
      }

      await page.getByRole('button', { name: '移动', exact: true }).click();
      await expect(page.locator('.pv-frame-shell--mobile')).toBeVisible();
      await page.getByRole('button', { name: '桌面', exact: true }).click();
      await expect(page.locator('.pv-frame-shell--desktop')).toBeVisible();
    });

    await test.step('缩放控件可用', async () => {
      const zoomValue = page.locator('.pv-zoom-value');
      await expect(zoomValue).toContainText('100%');
      await page.locator('.pv-zoom-btn').nth(1).click();
      await expect(zoomValue).not.toHaveText('100%');
    });

    // “返回项目工作台”单独由评论用例覆盖，避免把上传/解析/预览主链和
    // 当前较脆弱的跨页切换时序绑死在一个用例里。
  });

  test('应该拒绝上传非 ZIP 文件', async ({ page }) => {
    await login(page, 'chrisj', 'Demo123456');
    await openSeedProject(page, 'project-1');

    await page.getByRole('button', { name: /上传 ZIP|上传 HTML 原型 ZIP/ }).first().click();
    const dialog = page.getByRole('dialog', { name: '上传原型 ZIP' });
    await expect(dialog).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: '选择 ZIP 文件' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(notAZipFile);

    // Ant Design Upload accept=.zip 会过滤；若仍选中，提交应失败或无法上传成功
    const okButton = dialog.getByRole('button', { name: /上传并解析/ });
    if (await okButton.isEnabled()) {
      await okButton.click();
      // 后端或前端应给出错误，不应出现“解析完成”
      await expect(page.locator('.ant-message-error, .ant-form-item-explain-error, .ant-message-warning').first()).toBeVisible({ timeout: 8000 }).catch(async () => {
        // 某些浏览器 file input accept 会直接阻止选中，此时对话框仍打开且无新资产
        await expect(dialog).toBeVisible();
      });
    }
  });

  test('应该正确处理无法解析的 ZIP', async ({ page }) => {
    await login(page, 'chrisj', 'Demo123456');
    await openSeedProject(page, 'project-1');

    const displayName = `空ZIP-${Date.now()}`;
    await page.getByRole('button', { name: /上传 ZIP|上传 HTML 原型 ZIP/ }).first().click();
    const dialog = page.getByRole('dialog', { name: '上传原型 ZIP' });
    await dialog.getByLabel('显示名称').fill(displayName);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: '选择 ZIP 文件' }).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(emptyZip);

    await dialog.getByRole('button', { name: /上传并解析/ }).click();

    const row = page.locator('.hd-asset-row', { hasText: displayName }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => (await row.innerText()).includes('解析失败'), {
        timeout: 60000,
        intervals: [1000, 2000, 3000],
      })
      .toBe(true);
  });

  test('匿名访问预览资源应返回 401', async ({ page, context, baseURL }) => {
    await login(page, 'chrisj', 'Demo123456');
    await openSeedProject(page, 'project-1');
    const displayName = await uploadPrototypeZip(page, {
      displayName: `匿名预览拒绝-${Date.now()}`,
    });
    await openViewerForFile(page, displayName);

    const iframe = page.locator('iframe.pv-live-frame');
    await expect(iframe).toBeVisible({ timeout: 20000 });
    const src = await iframe.getAttribute('src');
    expect(src).toBeTruthy();

    await context.clearCookies();
    const response = await page.request.get(src!.startsWith('http') ? src! : new URL(src!, baseURL).toString());
    expect(response.status()).toBe(401);
  });
});
