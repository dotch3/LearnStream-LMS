import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsOptional,
  IsUrl,
  IsInt,
} from 'class-validator';

export class CreateTrackDto {
  @ApiProperty({ example: 'JavaScript Fundamentals' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Core JS concepts from variables to async/await' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  order?: number;
}
