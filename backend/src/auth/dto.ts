import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

const usernameRule = /^[A-Za-z0-9]{5,64}$/
const passwordRule = /^[A-Za-z0-9]{6,128}$/

export class RegisterDto {
  @Matches(usernameRule, { message: '用户名需为 5-64 位英文字母或数字' })
  username!: string

  @Matches(usernameRule, { message: '确认用户名格式不正确' })
  confirmUsername!: string

  @Matches(passwordRule, { message: '密码需为 6-128 位英文字母或数字' })
  password!: string
}

export class LoginDto {
  @Matches(usernameRule, { message: '用户名需为 5-64 位英文字母或数字' })
  username!: string

  @Matches(passwordRule, { message: '密码需为 6-128 位英文字母或数字' })
  password!: string
}

export class ResetPasswordDto {
  @Matches(usernameRule, { message: '用户名需为 5-64 位英文字母或数字' })
  username!: string
}

export class ChangePasswordDto {
  @Matches(passwordRule, { message: '原密码格式不正确' })
  oldPassword!: string

  @Matches(passwordRule, { message: '新密码需为 6-128 位英文字母或数字' })
  newPassword!: string

  @Matches(passwordRule, { message: '确认密码格式不正确' })
  confirmNewPassword!: string
}

export class CreateTeamDto {
  @IsString({ message: '团队名称不能为空' })
  @MinLength(1, { message: '团队名称不能为空' })
  @MaxLength(64, { message: '团队名称不能超过 64 个字符' })
  name!: string

  @IsOptional()
  @IsString({ message: '团队描述必须为文本' })
  @MaxLength(500, { message: '团队描述不能超过 500 个字符' })
  description?: string
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString({ message: '团队名称必须为文本' })
  @MinLength(1, { message: '团队名称不能为空' })
  @MaxLength(64, { message: '团队名称不能超过 64 个字符' })
  name?: string

  @IsOptional()
  @IsString({ message: '团队描述必须为文本' })
  @MaxLength(500, { message: '团队描述不能超过 500 个字符' })
  description?: string
}

export class CreateProjectDto {
  @IsString({ message: '项目名称不能为空' })
  @MinLength(1, { message: '项目名称不能为空' })
  @MaxLength(64, { message: '项目名称不能超过 64 个字符' })
  name!: string

  @IsOptional()
  @IsString({ message: '项目描述必须为文本' })
  @MaxLength(500, { message: '项目描述不能超过 500 个字符' })
  description?: string
}

export class UpdateProjectDto extends CreateProjectDto {}

export class AddTeamMemberDto {
  @Matches(usernameRule, { message: '用户名需为 5-64 位英文字母或数字' })
  username!: string

  @IsOptional()
  @IsBoolean({ message: 'canUpload 必须为布尔值' })
  canUpload?: boolean
}

export class UpdateUploadPermissionDto {
  @IsBoolean({ message: 'canUpload 必须为布尔值' })
  canUpload!: boolean
}

export class CreateFolderDto {
  @IsString({ message: '文件夹名称不能为空' })
  @MinLength(1, { message: '文件夹名称不能为空' })
  @MaxLength(64, { message: '文件夹名称不能超过 64 个字符' })
  name!: string

  @IsOptional()
  @IsString({ message: '父文件夹 ID 必须为文本' })
  parentId?: string
}

export class UpdateFolderDto {
  @IsOptional()
  @IsString({ message: '文件夹名称必须为文本' })
  @MinLength(1, { message: '文件夹名称不能为空' })
  @MaxLength(64, { message: '文件夹名称不能超过 64 个字符' })
  name?: string

  @IsOptional()
  @IsString({ message: '父文件夹 ID 必须为文本' })
  parentId?: string
}

export class MoveProjectFileDto {
  @IsOptional()
  @IsString({ message: '文件夹 ID 必须为文本' })
  folderId?: string
}

export class UpdateFilePermissionDto {
  @IsBoolean({ message: 'canView 必须为布尔值' })
  canView!: boolean

  @IsBoolean({ message: 'canComment 必须为布尔值' })
  canComment!: boolean

  @IsBoolean({ message: 'canEdit 必须为布尔值' })
  canEdit!: boolean

  @IsBoolean({ message: 'canDelete 必须为布尔值' })
  canDelete!: boolean
}
