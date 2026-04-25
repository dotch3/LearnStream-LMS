import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'TempPass@2024', minLength: 8 })
  password: string;
}
