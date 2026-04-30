import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TrackVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { extractYoutubeId } from './videos.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVideoDto) {
    const youtubeId = extractYoutubeId(dto.youtubeUrl);
    if (!youtubeId) {
      throw new BadRequestException('Invalid YouTube URL');
    }

    const track = await this.prisma.track.findUnique({ where: { id: dto.trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const { youtubeUrl, trackId, order, ...rest } = dto;
    const video = await this.prisma.video.create({
      data: { ...rest, youtubeUrl, youtubeId },
    });

    await this.prisma.trackVideo.create({
      data: { trackId, videoId: video.id, order: order ?? 0 },
    });

    return { ...video, trackId, order: order ?? 0 };
  }

  async findOne(id: string, isAdmin: boolean) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        trackVideos: {
          include: { track: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!video) throw new NotFoundException('Video not found');

    const activeTracks = video.trackVideos.map((tv) => tv.track).filter((t) => t.visibility !== TrackVisibility.DRAFT);
    if (!isAdmin && (!video.isActive || activeTracks.length === 0)) {
      throw new NotFoundException('Video not found');
    }

    return {
      id: video.id,
      title: video.title,
      youtubeId: video.youtubeId,
      youtubeUrl: video.youtubeUrl,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      isActive: video.isActive,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      tracks: video.trackVideos.map((tv) => ({
        id: tv.track.id,
        name: tv.track.name,
        order: tv.order,
      })),
    };
  }

  async findAll(isAdmin: boolean) {
    const videos = await this.prisma.video.findMany({
      where: isAdmin ? undefined : { isActive: true },
      include: {
        trackVideos: {
          include: { track: { select: { id: true, name: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    });

    return videos.map((v) => ({
      id: v.id,
      title: v.title,
      youtubeId: v.youtubeId,
      duration: v.duration,
      isActive: v.isActive,
      tracks: v.trackVideos.map((tv) => ({ id: tv.track.id, name: tv.track.name, order: tv.order })),
    }));
  }

  async update(id: string, dto: UpdateVideoDto) {
    try {
      const data: Record<string, unknown> = { ...dto };

      if (dto.youtubeUrl !== undefined) {
        const youtubeId = extractYoutubeId(dto.youtubeUrl);
        if (!youtubeId) throw new BadRequestException('Invalid YouTube URL');
        data['youtubeId'] = youtubeId;
      }

      return await this.prisma.video.update({ where: { id }, data });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Video not found');
      }
      throw err;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.video.delete({ where: { id } });
      return { message: 'Video deleted successfully' };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Video not found');
      }
      throw err;
    }
  }
}
