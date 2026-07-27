import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from '../auth/auth.service'
import { ok } from '../common/api-response'
import { CollaborationService } from './collaboration.service'
import { CreateAnnotationDto, CreateCommentDto, UpdateCommentDto } from './dto'

const SESSION_COOKIE = 'hd_sid'

@Controller('files/:fileId')
export class CollaborationController {
  constructor(private readonly auth: AuthService, private readonly collaboration: CollaborationService) {}

  @Get('annotations')
  async list(@Req() request: Request, @Param('fileId') fileId: string, @Query('pageId') pageId?: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.collaboration.listAnnotations(user.id, fileId, pageId), '标注列表获取成功')
  }

  @Post('pages/:pageId/annotations')
  async create(@Req() request: Request, @Param('fileId') fileId: string, @Param('pageId') pageId: string, @Body() dto: CreateAnnotationDto) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.collaboration.createAnnotation(user.id, fileId, pageId, dto), '标注创建成功')
  }

  @Post('annotations/:annotationId/comments')
  async comment(@Req() request: Request, @Param('fileId') fileId: string, @Param('annotationId') annotationId: string, @Body() dto: CreateCommentDto) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.collaboration.addComment(user.id, fileId, annotationId, dto), '评论已发送')
  }

  @Patch('annotations/:annotationId/status')
  async status(@Req() request: Request, @Param('fileId') fileId: string, @Param('annotationId') annotationId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.collaboration.toggleResolved(user.id, fileId, annotationId), '标注状态已更新')
  }

  @Patch('annotations/:annotationId/comments/:commentId')
  async updateComment(@Req() request: Request, @Param('fileId') fileId: string, @Param('annotationId') annotationId: string, @Param('commentId') commentId: string, @Body() dto: UpdateCommentDto) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.collaboration.updateComment(user.id, fileId, annotationId, commentId, dto), '评论已更新')
  }

  @Delete('annotations/:annotationId/comments/:commentId')
  async deleteComment(@Req() request: Request, @Param('fileId') fileId: string, @Param('annotationId') annotationId: string, @Param('commentId') commentId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.collaboration.deleteComment(user.id, fileId, annotationId, commentId), '评论已删除')
  }

  @Delete('annotations/:annotationId')
  async deleteAnnotation(@Req() request: Request, @Param('fileId') fileId: string, @Param('annotationId') annotationId: string) {
    const user = await this.auth.getCurrentUser(request.cookies?.[SESSION_COOKIE])
    return ok(await this.collaboration.deleteAnnotation(user.id, fileId, annotationId), '标注已删除')
  }
}
