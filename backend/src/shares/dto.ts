import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

export class CreateShareLinkDto {
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays: number = 7

  /**
   * 分享链接授予的权限类型，省略时按仅查看处理（向后兼容旧客户端）。
   * VIEW_ONLY：登录接受后获得该原型的持久只读权限
   * JOIN_TEAM：接受后额外加入该原型所属团队，成为普通成员
   * PUBLIC_VIEW_ONLY：无需登录，仅凭有效 token 查看该原型，不创建授权
   */
  @IsOptional()
  @IsIn(['VIEW_ONLY', 'JOIN_TEAM', 'PUBLIC_VIEW_ONLY'])
  accessType?: 'VIEW_ONLY' | 'JOIN_TEAM' | 'PUBLIC_VIEW_ONLY'
}
