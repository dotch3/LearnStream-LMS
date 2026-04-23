import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

    const track = await this.prisma.track.findUnique({
      where: { id: dto.trackId },
    });
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const { youtubeUrl, ...rest } = dto;
    return this.prisma.video.create({
      data: { ...rest, youtubeUrl, youtubeId },
    });
  }

  async findOne(id: string, isAdmin: boolean) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { track: true },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (!isAdmin && (!video.isActive || !video.track.isActive)) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async update(id: string, dto: UpdateVideoDto) {
    try {
      const data: Record<string, unknown> = { ...dto };

      if (dto.youtubeUrl !== undefined) {
        const youtubeId = extractYoutubeId(dto.youtubeUrl);
        if (!youtubeId) {
          throw new BadRequestException('Invalid YouTube URL');
        }
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
