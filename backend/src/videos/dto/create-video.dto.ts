import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({ example: 'Introduction to Variables' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsString()
  youtubeUrl: string;

  @ApiPropertyOptional({ example: 'Learn how variables work in JavaScript' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumb.jpg' })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ example: 300, description: 'Duration in seconds' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ example: 'uuid-of-track' })
  @IsUUID()
  trackId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  order?: number;
}
