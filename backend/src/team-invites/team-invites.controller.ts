import { Controller, Delete, Get, Param, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from '../auth/auth.service'
import { ok } from '../common/api-response'
import { TeamInvitesService } from './team-invites.service'

const SESSION_COOKIE = 'hd_sid'

@Controller()
export class TeamInvitesController {
  constructor(private readonly auth: AuthService, private readonly invites: TeamInvitesService) {}

  @Post('teams/:teamId/invites')
  async create(@Req() request: Request, @Param('teamId') teamId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.invites.create(user.id, teamId), '团队邀请链接已创建')
  }

  @Delete('teams/:teamId/invites/:inviteId')
  async revoke(@Req() request: Request, @Param('teamId') teamId: string, @Param('inviteId') inviteId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.invites.revoke(user.id, teamId, inviteId), '团队邀请链接已撤销')
  }

  @Get('team-invites/:token')
  async inspect(@Param('token') token: string) {
    return ok(await this.invites.inspect(token), '团队邀请链接有效')
  }

  @Post('team-invites/:token/accept')
  async accept(@Req() request: Request, @Param('token') token: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.invites.accept(user.id, token), '已加入团队')
  }
}
