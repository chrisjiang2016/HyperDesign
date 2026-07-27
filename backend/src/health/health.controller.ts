import { Controller, Get } from '@nestjs/common'
import { ok } from '../common/api-response'
import { PrismaService } from '../prisma/prisma.service'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRawUnsafe('SELECT 1')
    return ok({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() })
  }
}
