import { IsInt, Max, Min } from 'class-validator'

export class CreateShareLinkDto {
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays!: number
}
