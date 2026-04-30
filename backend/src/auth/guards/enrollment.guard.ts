import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role, TrackVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user: { id: string; role: Role }; params: { id?: string } }>();
    const user = req.user;
    if (!user) throw new ForbiddenException();
    if (user.role === Role.ADMIN) return true;

    const trackId = req.params.id;
    if (!trackId) return true;

    // Check if track is PUBLIC (available for viewing without enrollment)
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { visibility: true },
    });
    
    if (track?.visibility === TrackVisibility.PUBLIC) {
      // Allow access for viewing PUBLIC tracks
      return true;
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_trackId: { userId: user.id, trackId } },
    });
    if (enrollment?.status === 'APPROVED') return true;
    throw new ForbiddenException('Not enrolled in this course');
  }
}
