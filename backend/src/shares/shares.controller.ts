import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from '../auth/auth.service'
import { ok } from '../common/api-response'
import { CreateShareLinkDto } from './dto'
import { SharesService } from './shares.service'

const SESSION_COOKIE = 'hd_sid'

@Controller()
export class SharesController {
  constructor(private readonly auth: AuthService, private readonly shares: SharesService) {}

  @Get('files/:fileId/shares')
  async list(@Req() request: Request, @Param('fileId') fileId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.shares.list(user.id, fileId), '分享链接列表获取成功')
  }

  @Post('files/:fileId/shares')
  async create(@Req() request: Request, @Param('fileId') fileId: string, @Body() dto: CreateShareLinkDto) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.shares.create(user.id, fileId, dto.expiresInDays), '分享链接创建成功')
  }

  @Delete('files/:fileId/shares/:shareId')
  async revoke(@Req() request: Request, @Param('fileId') fileId: string, @Param('shareId') shareId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.shares.revoke(user.id, fileId, shareId), '分享链接已撤销')
  }

  @Get('shares/:token')
  async inspect(@Param('token') token: string) {
    return ok(await this.shares.inspect(token), '分享链接有效')
  }

  @Post('shares/:token/accept')
  async accept(@Req() request: Request, @Param('token') token: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.shares.accept(user.id, token), '分享已接受')
  }
}
