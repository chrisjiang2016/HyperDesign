import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health/health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { RateLimitModule } from './rate-limit/rate-limit.module'
import { RedisModule } from './redis/redis.module'
import { StorageModule } from './storage/storage.module'
import { UploadsModule } from './uploads/uploads.module'
import { CollaborationModule } from './collaboration/collaboration.module'
import { SharesModule } from './shares/shares.module'

@Module({
  imports: [RedisModule, RateLimitModule, PrismaModule, StorageModule, AuthModule, UploadsModule, CollaborationModule, SharesModule],
  controllers: [HealthController],
})
export class AppModule {}
