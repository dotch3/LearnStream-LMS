import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsUrl, IsInt } from 'class-validator';

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
    example: 'https://img.youtube.com/vi/pTJaacq5YWQ/maxresdefault.jpg',
    description: 'Cover image URL for the track card',
  })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display order — lower numbers appear first' })
  @IsInt()
  @IsOptional()
  order?: number;
}
