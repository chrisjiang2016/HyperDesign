import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator'
import { RedisRateLimiterService } from './redis-rate-limiter.service'

/**
 * Applies the `@RateLimit(...)` metadata set on a controller method.
 * Routes without the decorator are not rate limited (guard is a no-op).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RedisRateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler())
    if (!options) return true

    const request = context.switchToHttp().getRequest<Request>()
    const key = this.buildKey(request, options)
    const result = await this.rateLimiter.check(key, options.limit, options.windowSeconds)

    if (!result.allowed) {
      throw new HttpException(
        { errorCode: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试', retryAfterSeconds: result.retryAfterSeconds },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    return true
  }

  private buildKey(request: Request, options: RateLimitOptions): string {
    const ip = this.resolveClientIp(request)
    const identity = options.identityField ? this.readIdentity(request, options.identityField) : undefined
    return identity ? `ratelimit:${options.name}:${ip}:${identity}` : `ratelimit:${options.name}:${ip}`
  }

  private resolveClientIp(request: Request): string {
    // Express `req.ip` already honours `trust proxy`; fall back defensively
    // in case the app is invoked outside the normal HTTP server (tests).
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown'
  }

  private readIdentity(request: Request, field: string): string | undefined {
    const body = request.body as Record<string, unknown> | undefined
    const value = body?.[field]
    return typeof value === 'string' && value.length > 0 ? value.toLowerCase() : undefined
  }
}
