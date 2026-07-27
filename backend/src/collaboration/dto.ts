import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

export class CreateAnnotationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string

  @IsNumber()
  @Min(0)
  @Max(100)
  topPercent!: number

  @IsNumber()
  @Min(0)
  @Max(100)
  leftPercent!: number

  @IsNumber()
  @Min(0)
  pageScrollTop!: number

  @IsNumber()
  @Min(0)
  pageScrollHeight!: number
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string

  @IsOptional()
  @IsString()
  parentId?: string
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string
}
