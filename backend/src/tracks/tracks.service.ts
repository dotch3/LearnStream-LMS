import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isAdmin: boolean, page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const where = isAdmin ? {} : { isActive: true };

    const countSelect = isAdmin
      ? { select: { videos: true } }
      : { select: { videos: { where: { isActive: true } } } };

    const [tracks, total] = await this.prisma.$transaction([
      this.prisma.track.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { order: 'asc' },
        include: { _count: countSelect },
      }),
      this.prisma.track.count({ where }),
    ]);

    const data = tracks.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      thumbnailUrl: t.thumbnailUrl,
      isActive: t.isActive,
      order: t.order,
      videoCount: t._count.videos,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string, isAdmin: boolean) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: {
        videos: {
          where: isAdmin ? undefined : { isActive: true },
          orderBy: { order: 'asc' },
        },
        _count: isAdmin
          ? { select: { videos: true } }
          : { select: { videos: { where: { isActive: true } } } },
      },
    });

    if (!track || (!isAdmin && !track.isActive)) {
      throw new NotFoundException('Track not found');
    }

    return {
      id: track.id,
      name: track.name,
      description: track.description,
      thumbnailUrl: track.thumbnailUrl,
      isActive: track.isActive,
      order: track.order,
      videoCount: track._count.videos,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
      videos: track.videos.map((v) => ({
        id: v.id,
        title: v.title,
        youtubeId: v.youtubeId,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        order: v.order,
        isActive: v.isActive,
      })),
    };
  }

  async create(dto: CreateTrackDto) {
    return this.prisma.track.create({ data: dto });
  }

  async update(id: string, dto: UpdateTrackDto) {
    try {
      return await this.prisma.track.update({ where: { id }, data: dto });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Track not found');
      }
      throw err;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.track.delete({ where: { id } });
      return { message: 'Track deleted successfully' };
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Track not found');
      }
      throw err;
    }
  }
}
