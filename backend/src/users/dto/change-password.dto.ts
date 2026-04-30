import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]).{8,}$/;
const PASSWORD_MSG =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

export class ChangePasswordDto {
  @ApiProperty({ example: 'MyOldPass!', description: 'Current account password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'MyNewStr0ng!1', description: PASSWORD_MSG })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  newPassword!: string;
}
