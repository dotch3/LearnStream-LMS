import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsInt } from 'class-validator';

export class CreateTrackDto {
  @ApiProperty({ example: 'Leadership Foundations', description: 'Track title displayed to students' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    example: 'A 10-week journey through the principles of servant leadership.',
    description: 'Short description shown on the track card',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/cover.jpg',
    description: 'Cover image — either a URL or a base64 data URL from file upload',
  })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display order — lower numbers appear first' })
  @IsInt()
  @IsOptional()
  order?: number;
}
