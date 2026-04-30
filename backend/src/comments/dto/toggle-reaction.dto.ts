import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const ALLOWED_EMOJIS = ['👍', '😊', '💡', '❤️'] as const;

export class ToggleReactionDto {
  @ApiProperty({ enum: ALLOWED_EMOJIS })
  @IsString()
  @IsIn(ALLOWED_EMOJIS)
  emoji: string;
}
