import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCertificateDto {
  @ApiPropertyOptional({ description: 'Name to print on the certificate (defaults to user profile name)' })
  @IsOptional()
  @IsString()
  recipientName?: string;
}
