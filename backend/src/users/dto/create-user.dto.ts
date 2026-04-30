import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'jane.doe@learnstream.app', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MyStr0ngPass!1', description: 'Min 8 chars, uppercase, lowercase, digit, special char' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]).{8,}$/, {
    message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.',
  })
  password!: string;

  @ApiProperty({ example: 'Jane Doe', minLength: 2, description: 'Full display name' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.VIEWER, description: 'User role (defaults to VIEWER)' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
