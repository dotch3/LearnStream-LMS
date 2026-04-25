import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportProgressDto } from './dto/report-progress.dto';
import { WATCH_COMPLETE_THRESHOLD } from './progress.constants';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async report(userId: string, dto: ReportProgressDto) {
    const video = await this.prisma.video.findUnique({
      where: { id: dto.videoId },
    });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const newPercentage = Math.min(
      100,
      (dto.watchedSeconds / dto.totalSeconds) * 100,
    );

    const existing = await this.prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId, videoId: dto.videoId } },
    });

    const maxPercentage = Math.max(existing?.percentage ?? 0, newPercentage);
    const completed =
      (existing?.completed ?? false) ||
      maxPercentage >= WATCH_COMPLETE_THRESHOLD;

    return this.prisma.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId: dto.videoId } },
      create: {
        userId,
        videoId: dto.videoId,
        watchedSeconds: dto.watchedSeconds,
        totalSeconds: dto.totalSeconds,
        percentage: maxPercentage,
        completed,
        lastWatchedAt: new Date(),
      },
      update: {
        watchedSeconds: Math.max(
          existing?.watchedSeconds ?? 0,
          dto.watchedSeconds,
        ),
        totalSeconds: dto.totalSeconds,
        percentage: maxPercentage,
        completed,
        lastWatchedAt: new Date(),
      },
    });
  }

  async getTrackProgress(userId: string, trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const activeVideos = await this.prisma.video.findMany({
      where: { trackId, isActive: true },
      orderBy: { order: 'asc' },
    });

    if (activeVideos.length === 0) {
      return {
        trackId,
        totalActive: 0,
        completedCount: 0,
        overallPercentage: 0,
        trackComplete: false,
        videos: [],
      };
    }

    const progressRecords = await this.prisma.videoProgress.findMany({
      where: { userId, videoId: { in: activeVideos.map((v) => v.id) } },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.videoId, p]));
    const completedCount = progressRecords.filter((p) => p.completed).length;
    const totalActive = activeVideos.length;
    const overallPercentage = Math.round((completedCount / totalActive) * 100);

    const videos = activeVideos.map((v) => {
      const prog = progressMap.get(v.id);
      return {
        videoId: v.id,
        title: v.title,
        order: v.order,
        percentage: prog?.percentage ?? 0,
        completed: prog?.completed ?? false,
        lastWatchedAt: prog?.lastWatchedAt ?? null,
      };
    });

    return {
      trackId,
      totalActive,
      completedCount,
      overallPercentage,
      trackComplete: completedCount === totalActive,
      videos,
    };
  }
}
