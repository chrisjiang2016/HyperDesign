import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request, Response } from 'express'
import { promises as fs } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { lookup as lookupMime } from 'mime-types'
import { PrismaService } from '../prisma/prisma.service'
import { AuthService } from '../auth/auth.service'
import { WorkspaceService } from '../auth/current-user.service'
import { StorageService } from '../storage/storage.service'
import { ok } from '../common/api-response'
import { RateLimit } from '../rate-limit/rate-limit.decorator'
import { RateLimitGuard } from '../rate-limit/rate-limit.guard'
import { ZipParserService } from './zip-parser.service'

const SESSION_COOKIE = 'hd_sid'
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 104857600)

@Controller()
export class PrototypeSpikeController {
  constructor(
    private readonly auth: AuthService,
    private readonly workspaceService: WorkspaceService,
    private readonly prisma: PrismaService,
    private readonly parser: ZipParserService,
    private readonly storage: StorageService,
  ) {}

  @Post('projects/:projectId/files/upload')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'upload', limit: 30, windowSeconds: 3600 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadToProject(@Req() request: Request, @Param('projectId') projectId: string, @Query('name') name: string | undefined, @Query('folderId') folderId: string | undefined, @UploadedFile() file?: Express.Multer.File) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    await this.workspaceService.requireProjectUpload(user.id, projectId)
    if (folderId) await this.workspaceService.requireProjectFolder(user.id, projectId, folderId)
    return this.persistUploadedZip(user.id, file, projectId, name, folderId)
  }

  @Post('files/spike-upload')
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'upload', limit: 30, windowSeconds: 3600 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(@Req() request: Request, @UploadedFile() file?: Express.Multer.File) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return this.persistUploadedZip(user.id, file)
  }

  @Post('projects/:projectId/files/:fileId/retry-parse')
  async retryParse(@Req() request: Request, @Param('projectId') projectId: string, @Param('fileId') fileId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    const file = await this.workspaceService.requireProjectFileEdit(user.id, projectId, fileId)
    if (file.parseStatus === 'PARSING') throw new BadRequestException({ errorCode: 'PARSING_IN_PROGRESS', message: '文件正在解析中，请稍后再试' })
    if (!file.storageKey) throw new BadRequestException({ errorCode: 'SOURCE_MISSING', message: '未找到可用于重新解析的 ZIP 源文件' })
    const originalZipPath = this.storage.getOriginalZipPath(file.storageKey)
    try { await fs.access(originalZipPath) } catch { throw new BadRequestException({ errorCode: 'SOURCE_MISSING', message: '原始 ZIP 文件已不存在，无法重新解析' }) }
    await this.prisma.$transaction([
      this.prisma.prototypePage.deleteMany({ where: { fileId } }),
      this.prisma.prototypeFile.update({ where: { id: fileId }, data: { parseStatus: 'PARSING', parseError: null, pageCount: 0, entryPageId: null } }),
    ])
    const extractDirectory = this.storage.getExtractedPath(file.storageKey)
    await fs.rm(extractDirectory, { recursive: true, force: true })
    setImmediate(() => void this.parseZipRecord(fileId, originalZipPath, extractDirectory))
    return ok({ id: fileId, parseStatus: 'parsing' }, '已开始重新解析')
  }

  private async persistUploadedZip(userId: string, file?: Express.Multer.File, projectId?: string, displayName?: string, folderId?: string) {
    if (!file) throw new BadRequestException({ errorCode: 'VALIDATION_ERROR', message: '请选择 ZIP 文件' })
    if (extname(file.originalname).toLowerCase() !== '.zip' || !this.isZip(file.buffer)) {
      throw new BadRequestException({ errorCode: 'INVALID_FILE_TYPE', message: '仅支持有效的 ZIP 文件' })
    }

    const record = await this.prisma.prototypeFile.create({
      data: {
        projectId,
        folderId,
        name: displayName?.trim() || this.decodeUploadFilename(file.originalname).replace(/\.zip$/i, ''),
        originalFilename: this.decodeUploadFilename(file.originalname),
        storageKey: '',
        fileSize: file.size,
        uploaderId: userId,
        permissions: {
          create: {
            userId,
            grantedById: userId,
            canView: true,
            canComment: true,
            canEdit: true,
            canDelete: true,
          },
        },
      },
    })
    const storageKey = this.storage.generateStorageKey(record.id)
    const uploadDirectory = this.storage.getUploadDirectory(record.id)
    const extractDirectory = this.storage.getExtractDirectory(record.id)
    const zipPath = this.storage.getOriginalZipPath(storageKey)

    try {
      await fs.mkdir(uploadDirectory, { recursive: true })
      await fs.writeFile(zipPath, file.buffer)
      await this.prisma.prototypeFile.update({ where: { id: record.id }, data: { storageKey } })
      // Local development worker: parsing is deliberately detached from the request.
      // The production Storage/Job adapter can replace this with BullMQ without changing the API contract.
      setImmediate(() => void this.parseZipRecord(record.id, zipPath, extractDirectory))
      return ok({ id: record.id, projectId, parseStatus: 'parsing', pageCount: 0, entryPageId: null }, 'ZIP 已接收，正在解析')
    } catch (error) {
      await this.prisma.prototypeFile.update({ where: { id: record.id }, data: { parseStatus: 'FAILED', parseError: error instanceof Error ? error.message : 'ZIP 保存失败' } })
      throw error
    }
  }

  private async parseZipRecord(fileId: string, zipPath: string, extractDirectory: string) {
    try {
      const pages = await this.parser.extractAndScan(zipPath, extractDirectory)
      const entryPage = pages.find((page) => page.isEntry)
      const pageRecords = await this.prisma.$transaction(async (tx) => {
        await tx.prototypePage.createMany({ data: pages.map((page) => ({ ...page, fileId })) })
        return tx.prototypePage.findMany({ where: { fileId }, orderBy: { sortOrder: 'asc' } })
      })
      const entry = pageRecords.find((page) => page.relativePath === entryPage?.relativePath)
      const saved = await this.prisma.prototypeFile.update({
        where: { id: fileId },
        data: { parseStatus: 'SUCCESS', pageCount: pages.length, entryPageId: entry?.id },
      })
      return saved
    } catch (error) {
      await this.prisma.prototypeFile.update({
        where: { id: fileId },
        data: { parseStatus: 'FAILED', parseError: error instanceof Error ? error.message : 'ZIP 解析失败' },
      })
      return null
    }
  }

  @Get('files/:fileId/pages')
  async pages(@Req() request: Request, @Param('fileId') fileId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    const file = await this.workspaceService.canAccessPrototypeFile(user.id, fileId)
    if (!file) throw new BadRequestException({ errorCode: 'NOT_FOUND', message: '文件不存在或无权访问' })
    const pages = await this.prisma.prototypePage.findMany({ where: { fileId }, orderBy: { sortOrder: 'asc' } })
    return ok({ fileId, projectId: file.projectId, entryPageId: file.entryPageId, permissions: this.workspaceService.toFilePermissionResponse(file.permission), pages })
  }

  @Get('preview/files/:fileId/resource')
  async previewResource(@Req() request: Request, @Param('fileId') fileId: string, @Query('path') path: string, @Res() response: Response) {
    return this.sendPreviewResource(request, fileId, path, response)
  }

  // Axure exports reference CSS, JS, images and pages with standard relative URLs. A clean
  // path route preserves those references; the query route above remains for compatibility.
  @Get('preview/files/:fileId/*path')
  async previewResourceByPath(@Req() request: Request, @Param('fileId') fileId: string, @Param('path') path: string | string[], @Res() response: Response) {
    return this.sendPreviewResource(request, fileId, Array.isArray(path) ? path.join('/') : path, response)
  }

  private async sendPreviewResource(request: Request, fileId: string, path: string, response: Response) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    const file = await this.workspaceService.canAccessPrototypeFile(user.id, fileId)
    if (!file?.storageKey) throw new BadRequestException({ errorCode: 'NOT_FOUND', message: '预览资源不存在或无权访问' })

    const safePath = this.parser.assertSafeRelativePath(path)
    const extractedPath = this.storage.getExtractedPath(file.storageKey)
    const root = resolve(extractedPath)
    const filePath = resolve(root, safePath)
    if (filePath !== root && !filePath.startsWith(`${root}\\`) && !filePath.startsWith(`${root}/`)) {
      throw new BadRequestException({ errorCode: 'VALIDATION_ERROR', message: '资源路径不安全' })
    }
    try {
      await fs.access(filePath)
    } catch {
      throw new NotFoundException({ errorCode: 'NOT_FOUND', message: '预览资源不存在' })
    }
    const mimeType = lookupMime(filePath) || 'application/octet-stream'
    response.setHeader('Content-Type', mimeType)
    response.setHeader('Cache-Control', 'private, no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Content-Security-Policy', "sandbox allow-scripts allow-same-origin")
    // Supplying an explicit root preserves the relative-resource contract on Windows as well.
    return response.sendFile(safePath, { root })
  }

  private isZip(buffer: Buffer) {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  }

  private decodeUploadFilename(filename: string): string {
    // Multer/busboy may expose a UTF-8 filename through a Latin-1 string.
    // Do not depend on a narrow character-range heuristic: Chinese mojibake
    // commonly starts with \u00e5 / \u00e6, which the old guard missed.
    if (filename.includes('\ufffd')) return filename

    const repaired = Buffer.from(filename, 'latin1').toString('utf8')
    if (repaired.includes('\ufffd')) return filename

    // Only use the repair when re-encoding it gives us exactly the bytes that
    // arrived. Normal Unicode filenames cannot round-trip through Latin-1.
    return Buffer.from(repaired, 'utf8').toString('latin1') === filename ? repaired : filename
  }
}
