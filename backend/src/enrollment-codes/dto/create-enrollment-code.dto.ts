import { IsArray, IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateEnrollmentCodeDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsUUID('4', { each: true })
  @IsArray()
  trackIds: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
