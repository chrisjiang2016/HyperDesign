import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'

// Self-contained browser regression: real built API/controllers and frontend,
// temporary fixture storage and fake Prisma. Never calls an existing deployment.
const root = path.resolve(import.meta.dirname, '..', '..')
const requireBackend = createRequire(path.join(root, 'backend', 'package.json'))
const { Test } = requireBackend('@nestjs/testing')
const { UnauthorizedException } = requireBackend('@nestjs/common')
const express = requireBackend('express')
const helmet = requireBackend('helmet')
const { PublicPreviewController } = requireBackend('./dist/src/shares/public-preview.controller.js')
const { SharesController } = requireBackend('./dist/src/shares/shares.controller.js')
const { SharesService } = requireBackend('./dist/src/shares/shares.service.js')
const { PrismaService } = requireBackend('./dist/src/prisma/prisma.service.js')
const { StorageService } = requireBackend('./dist/src/storage/storage.service.js')
const { AuthService } = requireBackend('./dist/src/auth/auth.service.js')
const { WorkspaceService } = requireBackend('./dist/src/auth/current-user.service.js')
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const pages = [
  { id: 'page-1', title: '首页', relativePath: 'nested/index.html', sortOrder: 0, isEntry: true },
  { id: 'page-2', title: '第二页', relativePath: 'nested/second.html', sortOrder: 1, isEntry: false },
]
let app: any
let shares: any
let fixture: string
let origin: string
let link: any
let reads = 0

// The default suite uses one worker. This spec owns its server and isolated state.
test.describe('免登录分享（隔离本机浏览器回归）', () => {
  test.beforeAll(async () => {
    fixture = await fs.mkdtemp(path.join(tmpdir(), 'hyperdesign-public-browser-'))
    await fs.mkdir(path.join(fixture, 'nested'))
    await fs.mkdir(path.join(fixture, 'assets'))
    await fs.writeFile(path.join(fixture, 'nested', 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../assets/app.css"></head><body><h1>互动首页</h1><button id="interactive" onclick="this.textContent='已交互'">点击原型</button><a href="second.html">进入第二页</a><img id="picture" src="../assets/icon.svg"><script src="../assets/app.js"></script><script>
      try { parent.document.body.dataset.escaped='yes'; document.body.dataset.parentDenied='no' } catch { document.body.dataset.parentDenied='yes' }
      try { window.frameElement.removeAttribute('sandbox') } catch {}
      try { localStorage.setItem('public-escape','yes'); document.body.dataset.storageDenied='no' } catch { document.body.dataset.storageDenied='yes' }
      fetch('/api/auth/me',{credentials:'include'}).catch(()=>document.body.dataset.fetchBlocked='yes');
      </script></body></html>`)
    await fs.writeFile(path.join(fixture, 'nested', 'second.html'), '<!doctype html><meta charset="utf-8"><h1>第二页内容</h1>')
    await fs.writeFile(path.join(fixture, 'assets', 'app.css'), 'h1{color:rgb(17, 83, 131)}')
    await fs.writeFile(path.join(fixture, 'assets', 'app.js'), 'document.body.dataset.scriptLoaded="yes"')
    await fs.writeFile(path.join(fixture, 'assets', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>')
    const prisma = {
      shareLink: {
        findUnique: async ({ where }: any) => { reads++; return where.tokenHash === link?.tokenHash ? link : null },
        findFirst: async () => link,
        update: async ({ data }: any) => { link = { ...link, ...data }; return link },
      },
      prototypeFile: { findUnique: async ({ select }: any) => {
        if (select.uploaderId) return { id: 'file-1', uploaderId: 'owner', permissions: [] }
        if (select.pages) return { name: '隔离分享原型', entryPageId: 'page-1', parseStatus: 'SUCCESS', pages }
        if (select.storageKey) return { storageKey: 'private-storage-key', parseStatus: 'SUCCESS' }
        if (select.project) return { id: 'file-1', name: '隔离分享原型', pageCount: 2, project: { name: '受保护项目', team: { name: '内部团队' } } }
        return { name: '隔离分享原型', pageCount: 2 }
      } },
      operationLog: { create: async () => ({}) },
      $transaction: () => { throw new Error('Public preview must never create grants') },
    }
    const module = await Test.createTestingModule({
      controllers: [PublicPreviewController, SharesController],
      providers: [SharesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { getExtractedPath: () => fixture } },
        { provide: WorkspaceService, useValue: {} },
        { provide: AuthService, useValue: { getCurrentUser: () => { throw new UnauthorizedException() } } },
      ],
    }).compile()
    shares = module.get(SharesService)
    app = module.createNestApplication({ logger: false })
    app.setGlobalPrefix('api')
    app.use('/api', helmet({ crossOriginResourcePolicy: false }))
    app.use(express.static(path.join(root, 'frontend', 'dist')))
    app.use((req: any, res: any, next: any) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/')) return res.sendFile(path.join(root, 'frontend', 'dist', 'index.html'))
      next()
    })
    await app.init()
    await app.listen(0, '127.0.0.1')
    origin = `http://127.0.0.1:${app.getHttpServer().address().port}`
  })
  test.beforeEach(() => {
    reads = 0
    link = { id: 'share-1', fileId: 'file-1', token: 'isolated-public', tokenHash: hash('isolated-public'), accessType: 'PUBLIC_VIEW_ONLY', status: 'ACTIVE', expiresAt: new Date(Date.now() + 60000), createdAt: new Date(), revokedAt: null }
  })
  test.afterAll(async () => { await app?.close(); if (fixture) await fs.rm(fixture, { recursive: true, force: true }) })

  test('无需登录直接预览，相对资源、交互、导航和缩放可用；脚本无法访问宿主', async ({ page, context }) => {
    // An existing signed-in cookie must not make the sandbox trusted.
    await context.addCookies([{ name: 'hd_sid', value: 'fake-existing-session', url: origin }])
    const apiRequests: string[] = []
    page.on('request', (req) => { if (req.url().includes('/api/')) apiRequests.push(req.url()) })
    await page.goto(`${origin}/shares/isolated-public`)
    await expect(page.getByRole('heading', { name: '隔离分享原型' })).toBeVisible()
    const iframe = page.locator('.public-preview iframe')
    await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
    await expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer')
    const frame = page.frameLocator('.public-preview iframe')
    await expect(frame.locator('body')).toHaveAttribute('data-script-loaded', 'yes')
    await expect(frame.locator('body')).toHaveAttribute('data-parent-denied', 'yes')
    await expect(frame.locator('body')).toHaveAttribute('data-storage-denied', 'yes')
    await expect(frame.locator('body')).toHaveAttribute('data-fetch-blocked', 'yes')
    await expect(frame.getByRole('heading')).toHaveCSS('color', 'rgb(17, 83, 131)')
    expect(await frame.locator('#picture').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    await frame.locator('#interactive').click()
    await expect(frame.locator('#interactive')).toHaveText('已交互')
    await page.getByRole('button', { name: '放大', exact: true }).click()
    await expect(page.getByRole('button', { name: '重置缩放' })).toHaveText('110%')
    await frame.getByRole('link', { name: '进入第二页' }).click()
    await expect(frame.getByRole('heading', { name: '第二页内容' })).toBeVisible()
    await page.getByRole('button', { name: '下一页' }).click()
    await expect(frame.getByRole('heading', { name: '第二页内容' })).toBeVisible()
    expect(apiRequests.filter((url) => !url.includes('/api/shares/isolated-public') && !url.includes('/api/public/shares/isolated-public/'))).toEqual([])
    expect(await page.locator('body').getAttribute('data-escaped')).toBeNull()
    expect(apiRequests.some((url) => /annotations|accept|workspace|auth\/me/.test(url))).toBe(false)
  })

  test('直接打开资源也受 CSP sandbox 隔离，不能访问同源存储', async ({ page }) => {
    await page.goto(`${origin}/api/public/shares/isolated-public/resources/nested/index.html`)
    await expect(page.locator('body')).toHaveAttribute('data-script-loaded', 'yes')
    await expect(page.locator('body')).toHaveAttribute('data-storage-denied', 'yes')
    await expect(page.locator('body')).toHaveAttribute('data-fetch-blocked', 'yes')
  })

  test('30 天有效期不会因浏览器定时器溢出立即失效', async ({ page }) => {
    link.expiresAt = new Date(Date.now() + 30 * 86400000)
    await page.goto(`${origin}/shares/isolated-public`)
    await expect(page.locator('.public-preview iframe')).toBeVisible()
    await expect(page.frameLocator('.public-preview iframe').locator('body')).toHaveAttribute('data-script-loaded', 'yes')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('到期时自动清空 iframe，后续资源拒绝访问', async ({ page, request }) => {
    link.expiresAt = new Date(Date.now() + 4000)
    await page.goto(`${origin}/shares/isolated-public`)
    await expect(page.locator('.public-preview iframe')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('已停止预览', { timeout: 8000 })
    await expect(page.locator('.public-preview iframe')).toHaveCount(0)
    expect((await request.get(`${origin}/api/public/shares/isolated-public/resources/nested/index.html`)).status()).toBe(404)
  })

  for (const action of ['revoke', 'rotate'] as const) {
    test(`${action} 后定时验证清空已显示原型`, async ({ page, request }) => {
      await page.goto(`${origin}/shares/isolated-public`)
      await expect(page.locator('.public-preview iframe')).toBeVisible()
      if (action === 'revoke') await shares.revoke('owner', 'file-1', 'share-1')
      else await shares.rotate('owner', 'file-1', 'share-1')
      expect((await request.get(`${origin}/api/public/shares/isolated-public/resources/nested/index.html`)).status()).toBe(404)
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 20000 })
      await expect(page.locator('.public-preview iframe')).toHaveCount(0)
      expect(reads).toBeGreaterThan(2)
    })
  }

  test('验证请求失败时停止显示，手动重试可恢复', async ({ page }) => {
    await page.goto(`${origin}/shares/isolated-public`)
    await expect(page.locator('.public-preview iframe')).toBeVisible()
    await page.route('**/api/public/shares/isolated-public/pages', (route) => route.abort())
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.public-preview iframe')).toHaveCount(0)
    await page.unroute('**/api/public/shares/isolated-public/pages')
    await page.getByRole('button', { name: '重新验证' }).click()
    await expect(page.locator('.public-preview iframe')).toBeVisible()
  })

  test('匿名访问受保护 viewer 仍须登录', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }))
    await page.goto(`${origin}/files/file-1/preview`)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('iframe')).toHaveCount(0)
  })

  for (const accessType of ['VIEW_ONLY', 'JOIN_TEAM']) {
    test(`${accessType} 仍显示登录接受入口，不进入匿名预览`, async ({ page }) => {
      link.accessType = accessType
      await page.goto(`${origin}/shares/isolated-public`)
      await expect(page.getByRole('button', { name: accessType === 'JOIN_TEAM' ? '登录并加入团队' : '登录并接受分享' })).toBeVisible()
      await expect(page.locator('.public-preview')).toHaveCount(0)
      await expect(page.locator('iframe')).toHaveCount(0)
    })
  }

  test('无效链接不显示登录按钮或原型', async ({ page }) => {
    await page.goto(`${origin}/shares/unknown-token`)
    await expect(page.getByText('无法打开分享')).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /登录并/ })).toHaveCount(0)
  })
})
