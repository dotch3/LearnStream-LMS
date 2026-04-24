import { ApiProperty } from '@nestjs/swagger';

export class PublicVerifyResponseDto {
  @ApiProperty()
  recipientName: string;

  @ApiProperty()
  trackName: string;

  @ApiProperty()
  issuedAt: Date;
}
