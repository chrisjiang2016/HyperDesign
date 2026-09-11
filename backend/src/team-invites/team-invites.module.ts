import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { TeamInvitesController } from './team-invites.controller'
import { TeamInvitesService } from './team-invites.service'

@Module({ imports: [AuthModule, PrismaModule], controllers: [TeamInvitesController], providers: [TeamInvitesService] })
export class TeamInvitesModule {}
