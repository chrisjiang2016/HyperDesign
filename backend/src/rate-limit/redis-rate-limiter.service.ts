import { Inject, Injectable, Logger } from '@nestjs/common'
import type Redis from 'ioredis'
import { REDIS_CLIENT } from '../redis/redis.module'

export interface RateLimitResult {
  /** Whether the request is allowed to proceed. */
  allowed: boolean
  /** Remaining requests in the current window (0 when blocked). */
  remaining: number
  /** Seconds until the window resets. */
  retryAfterSeconds: number
}

/**
 * Fixed-window counter implemented as a single atomic Lua script so a burst
 * of concurrent requests from the same key cannot race past the limit
 * (INCR + separate EXPIRE would allow a key to never expire if the process
 * crashes between the two commands, and a plain INCR/GET pair is not atomic
 * under concurrency).
 *
 * Fail-open by design: if Redis is unreachable, `check` returns `allowed:
 * true`. Rate limiting is a defense-in-depth control, not the primary
 * authentication guarantee (argon2 + Prisma still gate credentials); an
 * outage should degrade to "unlimited" rather than lock every user out of
 * login/register.
 */
const INCREMENT_AND_CHECK_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return { current, ttl }
`

@Injectable()
export class RedisRateLimiterService {
  private readonly logger = new Logger(RedisRateLimiterService.name)

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * @param key Unique bucket identity, e.g. `ratelimit:login:<ip>:<username>`.
   * @param limit Maximum requests allowed within the window.
   * @param windowSeconds Fixed window length in seconds.
   */
  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      const [current, ttl] = (await this.redis.eval(INCREMENT_AND_CHECK_SCRIPT, 1, key, windowSeconds)) as [
        number,
        number,
      ]
      const remaining = Math.max(0, limit - current)
      const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds
      return { allowed: current <= limit, remaining, retryAfterSeconds }
    } catch (error) {
      this.logger.warn(
        `Rate limit check failed for key '${key}'; failing open: ${error instanceof Error ? error.message : String(error)}`,
      )
      return { allowed: true, remaining: limit, retryAfterSeconds: windowSeconds }
    }
  }
}
