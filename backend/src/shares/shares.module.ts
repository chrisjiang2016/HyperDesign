import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { SharesController } from './shares.controller'
import { SharesService } from './shares.service'
import { PublicPreviewController } from './public-preview.controller'
import { StorageModule } from '../storage/storage.module'

@Module({ imports: [AuthModule, PrismaModule, StorageModule], controllers: [SharesController, PublicPreviewController], providers: [SharesService] })
export class SharesModule {}
