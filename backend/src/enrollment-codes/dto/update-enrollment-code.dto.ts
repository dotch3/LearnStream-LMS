import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateEnrollmentCodeDto } from './create-enrollment-code.dto';

export class UpdateEnrollmentCodeDto extends PartialType(CreateEnrollmentCodeDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
