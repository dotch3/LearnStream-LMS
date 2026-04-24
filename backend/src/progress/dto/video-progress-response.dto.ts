import { ApiProperty } from '@nestjs/swagger';

export class VideoProgressResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() videoId: string;
  @ApiProperty() watchedSeconds: number;
  @ApiProperty() totalSeconds: number;
  @ApiProperty() percentage: number;
  @ApiProperty() completed: boolean;
  @ApiProperty() lastWatchedAt: Date;
  @ApiProperty() updatedAt: Date;
}
