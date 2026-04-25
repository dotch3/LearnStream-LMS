import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: 'Jane Doe', description: 'Full name of the administrator' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@learnstream.app', description: 'Administrator email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyStr0ngPass!', minLength: 8, description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;
}
