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
})
