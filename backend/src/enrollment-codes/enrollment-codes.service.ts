import { BadRequestException, Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentCodeDto } from './dto/create-enrollment-code.dto';
import { UpdateEnrollmentCodeDto } from './dto/update-enrollment-code.dto';

@Injectable()
export class EnrollmentCodesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async create(dto: CreateEnrollmentCodeDto) {
    const code = dto.code ?? this.generateCode();
    return this.prisma.enrollmentCode.create({
      data: {
        code,
        label: dto.label,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        tracks: {
          create: dto.trackIds.map((trackId) => ({ trackId })),
        },
      },
      include: { tracks: { include: { track: { select: { id: true, name: true } } } } },
    });
  }

  async findAll(page = 1, perPage = 50) {
    const skip = (page - 1) * perPage;
    const [codes, total] = await Promise.all([
      this.prisma.enrollmentCode.findMany({
        include: { tracks: { include: { track: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.enrollmentCode.count(),
    ]);
    return {
      data: codes.map((c) => ({
        ...c,
        tracks: c.tracks.map((t) => t.track),
      })),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async update(id: string, dto: UpdateEnrollmentCodeDto) {
    const { trackIds, ...rest } = dto;
    if (trackIds) {
      await this.prisma.enrollmentCodeTrack.deleteMany({ where: { codeId: id } });
      await this.prisma.enrollmentCodeTrack.createMany({
        data: trackIds.map((trackId) => ({ codeId: id, trackId })),
      });
    }
    return this.prisma.enrollmentCode.update({
      where: { id },
      data: {
        ...(rest.code !== undefined && { code: rest.code }),
        ...(rest.label !== undefined && { label: rest.label }),
        ...(rest.maxUses !== undefined && { maxUses: rest.maxUses }),
        ...(rest.expiresAt !== undefined && { expiresAt: new Date(rest.expiresAt) }),
        ...(rest.isActive !== undefined && { isActive: rest.isActive }),
      },
      include: { tracks: { include: { track: { select: { id: true, name: true } } } } },
    });
  }

  async remove(id: string) {
    await this.prisma.enrollmentCode.delete({ where: { id } });
    return { message: 'Code deleted' };
  }

  async redeem(userId: string, rawCode: string): Promise<{ enrolledTrackIds: string[] }> {
    const codeRecord = await this.prisma.enrollmentCode.findUnique({
      where: { code: rawCode },
      include: { tracks: true },
    });

    if (!codeRecord || !codeRecord.isActive) {
      throw new BadRequestException('Invalid or expired code');
    }
    if (codeRecord.expiresAt && codeRecord.expiresAt < new Date()) {
      throw new BadRequestException('This code has expired');
    }
    if (codeRecord.maxUses !== null && codeRecord.usedCount >= codeRecord.maxUses) {
      throw new BadRequestException('This code is no longer valid');
    }

    const trackIds = codeRecord.tracks.map((t) => t.trackId);

    if (trackIds.length > 0) {
      const existingEnrollments = await this.prisma.enrollment.findMany({
        where: { userId, trackId: { in: trackIds }, status: EnrollmentStatus.APPROVED },
        select: { trackId: true },
      });
      if (existingEnrollments.length === trackIds.length) {
        throw new BadRequestException('You have already used this code');
      }
    }

    const enrolledTrackIds: string[] = [];

    for (const trackId of trackIds) {
      const existing = await this.prisma.enrollment.findUnique({
        where: { userId_trackId: { userId, trackId } },
      });
      if (existing?.status === EnrollmentStatus.APPROVED) continue;

      if (existing) {
        await this.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: EnrollmentStatus.APPROVED, resolvedAt: new Date() },
        });
      } else {
        await this.prisma.enrollment.create({
          data: { userId, trackId, status: EnrollmentStatus.APPROVED, resolvedAt: new Date() },
        });
      }
      enrolledTrackIds.push(trackId);
    }

    if (enrolledTrackIds.length > 0) {
      const newCount = codeRecord.usedCount + 1;
      await this.prisma.enrollmentCode.update({
        where: { id: codeRecord.id },
        data: {
          usedCount: newCount,
          ...(codeRecord.maxUses !== null && newCount >= codeRecord.maxUses ? { isActive: false } : {}),
        },
      });
    }

    return { enrolledTrackIds };
  }
}
