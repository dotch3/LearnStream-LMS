import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, NotificationType, Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async request(userId: string, trackId: string) {
    console.log('request called with userId:', userId, 'trackId:', trackId);
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Course not found');

    const existing = await this.prisma.enrollment.findMany({
      where: { userId, trackId },
      take: 1,
    }).then((res) => res[0] ?? null);

    if (existing) {
      if (existing.status === EnrollmentStatus.APPROVED || existing.status === EnrollmentStatus.PENDING) {
        throw new ConflictException('Enrollment already exists');
      }
      // DENIED → re-request
      const updated = await this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.PENDING, resolvedAt: null, requestedAt: new Date() },
      });
      await this.notifyAdmins(userId, track.name);
      return updated;
    }

    const enrollment = await this.prisma.enrollment.create({
      data: { userId, trackId, status: EnrollmentStatus.PENDING },
    });
    await this.notifyAdmins(userId, track.name);
    return enrollment;
  }

  private async notifyAdmins(requesterId: string, trackName: string) {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } });
    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
    for (const admin of admins) {
      await this.notifications.create(
        admin.id,
        NotificationType.NEW_ENROLLMENT_REQUEST,
        'New enrollment request',
        `${requester?.name ?? 'A user'} requested access to ${trackName}`,
        { requesterId },
      );
    }
  }

  async findAllAdmin(status?: string, trackId?: string, page = 1, perPage = 20) {
    const safePerPage = Math.min(perPage, 100);
    const skip = (page - 1) * safePerPage;
    const where = {
      ...(status ? { status: status as EnrollmentStatus } : {}),
      ...(trackId ? { trackId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: safePerPage,
        orderBy: { requestedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          track: { select: { id: true, name: true } },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);
    return {
      data: data.map((e) => ({
        id: e.id,
        status: e.status,
        requestedAt: e.requestedAt,
        resolvedAt: e.resolvedAt,
        userId: e.user.id,
        userName: e.user.name,
        userEmail: e.user.email,
        trackId: e.track.id,
        trackName: e.track.name,
      })),
      meta: { total, page, perPage: safePerPage, totalPages: Math.ceil(total / safePerPage) },
    };
  }

  async findMy(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { track: { select: { id: true, name: true } } },
      orderBy: { requestedAt: 'desc' },
    });
    return enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      requestedAt: e.requestedAt,
      resolvedAt: e.resolvedAt,
      trackId: e.track.id,
      trackName: e.track.name,
    }));
  }

  async approve(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        track: { select: { name: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: { status: EnrollmentStatus.APPROVED, resolvedAt: new Date() },
    });

    await this.notifications.create(
      enrollment.user.id,
      NotificationType.ENROLLMENT_APPROVED,
      'Course access approved',
      `Your request for "${enrollment.track.name}" was approved`,
    );
    void this.mail.sendEnrollmentApproved(enrollment.user.email, enrollment.user.name, enrollment.track.name);
    return updated;
  }

  async adminEnroll(trackId: string, userId: string) {
    const [track, user] = await Promise.all([
      this.prisma.track.findUnique({ where: { id: trackId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ]);
    if (!track) throw new NotFoundException('Course not found');
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_trackId: { userId, trackId } },
    });
    if (existing) {
      return this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.APPROVED, resolvedAt: new Date() },
      });
    }
    return this.prisma.enrollment.create({
      data: { userId, trackId, status: EnrollmentStatus.APPROVED, resolvedAt: new Date() },
    });
  }

  async remove(id: string) {
    try {
      await this.prisma.enrollment.delete({ where: { id } });
      return { message: 'Enrollment removed' };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Enrollment not found');
      }
      throw err;
    }
  }

  async deny(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        track: { select: { name: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: { status: EnrollmentStatus.DENIED, resolvedAt: new Date() },
    });

    await this.notifications.create(
      enrollment.user.id,
      NotificationType.ENROLLMENT_DENIED,
      'Course access not approved',
      `Your request for "${enrollment.track.name}" was not approved`,
    );
    void this.mail.sendEnrollmentDenied(enrollment.user.email, enrollment.user.name, enrollment.track.name);
    return updated;
  }
}
