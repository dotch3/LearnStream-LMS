import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment text (max 2000 characters)' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies (must be a top-level comment)' })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
