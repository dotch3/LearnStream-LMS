import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ALLOWED_EMOJIS } from './dto/toggle-reaction.dto';

const COMMENT_INCLUDE = {
  author: { select: { id: true, name: true } },
  reactions: { select: { emoji: true, userId: true } },
  replies: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, name: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  },
} as const;

type ReactionRow = { emoji: string; userId: string };

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface AuthorDto {
  id: string;
  name: string;
}

export interface CommentDto {
  id: string;
  body: string;
  isDeleted: boolean;
  createdAt: string;
  author: AuthorDto | null;
  reactions: ReactionSummary[];
  replies: CommentDto[];
  canEdit: boolean;
  canDelete: boolean;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private groupReactions(reactions: ReactionRow[], currentUserId: string): ReactionSummary[] {
    const map = new Map<string, { count: number; mine: boolean }>(
      ALLOWED_EMOJIS.map((e) => [e, { count: 0, mine: false }]),
    );
    for (const r of reactions) {
      const entry = map.get(r.emoji);
      if (!entry) continue;
      entry.count++;
      if (r.userId === currentUserId) entry.mine = true;
    }
    return ALLOWED_EMOJIS.map((emoji) => ({
      emoji,
      count: map.get(emoji)!.count,
      reactedByMe: map.get(emoji)!.mine,
    }));
  }

  private shape(
    comment: {
      id: string;
      body: string;
      isDeleted: boolean;
      createdAt: Date;
      authorId: string;
      author: AuthorDto;
      reactions: ReactionRow[];
      replies?: Array<{
        id: string;
        body: string;
        isDeleted: boolean;
        createdAt: Date;
        authorId: string;
        author: AuthorDto;
        reactions: ReactionRow[];
      }>;
    },
    userId: string,
    userRole: Role,
    includeReplies = true,
  ): CommentDto {
    return {
      id: comment.id,
      body: comment.isDeleted ? '[deleted]' : comment.body,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt.toISOString(),
      author: comment.isDeleted ? null : comment.author,
      reactions: this.groupReactions(comment.reactions, userId),
      replies: includeReplies
        ? (comment.replies ?? []).map((r) => this.shape(r, userId, userRole, false))
        : [],
      canEdit: !comment.isDeleted && comment.authorId === userId,
      canDelete:
        !comment.isDeleted &&
        (comment.authorId === userId || userRole === Role.ADMIN),
    };
  }

  async getVideoComments(videoId: string, userId: string, userRole: Role): Promise<CommentDto[]> {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const comments = await this.prisma.comment.findMany({
      where: { videoId, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: COMMENT_INCLUDE,
    });

    return comments.map((c) => this.shape(c, userId, userRole));
  }

  async createComment(
    userId: string,
    videoId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        trackVideos: { include: { track: { select: { id: true } } }, take: 1 },
      },
    });
    if (!video) throw new NotFoundException('Video not found');

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.videoId !== videoId || parent.parentId !== null) {
        throw new NotFoundException('Parent comment not found or is not top-level');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        body: dto.body,
        videoId,
        authorId: userId,
        parentId: dto.parentId ?? null,
      },
      include: COMMENT_INCLUDE,
    });

    // Send reply notifications (fire-and-forget)
    if (dto.parentId) {
      void this.notifyReply(userId, dto.parentId, dto.body, video.title, videoId, video.trackVideos[0]?.track?.id);
    }

    return this.shape({ ...comment, replies: [] }, userId, Role.VIEWER);
  }

  private async notifyReply(
    replierId: string,
    parentId: string,
    replyBody: string,
    videoTitle: string,
    videoId: string,
    trackId: string | undefined,
  ): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const videoUrl = trackId
      ? `${frontendUrl}/dashboard/tracks/${trackId}/videos/${videoId}`
      : `${frontendUrl}/dashboard`;

    const [parent, existingReplies, replier] = await Promise.all([
      this.prisma.comment.findUnique({
        where: { id: parentId },
        include: { author: { select: { id: true, name: true, email: true, preferredLocale: true } } },
      }),
      this.prisma.comment.findMany({
        where: { parentId, isDeleted: false, authorId: { not: replierId } },
        include: { author: { select: { id: true, name: true, email: true, preferredLocale: true } } },
        distinct: ['authorId'],
      }),
      this.prisma.user.findUnique({ where: { id: replierId }, select: { name: true } }),
    ]);

    if (!parent || !replier) return;

    // Collect unique recipients: parent author + existing reply authors, excluding the replier
    const seen = new Set<string>([replierId]);
    const recipients: { email: string; name: string; locale?: string }[] = [];

    const addRecipient = (u: { id: string; name: string; email: string; preferredLocale?: string }) => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        recipients.push({ email: u.email, name: u.name, locale: u.preferredLocale });
      }
    };

    if (parent.author) addRecipient(parent.author);
    for (const reply of existingReplies) {
      if (reply.author) addRecipient(reply.author);
    }

    if (recipients.length > 0) {
      await this.mail.sendReplyNotification(recipients, replier.name, videoTitle, replyBody, videoUrl);
    }
  }

  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: COMMENT_INCLUDE,
    });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Cannot edit another user\'s comment');

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: COMMENT_INCLUDE,
    });

    return this.shape(updated, userId, Role.VIEWER);
  }

  async deleteComment(
    userId: string,
    userRole: Role,
    commentId: string,
  ): Promise<{ id: string }> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Cannot delete another user\'s comment');
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true, body: '' },
    });

    return { id: commentId };
  }

  async toggleReaction(
    userId: string,
    commentId: string,
    emoji: string,
  ): Promise<ReactionSummary[]> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { reactions: { select: { emoji: true, userId: true } } },
    });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
    });

    if (existing) {
      await this.prisma.commentReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.commentReaction.create({
        data: { commentId, userId, emoji },
      });
    }

    const updatedReactions = await this.prisma.commentReaction.findMany({
      where: { commentId },
      select: { emoji: true, userId: true },
    });

    return this.groupReactions(updatedReactions, userId);
  }
}
