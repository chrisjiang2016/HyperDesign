import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

export class CreateShareLinkDto {
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays!: number

  /**
   * 分享链接授予的权限类型，省略时按仅查看处理（向后兼容旧客户端）。
   * VIEW_ONLY：仅获得该原型的只读预览权限
   * JOIN_TEAM：接受后额外加入该原型所属团队，成为普通成员
   */
  @IsOptional()
  @IsIn(['VIEW_ONLY', 'JOIN_TEAM'])
  accessType?: 'VIEW_ONLY' | 'JOIN_TEAM'
}
