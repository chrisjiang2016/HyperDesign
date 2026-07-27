import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health/health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { UploadsModule } from './uploads/uploads.module'
import { CollaborationModule } from './collaboration/collaboration.module'
import { SharesModule } from './shares/shares.module'

@Module({
  imports: [PrismaModule, AuthModule, UploadsModule, CollaborationModule, SharesModule],
  controllers: [HealthController],
})
export class AppModule {}
