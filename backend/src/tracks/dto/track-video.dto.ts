import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AddVideoToTrackDto {
  @ApiProperty({ example: 'uuid-of-video' })
  @IsUUID()
  videoId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class UpdateVideoOrderDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  order: number;
}
