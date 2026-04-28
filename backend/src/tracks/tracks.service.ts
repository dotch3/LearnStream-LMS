import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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

    const [tracks, total] = await this.prisma.$transaction([
      this.prisma.track.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { order: 'asc' },
        include: {
          trackVideos: {
            include: { video: { select: { id: true, isActive: true } } },
          },
        },
      }),
      this.prisma.track.count({ where }),
    ]);

    const data = tracks.map((t) => {
      const videoCount = isAdmin
        ? t.trackVideos.length
        : t.trackVideos.filter((tv) => tv.video.isActive).length;
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        thumbnailUrl: t.thumbnailUrl,
        isActive: t.isActive,
        order: t.order,
        videoCount,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

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
        trackVideos: {
          where: isAdmin ? undefined : { video: { isActive: true } },
          include: { video: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!track || (!isAdmin && !track.isActive)) {
      throw new NotFoundException('Track not found');
    }

    const videos = track.trackVideos.map((tv) => ({
      id: tv.video.id,
      title: tv.video.title,
      youtubeId: tv.video.youtubeId,
      thumbnailUrl: tv.video.thumbnailUrl,
      duration: tv.video.duration,
      order: tv.order,
      isActive: tv.video.isActive,
    }));

    return {
      id: track.id,
      name: track.name,
      description: track.description,
      thumbnailUrl: track.thumbnailUrl,
      isActive: track.isActive,
      order: track.order,
      videoCount: videos.length,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
      videos,
    };
  }

  async create(dto: CreateTrackDto) {
    return this.prisma.track.create({ data: dto });
  }

  async update(id: string, dto: UpdateTrackDto) {
    try {
      return await this.prisma.track.update({ where: { id }, data: dto });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
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
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Track not found');
      }
      throw err;
    }
  }

  async addVideoToTrack(trackId: string, videoId: string, order: number) {
    const [track, video] = await Promise.all([
      this.prisma.track.findUnique({ where: { id: trackId } }),
      this.prisma.video.findUnique({ where: { id: videoId } }),
    ]);
    if (!track) throw new NotFoundException('Track not found');
    if (!video) throw new NotFoundException('Video not found');

    try {
      return await this.prisma.trackVideo.create({
        data: { trackId, videoId, order },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Video is already in this track');
      }
      throw err;
    }
  }

  async removeVideoFromTrack(trackId: string, videoId: string) {
    try {
      await this.prisma.trackVideo.delete({
        where: { trackId_videoId: { trackId, videoId } },
      });
      return { message: 'Video removed from track' };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Video not in this track');
      }
      throw err;
    }
  }

  async updateVideoOrder(trackId: string, videoId: string, order: number) {
    try {
      return await this.prisma.trackVideo.update({
        where: { trackId_videoId: { trackId, videoId } },
        data: { order },
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Video not in this track');
      }
      throw err;
    }
  }
}
