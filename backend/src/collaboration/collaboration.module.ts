import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { CollaborationController } from './collaboration.controller'
import { CollaborationService } from './collaboration.service'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CollaborationController],
  providers: [CollaborationService],
})
export class CollaborationModule {}
