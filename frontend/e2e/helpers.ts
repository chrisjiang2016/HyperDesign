import { Page, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/** 本地样例 ZIP：真实 Axure 导出包，用于上传/预览/评论主链。 */
export const samplePrototypeZip = path.resolve(currentDir, 'test-fixtures', 'sample-prototype.zip');
export const emptyZip = path.resolve(currentDir, 'test-fixtures', 'empty.zip');
export const notAZipFile = path.resolve(currentDir, 'test-fixtures', 'not-a-zip.txt');

/**
 * 用户登录（当前登录页契约：用户名 + 密码，无邮箱字段）。
 * 不强制落到 `/`：LoginPage 可能按 return state 跳到其它受保护页。
 */
export async function login(page: Page, username: string, password: string) {
  const normalizedUsername = username === 'admin@hyperdesign.com' ? 'admin'
    : username === 'chrisj@hyperdesign.com' ? 'chrisj'
      : username;
  await page.goto('/login');
  await page.getByRole('textbox', { name: '用户名', exact: true }).click();
  await page.getByRole('textbox', { name: '用户名', exact: true }).fill('');
  await page.getByRole('textbox', { name: '用户名', exact: true }).fill(normalizedUsername);
  await page.getByRole('textbox', { name: '密码', exact: true }).click();
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('');
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(password);
  await page.locator('button.hd-auth-primary-btn').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await waitForLoadingComplete(page);
}

/**
 * 用户注册（仅用户名 + 密码确认）。
 */
export async function register(page: Page, username: string, password: string) {
  await page.goto('/register');
  await page.getByRole('textbox', { name: '用户名', exact: true }).fill(username);
  await page.getByRole('textbox', { name: '确认用户名', exact: true }).fill(username);
  await page.getByRole('textbox', { name: '设置密码', exact: true }).fill(password);
  await page.getByRole('textbox', { name: '确认密码', exact: true }).fill(password);
  await page.locator('button.hd-auth-primary-btn').click();
  await page.waitForURL('/login', { timeout: 10000 });
}

/**
 * 用户登出：先走 UI 退出，再清 Cookie，避免会话残留导致下一账号登录串号。
 */
export async function logout(page: Page) {
  await page.goto('/settings');
  const logoutButton = page.getByRole('button', { name: '退出登录' });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => undefined);
  }
  await page.context().clearCookies();
  await page.goto('/login');
  await expect(page.getByRole('textbox', { name: '用户名', exact: true })).toBeVisible({ timeout: 10000 });
}

/**
 * 等待 API 响应。
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  status = 200,
) {
  return page.waitForResponse(
    (resp) => {
      const url = resp.url();
      const matchUrl = typeof urlPattern === 'string'
        ? url.includes(urlPattern)
        : urlPattern.test(url);
      return matchUrl && resp.status() === status;
    },
    { timeout: 30000 },
  );
}

/**
 * 等待页面 loading 结束。
 */
export async function waitForLoadingComplete(page: Page) {
  await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 10000 }).catch(() => undefined);
  await page.waitForSelector('.hd-route-loading', { state: 'hidden', timeout: 10000 }).catch(() => undefined);
}

export function generateRandomEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test_${timestamp}_${random}@example.com`;
}

export function generateRandomUsername() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `user${timestamp}${random}`;
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

/** seed 项目：admin 可编辑，chrisj 对 project-1 也是 EDIT。 */
export async function openSeedProject(page: Page, projectId = 'project-1') {
  await page.goto(`/projects/${projectId}`);
  await page.waitForURL(new RegExp(`/projects/${projectId}`), { timeout: 10000 });
  await waitForLoadingComplete(page);

  const loadError = page.locator('.ant-alert, .ant-result, .hd-page').filter({
    hasText: '项目详情加载失败',
  }).first();
  if (await loadError.isVisible().catch(() => false)) {
    const detail = (await loadError.innerText().catch(() => '项目详情加载失败')).trim();
    throw new Error(`无法打开种子项目 ${projectId}: ${detail}`);
  }

  await expect(page.locator('.hd-project-hero')).toBeVisible({ timeout: 10000 });
}

/**
 * 上传 ZIP 并等待解析完成。
 * 返回显示名称（用于后续定位资产行）。
 */
export async function uploadPrototypeZip(
  page: Page,
  options: {
    zipPath?: string;
    displayName?: string;
  } = {},
) {
  const zipPath = options.zipPath ?? samplePrototypeZip;
  const displayName = options.displayName ?? `E2E原型${Date.now()}`;

  await page.getByRole('button', { name: /上传 ZIP|上传 HTML 原型 ZIP/ }).first().click();
  const dialog = page.getByRole('dialog', { name: '上传原型 ZIP' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('显示名称').fill(displayName);

  const fileChooserPromise = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: '选择 ZIP 文件' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(zipPath);

  // 后端 upload 返回 200 + { success, data }，不是 201
  const uploadResponse = page.waitForResponse((resp) =>
    resp.url().includes(`/projects/`) &&
    resp.url().includes('/files/upload') &&
    resp.request().method() === 'POST' &&
    resp.ok(),
  );
  await dialog.getByRole('button', { name: /上传并解析/ }).click();
  await uploadResponse;
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // 后台解析：轮询资产状态到“解析完成”
  const row = page.locator('.hd-asset-row', { hasText: displayName }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await expect
    .poll(async () => {
      const text = await row.innerText();
      if (text.includes('解析失败')) throw new Error(`ZIP 解析失败：${text}`);
      return text.includes('解析完成');
    }, { timeout: 90000, intervals: [1000, 2000, 3000] })
    .toBe(true);

  return displayName;
}

/** 打开项目内某个已解析文件的 Viewer。 */
export async function openViewerForFile(page: Page, fileName: string) {
  const row = page.locator('.hd-asset-row', { hasText: fileName }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  // aria-label 精确为「预览 <文件名>」，避免匹配「管理分享 / 文件权限」
  await row.getByRole('button', { name: `预览 ${fileName}`, exact: true }).click();
  await page.waitForURL(/\/files\/.*\/preview/, { timeout: 15000 });
  await waitForLoadingComplete(page);
  await expect(page.locator('iframe.pv-live-frame, .pv-empty-state').first()).toBeVisible({ timeout: 20000 });
}

/** 若项目已有解析成功文件则直接打开，否则上传后打开。 */
export async function ensureViewerOpen(page: Page, displayNamePrefix = 'E2E原型') {
  const existing = page.locator('.hd-asset-row', { hasText: '解析完成' }).first();
  if (await existing.count()) {
    const name = (await existing.locator('.hd-asset-title').innerText()).trim();
    await openViewerForFile(page, name);
    return name;
  }
  const displayName = await uploadPrototypeZip(page, {
    displayName: `${displayNamePrefix}${Date.now()}`,
  });
  await openViewerForFile(page, displayName);
  return displayName;
}
