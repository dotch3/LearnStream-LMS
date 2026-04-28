import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';

interface AuthRequest extends Request {
  user: { userId: string; email: string; role: Role };
}

@ApiTags('comments')
@ApiBearerAuth('access-token')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('api/videos/:videoId/comments')
  @ApiOperation({ summary: 'List comments for a video (top-level + replies)' })
  getVideoComments(@Req() req: AuthRequest, @Param('videoId') videoId: string) {
    return this.commentsService.getVideoComments(videoId, req.user.userId, req.user.role);
  }

  @Post('api/videos/:videoId/comments')
  @ApiOperation({ summary: 'Post a comment or reply on a video' })
  createComment(
    @Req() req: AuthRequest,
    @Param('videoId') videoId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(req.user.userId, videoId, dto);
  }

  @Patch('api/comments/:id')
  @ApiOperation({ summary: 'Edit own comment' })
  updateComment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(req.user.userId, id, dto);
  }

  @Delete('api/comments/:id')
  @ApiOperation({ summary: 'Soft-delete own comment (Admin can delete any)' })
  deleteComment(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.commentsService.deleteComment(req.user.userId, req.user.role, id);
  }

  @Post('api/comments/:id/reactions')
  @ApiOperation({ summary: 'Toggle emoji reaction on a comment' })
  toggleReaction(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.commentsService.toggleReaction(req.user.userId, id, dto.emoji);
  }
}
