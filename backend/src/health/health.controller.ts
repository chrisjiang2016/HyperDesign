import { Controller, Get, Inject } from '@nestjs/common'
import type Redis from 'ioredis'
import { ok } from '../common/api-response'
import { PrismaService } from '../prisma/prisma.service'
import { REDIS_CLIENT } from '../redis/redis.module'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    await this.prisma.$queryRawUnsafe('SELECT 1')
    // Redis backs rate limiting only; treat it as a degraded, non-fatal
    // dependency so a Redis outage does not flip the whole health check
    // (and therefore Docker's healthcheck / orchestrator readiness probe)
    // to unhealthy while MySQL-backed core functionality is fine.
    const redisStatus = await this.checkRedis()
    return ok({ status: 'ok', database: 'ok', redis: redisStatus, timestamp: new Date().toISOString() })
  }

  private async checkRedis(): Promise<'ok' | 'degraded'> {
    try {
      const reply = await this.redis.ping()
      return reply === 'PONG' ? 'ok' : 'degraded'
    } catch {
      return 'degraded'
    }
  }
}
