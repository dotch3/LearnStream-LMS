import { ApiProperty } from '@nestjs/swagger';

export class CertificateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  completedVideoCount: number;

  @ApiProperty()
  recipientName: string;

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty()
  trackId: string;

  @ApiProperty()
  trackName: string;
}
