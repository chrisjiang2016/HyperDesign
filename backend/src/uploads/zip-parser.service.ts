import { BadRequestException, Injectable } from '@nestjs/common'
import { createReadStream, promises as fs } from 'node:fs'
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import * as unzipper from 'unzipper'

export interface ParsedHtmlPage {
  relativePath: string
  directoryPath: string | null
  title: string | null
  isEntry: boolean
  sortOrder: number
}

// Upload bytes are limited at the HTTP boundary. These limits cap the expanded
// archive as well, preventing a small compressed ZIP from exhausting disk or
// worker time during extraction.
const MAX_ARCHIVE_ENTRIES = 10_000
const MAX_SINGLE_ENTRY_BYTES = 100 * 1024 * 1024
const MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024

@Injectable()
export class ZipParserService {
  async extractAndScan(zipPath: string, targetDirectory: string): Promise<ParsedHtmlPage[]> {
    await fs.rm(targetDirectory, { recursive: true, force: true })
    await fs.mkdir(targetDirectory, { recursive: true })
    const root = resolve(targetDirectory)
    const directory = await unzipper.Open.file(zipPath)
    this.assertSafeArchive(directory.files)

    for (const entry of directory.files) {
      if (entry.type === 'Directory') continue
      const outputPath = this.safeDestination(root, entry.path)
      await fs.mkdir(dirname(outputPath), { recursive: true })
      await new Promise<void>((resolveWrite, rejectWrite) => {
        entry.stream()
          .pipe(require('node:fs').createWriteStream(outputPath, { flags: 'w' }))
          .on('finish', resolveWrite)
          .on('error', rejectWrite)
      })
    }

    await this.flattenSingleRootDirectory(root)
    const htmlFiles = await this.findHtmlFiles(root)
    if (htmlFiles.length === 0) {
      throw new BadRequestException({ errorCode: 'NO_HTML_FOUND', message: 'ZIP 中未识别到 HTML 页面' })
    }

    const relativePaths = htmlFiles
      .map((file) => relative(root, file).replaceAll(sep, '/'))
      .filter((path) => this.isPrototypePage(path))
      .sort((a, b) => a.localeCompare(b))
    if (relativePaths.length === 0) {
      throw new BadRequestException({ errorCode: 'NO_HTML_FOUND', message: 'ZIP 中未识别到可预览的原型页面' })
    }
    const entryPath = this.selectEntry(relativePaths)

    return Promise.all(relativePaths.map(async (relativePath, sortOrder) => {
      const absolutePath = this.safeDestination(root, relativePath)
      return {
        relativePath,
        directoryPath: dirname(relativePath) === '.' ? null : dirname(relativePath).replaceAll(sep, '/'),
        title: await this.extractTitle(absolutePath),
        isEntry: relativePath === entryPath,
        sortOrder,
      }
    }))
  }

  assertSafeRelativePath(relativePath: string): string {
    let decodedPath: string
    try {
      decodedPath = decodeURIComponent(relativePath)
    } catch {
      throw new BadRequestException({ errorCode: 'VALIDATION_ERROR', message: '资源路径编码无效' })
    }
    if (!decodedPath || decodedPath.includes('\0')) {
      throw new BadRequestException({ errorCode: 'VALIDATION_ERROR', message: '资源路径无效' })
    }
    const normalized = normalize(decodedPath).replaceAll('\\', '/')
    if (normalized.startsWith('../') || normalized === '..' || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
      throw new BadRequestException({ errorCode: 'VALIDATION_ERROR', message: '资源路径不安全' })
    }
    return normalized
  }

  assertSafeArchive(entries: Array<{ path: string; type: string; uncompressedSize?: number }>): void {
    if (entries.length > MAX_ARCHIVE_ENTRIES) {
      throw new BadRequestException({ errorCode: 'ZIP_PARSE_FAILED', message: 'ZIP 文件条目数量超出限制' })
    }

    let totalUncompressedBytes = 0
    for (const entry of entries) {
      if (entry.type !== 'Directory' && entry.type !== 'File') {
        throw new BadRequestException({ errorCode: 'ZIP_PARSE_FAILED', message: 'ZIP 包含不支持的文件类型' })
      }
      this.assertSafeRelativePath(entry.path)
      const size = entry.uncompressedSize ?? 0
      if (!Number.isFinite(size) || size < 0 || size > MAX_SINGLE_ENTRY_BYTES) {
        throw new BadRequestException({ errorCode: 'ZIP_PARSE_FAILED', message: 'ZIP 包含超出限制的文件' })
      }
      totalUncompressedBytes += size
      if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new BadRequestException({ errorCode: 'ZIP_PARSE_FAILED', message: 'ZIP 解压后的总大小超出限制' })
      }
    }
  }

  private safeDestination(root: string, entryPath: string): string {
    const safeRelativePath = this.assertSafeRelativePath(entryPath)
    const destination = resolve(root, safeRelativePath)
    if (destination !== root && !destination.startsWith(`${root}${sep}`)) {
      throw new BadRequestException({ errorCode: 'ZIP_PARSE_FAILED', message: 'ZIP 包含不安全路径' })
    }
    return destination
  }

  private async findHtmlFiles(root: string): Promise<string[]> {
    const entries = await fs.readdir(root, { withFileTypes: true })
    const result: string[] = []
    for (const entry of entries) {
      const path = join(root, entry.name)
      if (entry.isDirectory()) result.push(...await this.findHtmlFiles(path))
      else if (entry.isFile() && ['.html', '.htm'].includes(extname(entry.name).toLowerCase())) result.push(path)
    }
    return result
  }

  private isPrototypePage(relativePath: string): boolean {
    const lower = relativePath.toLowerCase()
    if (lower.startsWith('resources/')) return false
    // Axure's start_with_pages.html is the actual player entry. Keep it in the
    // page catalog so the Viewer loads the complete Axure boot sequence by default.
    // The other start aliases remain hidden but can be loaded as relative resources.
    if (lower === 'start.html' || lower === 'start_c_1.html') return false
    return true
  }

  private async flattenSingleRootDirectory(root: string): Promise<void> {
    const entries = await fs.readdir(root, { withFileTypes: true })
    if (entries.length !== 1 || !entries[0].isDirectory()) return

    const wrapperPath = join(root, entries[0].name)
    const nestedEntries = await fs.readdir(wrapperPath)
    for (const entryName of nestedEntries) {
      await fs.rename(join(wrapperPath, entryName), join(root, entryName))
    }
    await fs.rmdir(wrapperPath)
  }

  private selectEntry(paths: string[]): string {
    const axureStart = paths.find((path) => path.toLowerCase() === 'start_with_pages.html')
    if (axureStart) return axureStart
    const start = paths.find((path) => path.toLowerCase() === 'start.html')
    if (start) return start
    const rootIndex = paths.find((path) => path.toLowerCase() === 'index.html')
    if (rootIndex) return rootIndex
    const indexes = paths.filter((path) => path.toLowerCase().endsWith('/index.html') || path.toLowerCase() === 'index.htm')
    if (indexes.length) return indexes.sort((a, b) => a.split('/').length - b.split('/').length)[0]
    return paths[0]
  }

  private async extractTitle(path: string): Promise<string | null> {
    const content = await fs.readFile(path, 'utf8').catch(() => '')
    const match = content.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i)
    return match?.[1] ? this.decodeHtmlEntities(match[1].trim()) : null
  }

  private decodeHtmlEntities(value: string): string {
    return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, entity: string) => {
      const codePoint = entity.toLowerCase().startsWith('x') ? Number.parseInt(entity.slice(1), 16) : Number.parseInt(entity, 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _
    })
  }
}
