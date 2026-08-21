import { RedisRateLimiterService } from './redis-rate-limiter.service'

describe('RedisRateLimiterService', () => {
  it('allows requests within the window and returns remaining capacity', async () => {
    const redis = { eval: jest.fn().mockResolvedValue([2, 42]) }
    const service = new RedisRateLimiterService(redis as never)

    await expect(service.check('ratelimit:test:ip', 5, 60)).resolves.toEqual({
      allowed: true,
      remaining: 3,
      retryAfterSeconds: 42,
    })
    expect(redis.eval).toHaveBeenCalledWith(expect.stringContaining('redis.call("INCR"'), 1, 'ratelimit:test:ip', 60)
  })

  it('blocks requests over the limit', async () => {
    const service = new RedisRateLimiterService({ eval: jest.fn().mockResolvedValue([6, 12]) } as never)

    await expect(service.check('ratelimit:test:ip', 5, 60)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 12,
    })
  })

  it('fails open when Redis is unavailable', async () => {
    const service = new RedisRateLimiterService({ eval: jest.fn().mockRejectedValue(new Error('connection refused')) } as never)

    await expect(service.check('ratelimit:test:ip', 5, 60)).resolves.toEqual({
      allowed: true,
      remaining: 5,
      retryAfterSeconds: 60,
    })
  })
})
