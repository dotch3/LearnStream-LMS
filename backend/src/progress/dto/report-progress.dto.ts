import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';

export class ReportProgressDto {
  @ApiProperty({ example: 'uuid-of-video' })
  @IsUUID()
  videoId: string;

  @ApiProperty({
    example: 240,
    description: 'Seconds watched (max position reached)',
  })
  @IsInt()
  @Min(0)
  watchedSeconds: number;

  @ApiProperty({ example: 300, description: 'Total video duration in seconds' })
  @IsInt()
  @Min(1)
  totalSeconds: number;
}
