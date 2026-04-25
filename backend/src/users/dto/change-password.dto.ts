import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'MyOldPass!', description: 'Current account password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'MyNewStr0ngPass!', minLength: 6, description: 'New password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
