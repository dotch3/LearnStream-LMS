import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'My New Name', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'pt', enum: ['en', 'pt'] })
  @IsOptional()
  @IsIn(['en', 'pt'])
  locale?: string;
}
