import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Alice Smith', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.VIEWER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
