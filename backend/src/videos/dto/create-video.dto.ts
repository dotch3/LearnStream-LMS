import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsUrl, IsInt, Min, IsUUID } from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({ example: 'Lesson 1 — What Is Leadership?', description: 'Video title shown to students' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({
    example: 'https://www.youtube.com/watch?v=pTJaacq5YWQ',
    description: 'Full YouTube URL (youtu.be short links also accepted)',
  })
  @IsString()
  youtubeUrl: string;

  @ApiPropertyOptional({
    example: 'An introduction to servant leadership and its core values.',
    description: 'Optional description displayed below the video player',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://img.youtube.com/vi/pTJaacq5YWQ/maxresdefault.jpg',
    description: 'Thumbnail override URL — defaults to YouTube auto-thumb if omitted',
  })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ example: 2745, description: 'Video duration in seconds (e.g. 2745 = 45 min 45 sec)' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'ID of the parent track' })
  @IsUUID()
  trackId: string;

  @ApiPropertyOptional({ example: 1, description: 'Playback order within the track — lower numbers play first' })
  @IsInt()
  @IsOptional()
  order?: number;
}
