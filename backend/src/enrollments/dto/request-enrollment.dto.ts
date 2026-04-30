import { IsUUID } from 'class-validator';

export class RequestEnrollmentDto {
  @IsUUID()
  trackId: string;
}
