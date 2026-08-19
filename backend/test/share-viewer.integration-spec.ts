import { Test } from '@nestjs/testing'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { StorageService } from '../src/storage/storage.service'

const sessionCookiePattern = /^hd_sid=([^;]+)/

describe('Sprint 6B-2 HTTP integration: session share access lifecycle', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: StorageService
  let ownerCookie: string
  let guestCookie: string
  let fileId: string
  let token: string
  let shareId: string
  let previewDirectory: string

  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL is required for integration tests')
    }
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    process.env.SESSION_COOKIE_SECURE = 'false'
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('api')
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
    await app.init()
    prisma = app.get(PrismaService)
    storage = app.get(StorageService)
  })

  afterAll(async () => {
    await app.close()
  })

  it('protects the Viewer API with an HTTP session cookie', async () => {
    await request(app.getHttpServer()).get('/api/files/unknown/pages').expect(401)
  })

  it('logs in owner and guest through the actual cookie session flow', async () => {
    await register('owner01')
    await register('guest01')
    ownerCookie = await login('owner01')
    guestCookie = await login('guest01')
  })

  it('sets a hardened session cookie', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({ username: 'owner01', password: 'Demo123456' }).expect(201)
    const cookie = (Array.isArray(response.headers['set-cookie']) ? response.headers['set-cookie'] : [response.headers['set-cookie']]).find((value) => value?.startsWith('hd_sid='))
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('creates a project file and does not grant access to the guest before acceptance', async () => {
    const ownerId = await userId('owner01')
    const team = await prisma.team.create({
      data: {
        name: 'Integration Team',
        description: 'HTTP integration fixture',
        icon: '🧪',
        color: '#2563eb',
        members: { create: { userId: ownerId, role: 'ADMIN', canUpload: true } },
      },
    })
    const project = await prisma.project.create({
      data: {
        teamId: team.id,
        name: 'Integration Project',
        description: 'Share lifecycle coverage',
        permissions: { create: { userId: ownerId, level: 'EDIT', grantedById: ownerId } },
      },
    })
    const file = await prisma.prototypeFile.create({
      data: {
        projectId: project.id,
        name: 'Integration Prototype',
        originalFilename: 'integration.zip',
        storageKey: 'uploads/pending',
        fileSize: 1,
        uploaderId: ownerId,
        permissions: { create: { userId: ownerId, grantedById: ownerId, canView: true, canComment: true, canEdit: true, canDelete: true } },
      },
    })
    fileId = file.id

    const storageKey = storage.generateStorageKey(fileId)
    previewDirectory = storage.getExtractedPath(storageKey)
    await mkdir(previewDirectory, { recursive: true })
    await writeFile(join(previewDirectory, 'index.html'), '<!doctype html><title>Preview fixture</title>')
    await prisma.prototypeFile.update({ where: { id: fileId }, data: { storageKey } })

    await request(app.getHttpServer()).get(`/api/files/${fileId}/pages`).set('Cookie', guestCookie).expect(400)
  })

  it('rejects anonymous preview access and blocks traversal before serving a resource', async () => {
    await request(app.getHttpServer()).get(`/api/preview/files/${fileId}/index.html`).expect(401)
    await request(app.getHttpServer()).get(`/api/preview/files/${fileId}/..%2F..%2Fsecret.txt`).set('Cookie', ownerCookie).expect(400)
  })

  it('serves authorized preview resources with restrictive response headers', async () => {
    const response = await request(app.getHttpServer()).get(`/api/preview/files/${fileId}/index.html`).set('Cookie', ownerCookie).expect(200)
    expect(response.headers['cache-control']).toBe('private, no-store')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['content-security-policy']).toContain('sandbox allow-scripts allow-same-origin')
  })

  it('creates a share link using the owner session without exposing tokens in its list endpoint', async () => {
    const response = await request(app.getHttpServer()).post(`/api/files/${fileId}/shares`).set('Cookie', ownerCookie).send({ expiresInDays: 7 }).expect(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    token = response.body.data.token
    shareId = response.body.data.id

    const list = await request(app.getHttpServer()).get(`/api/files/${fileId}/shares`).set('Cookie', ownerCookie).expect(200)
    expect(list.body.data).toEqual([expect.objectContaining({ id: shareId, status: 'active', acceptedCount: 0 })])
    expect(JSON.stringify(list.body.data)).not.toContain(token)
  })

  it('accepts a share with the guest session and exposes read-only Viewer access', async () => {
    await request(app.getHttpServer()).get(`/api/shares/${token}`).expect(200)
    await request(app.getHttpServer()).post(`/api/shares/${token}/accept`).set('Cookie', guestCookie).expect(201).expect(({ body }) => {
      expect(body.data).toEqual({ fileId })
    })

    const pages = await request(app.getHttpServer()).get(`/api/files/${fileId}/pages`).set('Cookie', guestCookie).expect(200)
    expect(pages.body.data.permissions).toEqual({ canView: true, canComment: false, canEdit: false, canDelete: false })

    const guestId = await userId('guest01')
    expect(await prisma.shareGrant.findFirst({ where: { userId: guestId, shareLinkId: shareId } })).not.toBeNull()
    expect(await prisma.filePermission.findUnique({ where: { fileId_userId: { fileId, userId: guestId } } })).toBeNull()
  })

  it('invalidates accepted Viewer access immediately after owner revokes the link', async () => {
    await request(app.getHttpServer()).delete(`/api/files/${fileId}/shares/${shareId}`).set('Cookie', ownerCookie).expect(200).expect(({ body }) => {
      expect(body.data.status).toBe('revoked')
    })

    await request(app.getHttpServer()).get(`/api/shares/${token}`).expect(404)
    await request(app.getHttpServer()).post(`/api/shares/${token}/accept`).set('Cookie', guestCookie).expect(404)
    await request(app.getHttpServer()).get(`/api/files/${fileId}/pages`).set('Cookie', guestCookie).expect(400)
  })

  async function register(username: string) {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username, confirmUsername: username, password: 'Demo123456' })
      .expect(201)
  }

  async function login(username: string): Promise<string> {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({ username, password: 'Demo123456' }).expect(201)
    const cookies = response.headers['set-cookie']
    const cookie = (Array.isArray(cookies) ? cookies : cookies ? [cookies] : []).find((value) => sessionCookiePattern.test(value))
    expect(cookie).toBeDefined()
    const sessionCookie = cookie!.match(sessionCookiePattern)![0]
    expect(sessionCookie).toMatch(/^hd_sid=[A-Za-z0-9_-]{40,}$/)
    return sessionCookie
  }

  async function userId(username: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { username }, select: { id: true } })
    return user.id
  }
})
