import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane.doe@learnstream.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyStr0ngPass!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
