import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateVideoDto } from './create-video.dto';

class CreateVideoBase extends OmitType(CreateVideoDto, ['trackId'] as const) {}

export class UpdateVideoDto extends PartialType(CreateVideoBase) {
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
