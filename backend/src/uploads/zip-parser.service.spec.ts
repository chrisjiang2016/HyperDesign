import { BadRequestException } from '@nestjs/common'
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
})
