import { PartialType, OmitType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

class CreateUserWithoutPasswordDto extends OmitType(CreateUserDto, [
  'password',
] as const) {}

export class UpdateUserDto extends PartialType(CreateUserWithoutPasswordDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
