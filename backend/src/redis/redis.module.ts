import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

export const REDIS_CLIENT = 'REDIS_CLIENT'

/**
 * A single shared ioredis client for the whole process.
 *
 * Connection failures must never crash the API: rate limiting and any future
 * shared-session use of Redis are auxiliary to the core MySQL-backed
 * request path. `lazyConnect: false` combined with `retryStrategy` lets
 * ioredis keep retrying in the background while `RedisRateLimiterService`
 * treats a down Redis as "allow the request" (fail-open) so an outage
 * degrades to unlimited local behaviour rather than blocking logins.
 */
function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  const logger = new Logger('RedisModule')

  if (!url) {
    logger.warn('REDIS_URL is not set; Redis-backed rate limiting is disabled and requests will not be throttled')
  }

  const client = new Redis(url ?? 'redis://127.0.0.1:6379', {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
    reconnectOnError: () => true,
  })

  client.on('error', (error) => {
    logger.warn(`Redis connection error: ${error instanceof Error ? error.message : String(error)}`)
  })

  return client
}

@Global()
@Module({
  providers: [{ provide: REDIS_CLIENT, useFactory: createRedisClient }],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy() {
    await this.client.quit()
  }
}
