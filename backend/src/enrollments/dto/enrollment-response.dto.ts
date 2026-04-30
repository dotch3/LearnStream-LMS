export class EnrollmentResponseDto {
  id: string;
  trackId: string;
  trackName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  status: string;
  requestedAt: Date;
  resolvedAt?: Date | null;
}
