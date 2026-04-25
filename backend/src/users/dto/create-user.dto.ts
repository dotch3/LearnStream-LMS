import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'jane.doe@learnstream.app', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MyStr0ngPass!', minLength: 6, description: 'Password (min 6 characters)' })
  @IsString()
  @MinLength(6)
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
