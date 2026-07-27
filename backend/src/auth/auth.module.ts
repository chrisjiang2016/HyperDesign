import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PrismaModule } from '../prisma/prisma.module'
import { CurrentUserService, WorkspaceService } from './current-user.service'

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, CurrentUserService, WorkspaceService],
  exports: [AuthService, CurrentUserService, WorkspaceService],
})
export class AuthModule {}
