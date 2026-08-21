import { SetMetadata } from '@nestjs/common'

export interface RateLimitOptions {
  /** Logical bucket name, used as part of the Redis key, e.g. 'login'. */
  name: string
  /** Max requests allowed per window. */
  limit: number
  /** Window length in seconds. */
  windowSeconds: number
  /**
   * Optional request body field to fold into the key in addition to the
   * client IP (e.g. 'username') so limits are per IP+identity, not just
   * per IP. Leave unset for IP-only limiting.
   */
  identityField?: string
}

export const RATE_LIMIT_KEY = 'rateLimit'

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options)
