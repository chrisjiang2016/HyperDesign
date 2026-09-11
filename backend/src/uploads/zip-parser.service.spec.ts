import { BadRequestException } from '@nestjs/common'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ZipParserService } from './zip-parser.service'

describe('ZipParserService path safety', () => {
  const service = new ZipParserService()

  it.each([
    '../secret.txt',
    '..%2Fsecret.txt',
    '%2e%2e%2fsecret.txt',
    '/etc/passwd',
    'C:/Windows/win.ini',
    'assets%00payload.js',
  ])('rejects unsafe archive or preview path: %s', (path) => {
    expect(() => service.assertSafeRelativePath(path)).toThrow(BadRequestException)
  })

  it('keeps a normal relative prototype resource path unchanged', () => {
    expect(service.assertSafeRelativePath('assets/scripts/app.js')).toBe('assets/scripts/app.js')
  })

  it('rejects unsafe archive metadata', () => {
    expect(() => service.assertSafeArchive([
      { path: '../escape.txt', type: 'File', uncompressedSize: 1 },
    ])).toThrow(BadRequestException)
  })

  it('rejects files and expanded archives above their size limits', () => {
    expect(() => service.assertSafeArchive([
      { path: 'assets/file.bin', type: 'File', uncompressedSize: 101 * 1024 * 1024 },
    ])).toThrow(BadRequestException)
    expect(() => service.assertSafeArchive([
      { path: 'assets/first.bin', type: 'File', uncompressedSize: 300 * 1024 * 1024 },
      { path: 'assets/second.bin', type: 'File', uncompressedSize: 300 * 1024 * 1024 },
    ])).toThrow(BadRequestException)
  })

  it('accepts a bounded normal archive manifest', () => {
    expect(() => service.assertSafeArchive([
      { path: 'index.html', type: 'File', uncompressedSize: 1_024 },
      { path: 'assets/', type: 'Directory', uncompressedSize: 0 },
      { path: 'assets/app.js', type: 'File', uncompressedSize: 2_048 },
    ])).not.toThrow()
  })

  it('accepts large Axure-style manifests below the configured entry limit', () => {
    const entries = Array.from({ length: 15_779 }, (_, index) => ({
      path: `images/u${index}.png`,
      type: 'File',
      uncompressedSize: 1_024,
    }))
    expect(() => service.assertSafeArchive(entries)).not.toThrow()
  })

  it('scans a standalone HTML source as one entry page', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hyperdesign-html-'))
    try {
      await writeFile(join(directory, 'index.html'), '<!doctype html><title>Single page</title>')
      await writeFile(join(directory, 'app.js'), 'console.log("ok")')
      await expect(service.scanExtractedDirectory(directory)).resolves.toEqual([
        expect.objectContaining({
          relativePath: 'index.html',
          directoryPath: null,
          title: 'Single page',
          isEntry: true,
          sortOrder: 0,
        }),
      ])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
