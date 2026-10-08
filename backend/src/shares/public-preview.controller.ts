import { BadRequestException, Controller, Get, NotFoundException, Param, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { promises as fs } from 'node:fs'
import { extname, isAbsolute, relative, resolve } from 'node:path'
import { lookup } from 'mime-types'
import { ok } from '../common/api-response'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { SharesService } from './shares.service'

// Only preview assets, never archives, source maps, or arbitrary extracted documents.
const PREVIEW_EXTENSIONS = new Set(['.html', '.htm', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.mp4', '.webm', '.ogg', '.wav'])

@Controller('public/shares/:token')
export class PublicPreviewController {
  constructor(private readonly shares: SharesService, private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  @Get('pages')
  async pages(@Param('token') token: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    const link = await this.shares.requirePublicToken(token)
    const file = await this.prisma.prototypeFile.findUnique({
      where: { id: link.fileId },
      select: { name: true, entryPageId: true, parseStatus: true, pages: { orderBy: { sortOrder: 'asc' }, select: { id: true, title: true, relativePath: true, isEntry: true, sortOrder: true } } },
    })
    if (!file || file.parseStatus !== 'SUCCESS') throw this.unavailable()
    return ok({ name: file.name, entryPageId: file.entryPageId, pages: file.pages, expiresAt: link.expiresAt, serverTime: new Date() }, '免登录预览有效')
  }

  @Get('resources/*path')
  async resource(@Param('token') token: string, @Param('path') path: string | string[], @Req() request: Request, @Res() response: Response) {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    const link = await this.shares.requirePublicToken(token)
    const file = await this.prisma.prototypeFile.findUnique({ where: { id: link.fileId }, select: { storageKey: true, parseStatus: true } })
    if (!file?.storageKey || file.parseStatus !== 'SUCCESS') throw this.unavailable()
    // Express has already decoded route params. Reject leftover encoding, Windows
    // separators/drive/ADS syntax and dot segments instead of decoding a second time.
    const resourcePath = Array.isArray(path) ? path.join('/') : path
    if (!resourcePath || /[%\\:]/.test(resourcePath) || [...resourcePath].some((char) => char.charCodeAt(0) < 32) || resourcePath.startsWith('/') || resourcePath.split('/').some((part) => !part || part === '.' || part === '..' || /[. ]$/.test(part))) {
      throw new BadRequestException({ errorCode: 'VALIDATION_ERROR', message: '资源路径不安全' })
    }
    if (!PREVIEW_EXTENSIONS.has(extname(resourcePath).toLowerCase())) throw this.unavailable()
    let root: string
    let target: string
    try {
      root = await fs.realpath(this.storage.getExtractedPath(file.storageKey))
      target = await fs.realpath(resolve(root, resourcePath))
      const contained = relative(root, target)
      if (!contained || contained.startsWith('..') || isAbsolute(contained) || !(await fs.stat(target)).isFile()) throw this.unavailable()
    } catch {
      throw this.unavailable()
    }
    // CSP host sources must be absolute (path-only sources are invalid). Prefer
    // the existing trusted public origin; development falls back to a strictly
    // validated authority, never concatenating raw Host input into the policy.
    const authority = request.get('host') ?? ''
    if (!/^[a-zA-Z0-9.\-\[\]:]+$/.test(authority)) throw this.unavailable()
    const origin = new URL(process.env.APP_ORIGIN ?? `${request.protocol}://${authority}`).origin
    if (!/^https?:\/\//.test(origin)) throw this.unavailable()
    const assets = `${origin}/api/public/shares/${encodeURIComponent(token)}/resources/`
    response.setHeader('Content-Security-Policy', `sandbox allow-scripts; default-src 'none'; script-src ${assets} 'unsafe-inline' 'unsafe-eval'; style-src ${assets} 'unsafe-inline'; img-src ${assets} data: blob:; font-src ${assets} data:; media-src ${assets}; frame-src ${assets}; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'`)
    // Opaque-origin font/module requests need CORS, but never session credentials.
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.removeHeader('Access-Control-Allow-Credentials')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Content-Type', lookup(target) || 'application/octet-stream')
    return response.sendFile(target, { dotfiles: 'deny', cacheControl: false, lastModified: false, acceptRanges: false })
  }

  private unavailable() {
    return new NotFoundException({ errorCode: 'SHARE_LINK_UNAVAILABLE', message: '分享预览不存在、尚未就绪或已失效' })
  }
}
