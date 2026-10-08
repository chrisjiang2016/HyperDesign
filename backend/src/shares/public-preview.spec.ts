import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PublicPreviewController } from './public-preview.controller'
import { SharesController } from './shares.controller'
import { SharesService } from './shares.service'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { AuthService } from '../auth/auth.service'
import { AuthController } from '../auth/auth.controller'
import { CurrentUserService, WorkspaceService } from '../auth/current-user.service'
import { CollaborationController } from '../collaboration/collaboration.controller'
import { CollaborationService } from '../collaboration/collaboration.service'
import { PrototypeSpikeController } from '../uploads/prototype-spike.controller'
import { ZipParserService } from '../uploads/zip-parser.service'
import { RateLimitGuard } from '../rate-limit/rate-limit.guard'

/** Real Nest/Express routes + isolated storage + in-memory persistence. No DB/Redis. */
describe('PUBLIC_VIEW_ONLY security HTTP regression', () => {
  let app: INestApplication
  let root: string
  let link: any
  let prisma: any
  let shares: SharesService
  const token = 'public-token'
  const hash = (value: string) => createHash('sha256').update(value).digest('hex')
  const base = `/api/public/shares/${token}`
  const page = { id: 'page-1', title: '首页', relativePath: 'nested/index.html', isEntry: true, sortOrder: 0 }

  beforeAll(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'hyperdesign-public-'))
    await fs.mkdir(join(root, 'extracted', 'nested'), { recursive: true })
    await fs.mkdir(join(root, 'extracted', 'assets'))
    await fs.writeFile(join(root, 'extracted', 'nested', 'index.html'), '<link rel="stylesheet" href="../assets/app.css"><script src="../assets/app.js"></script><img src="../assets/icon.svg"><a href="second.html">Next</a>')
    await fs.writeFile(join(root, 'extracted', 'nested', 'second.html'), '<h1>Second</h1>')
    await fs.writeFile(join(root, 'extracted', 'assets', 'app.css'), 'body{background:url(icon.svg)}')
    await fs.writeFile(join(root, 'extracted', 'assets', 'app.js'), 'document.body.dataset.interactive="yes"')
    await fs.writeFile(join(root, 'extracted', 'assets', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    await fs.writeFile(join(root, 'extracted', 'original.zip'), 'NEVER PUBLIC')
    await fs.writeFile(join(root, 'outside.html'), 'OTHER FILE')
    prisma = {
      shareLink: {
        findUnique: jest.fn(async ({ where }) => link?.tokenHash === where.tokenHash ? link : null),
        findFirst: jest.fn(async () => link),
        update: jest.fn(async ({ data }) => { link = { ...link, ...data }; return link }),
        create: jest.fn(async ({ data }) => { link = { ...link, ...data }; return link }),
      },
      prototypeFile: { findUnique: jest.fn(async ({ where, select }) => {
        if (where.id !== 'file-1') return null
        if (select.uploaderId) return { id: 'file-1', uploaderId: 'owner', permissions: [] }
        if (select.pages) return { name: '公开原型', entryPageId: page.id, parseStatus: 'SUCCESS', pages: [page] }
        if (select.storageKey) return { storageKey: 'uploads/file-1', parseStatus: 'SUCCESS' }
        return { name: '公开原型', pageCount: 1 }
      }) },
      operationLog: { create: jest.fn() },
      $transaction: jest.fn(), shareGrant: { upsert: jest.fn() }, filePermission: { createMany: jest.fn() }, teamMember: { upsert: jest.fn() },
    }
    const module = await Test.createTestingModule({
      controllers: [PublicPreviewController, SharesController, PrototypeSpikeController, CollaborationController, AuthController],
      providers: [SharesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { getExtractedPath: jest.fn(() => join(root, 'extracted')) } },
        { provide: AuthService, useValue: { getCurrentUser: jest.fn(async (session) => { if (session !== 'owner-session') throw new UnauthorizedException(); return { id: 'owner' } }) } },
        { provide: CurrentUserService, useValue: { getCurrentUserFromToken: jest.fn(async () => { throw new UnauthorizedException() }) } },
        { provide: WorkspaceService, useValue: { isSuperAdmin: jest.fn().mockResolvedValue(false) } },
        { provide: CollaborationService, useValue: {} },
        { provide: ZipParserService, useValue: {} },
      ],
    }).overrideGuard(RateLimitGuard).useValue({ canActivate: () => true }).compile()
    shares = module.get(SharesService)
    app = module.createNestApplication()
    app.setGlobalPrefix('api')
    app.use(helmet({ crossOriginResourcePolicy: false }))
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
    await app.init()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    link = { id: 'share-1', fileId: 'file-1', token, tokenHash: hash(token), accessType: 'PUBLIC_VIEW_ONLY', status: 'ACTIVE', expiresAt: new Date(Date.now() + 86400000), createdAt: new Date(), revokedAt: null, createdById: 'owner' }
  })
  afterAll(async () => { await app?.close(); if (root) await fs.rm(root, { recursive: true, force: true }) })

  it('anonymous metadata contains only preview fields and does not create grants', async () => {
    const result = await request(app.getHttpServer()).get(`${base}/pages`).expect(200)
    expect(Object.keys(result.body.data).sort()).toEqual(['entryPageId', 'expiresAt', 'name', 'pages', 'serverTime'])
    expect(result.body.data.pages).toEqual([page])
    expect(JSON.stringify(result.body)).not.toMatch(/storageKey|projectId|teamName|uploaderId|annotations/)
    expect(result.headers['cache-control']).toBe('no-store')
    const inspect = await request(app.getHttpServer()).get(`/api/shares/${token}`).expect(200)
    expect(inspect.body.data).toEqual({ file: { name: '公开原型', pageCount: 1 }, expiresAt: link.expiresAt.toISOString(), accessType: 'PUBLIC_VIEW_ONLY' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.filePermission.createMany).not.toHaveBeenCalled()
  })

  it('serves anonymous nested HTML and relative CSS/JS/image/page references with isolated CSP', async () => {
    const htmlUrl = `http://localhost${base}/resources/nested/index.html`
    const html = await request(app.getHttpServer()).get(new URL(htmlUrl).pathname).expect(200)
    expect(html.headers['content-security-policy']).toContain('sandbox allow-scripts;')
    expect(html.headers['content-security-policy']).not.toContain('allow-same-origin')
    expect(html.headers['content-security-policy']).toContain("connect-src 'none'")
    expect(html.headers['referrer-policy']).toBe('no-referrer')
    expect(html.headers['cache-control']).toBe('no-store')
    expect(html.headers['x-content-type-options']).toBe('nosniff')
    for (const asset of ['../assets/app.css', '../assets/app.js', '../assets/icon.svg', 'second.html']) {
      await request(app.getHttpServer()).get(new URL(asset, htmlUrl).pathname).expect(200)
    }
    expect(prisma.shareLink.findUnique).toHaveBeenCalledTimes(5)
    expect(prisma.prototypeFile.findUnique.mock.calls.every(([query]: any) => query.where.id === 'file-1')).toBe(true)
  })

  it.each(['VIEW_ONLY', 'JOIN_TEAM'])('rejects %s tokens on both public endpoints', async (accessType) => {
    link.accessType = accessType
    await request(app.getHttpServer()).get(`${base}/pages`).expect(404)
    await request(app.getHttpServer()).get(`${base}/resources/nested/index.html`).expect(404)
    expect(prisma.prototypeFile.findUnique).not.toHaveBeenCalled()
  })

  it.each(['expired', 'revoked', 'missing'])('revalidates %s links on metadata and each resource', async (state) => {
    await request(app.getHttpServer()).get(`${base}/resources/nested/index.html`).expect(200)
    if (state === 'expired') link.expiresAt = new Date(Date.now() - 1)
    if (state === 'revoked') link.status = 'REVOKED'
    if (state === 'missing') link = null
    await request(app.getHttpServer()).get(`${base}/pages`).expect(404)
    await request(app.getHttpServer()).get(`${base}/resources/assets/app.css`).expect(404)
  })

  it('expiry is exclusive at the exact boundary and rotating an expired link does not extend it', async () => {
    link.expiresAt = new Date()
    await request(app.getHttpServer()).get(`${base}/pages`).expect(404)
    const rotated = await shares.rotate('owner', 'file-1', 'share-1')
    await request(app.getHttpServer()).get(`/api/public/shares/${rotated.token}/pages`).expect(404)
  })

  it('rotate invalidates the old token immediately and preserves type and expiry', async () => {
    const expiresAt = link.expiresAt
    const rotated = await shares.rotate('owner', 'file-1', 'share-1')
    expect(rotated.accessType).toBe('PUBLIC_VIEW_ONLY')
    expect(rotated.expiresAt).toEqual(expiresAt)
    await request(app.getHttpServer()).get(`${base}/pages`).expect(404)
    await request(app.getHttpServer()).get(`${base}/resources/nested/index.html`).expect(404)
    await request(app.getHttpServer()).get(`/api/public/shares/${rotated.token}/pages`).expect(200)
    await shares.revoke('owner', 'file-1', 'share-1')
    await request(app.getHttpServer()).get(`/api/public/shares/${rotated.token}/resources/nested/index.html`).expect(404)
  })

  it('rejects public accept even for a logged-in user before any transaction or grant', async () => {
    await request(app.getHttpServer()).post(`/api/shares/${token}/accept`).set('Cookie', 'hd_sid=owner-session').expect(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.shareGrant.upsert).not.toHaveBeenCalled()
    expect(prisma.filePermission.createMany).not.toHaveBeenCalled()
    expect(prisma.teamMember.upsert).not.toHaveBeenCalled()
  })

  it.each(['%2e%2e%2foutside.html', '..%5coutside.html', '%252e%252e%252foutside.html', 'C%3A/outside.html', 'nested/index.html%3Asecret', 'nested/%00.html', 'nested/index.html.', 'original.zip', 'assets/app.js.map'])('rejects traversal and source requests: %s', async (path) => {
    const result = await request(app.getHttpServer()).get(`${base}/resources/${path}`)
    expect([400, 404]).toContain(result.status)
    expect(result.text).not.toContain('OTHER FILE')
    expect(result.text).not.toContain('NEVER PUBLIC')
  })

  it('rejects a symlink escaping the extracted directory (Windows directory junction)', async () => {
    const outside = join(root, 'external')
    await fs.mkdir(outside)
    await fs.writeFile(join(outside, 'secret.html'), 'OTHER FILE')
    await fs.symlink(outside, join(root, 'extracted', 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
    await request(app.getHttpServer()).get(`${base}/resources/escape/secret.html`).expect(404)
  })

  it('cannot switch prototypes by query fileId or alternate routes', async () => {
    const result = await request(app.getHttpServer()).get(`${base}/pages?fileId=file-2`).expect(200)
    expect(result.body.data.name).toBe('公开原型')
    await request(app.getHttpServer()).get(`${base}/files/file-2/pages`).expect(404)
    await request(app.getHttpServer()).get(`${base}/resources/../../file-2/index.html`).expect(404)
  })

  it.each([
    ['get', '/api/files/file-1/pages'], ['get', '/api/preview/files/file-1/nested/index.html'],
    ['get', '/api/files/file-1/annotations'], ['post', '/api/files/file-1/pages/page-1/annotations'],
    ['post', '/api/files/file-1/annotations/annotation-1/comments'], ['delete', '/api/files/file-1/annotations/annotation-1'],
    ['put', '/api/projects/project-1/files/file-1/permissions/user-1'], ['delete', '/api/projects/project-1/files/file-1'],
    ['get', '/api/projects/project-1/files/file-1/download'], ['post', '/api/files/file-1/shares'],
    ['delete', '/api/files/file-1/shares/share-1'], ['post', `/api/shares/${token}/accept`],
  ])('existing authenticated %s %s refuses anonymous token holders', async (method, url) => {
    let call = (request(app.getHttpServer()) as any)[method](`${url}?token=${token}`).set('Authorization', `Bearer ${token}`)
    if (method === 'post' && url.endsWith('/annotations')) call = call.send({ title: 'test', content: 'test', topPercent: 10, leftPercent: 10, pageScrollTop: 0, pageScrollHeight: 100 })
    if (method === 'post' && url.endsWith('/comments')) call = call.send({ content: 'test' })
    if (method === 'post' && url.endsWith('/shares')) call = call.send({ expiresInDays: 7, accessType: 'PUBLIC_VIEW_ONLY' })
    if (method === 'put') call = call.send({ canView: true, canComment: true, canEdit: true, canDelete: true })
    const result = await call
    expect(result.status).toBe(401)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('has no anonymous write/comment/download endpoints', async () => {
    await request(app.getHttpServer()).post(`${base}/pages`).expect(404)
    await request(app.getHttpServer()).post(`${base}/resources/nested/index.html`).expect(404)
    await request(app.getHttpServer()).get(`${base}/annotations`).expect(404)
    await request(app.getHttpServer()).get(`${base}/download`).expect(404)
  })

  it('creates PUBLIC_VIEW_ONLY with default 7 days and validates 1–30 days', async () => {
    const before = Date.now()
    const result = await request(app.getHttpServer()).post('/api/files/file-1/shares').set('Cookie', 'hd_sid=owner-session').send({ accessType: 'PUBLIC_VIEW_ONLY' }).expect(201)
    expect(result.body.data.accessType).toBe('PUBLIC_VIEW_ONLY')
    expect(Date.parse(result.body.data.expiresAt) - before).toBeGreaterThanOrEqual(7 * 86400000)
    for (const expiresInDays of [0, 31, 1.5]) {
      await request(app.getHttpServer()).post('/api/files/file-1/shares').set('Cookie', 'hd_sid=owner-session').send({ accessType: 'PUBLIC_VIEW_ONLY', expiresInDays }).expect(400)
    }
    for (const expiresInDays of [1, 30]) {
      await request(app.getHttpServer()).post('/api/files/file-1/shares').set('Cookie', 'hd_sid=owner-session').send({ accessType: 'PUBLIC_VIEW_ONLY', expiresInDays }).expect(201)
    }
  })
})
