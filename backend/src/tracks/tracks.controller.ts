import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { TracksService } from './tracks.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { AddVideoToTrackDto, UpdateVideoOrderDto } from './dto/track-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface AuthRequest extends Request {
  user: { sub: string; email: string; role: Role };
}

@ApiTags('tracks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  @ApiOperation({ summary: 'List all tracks (role-filtered)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  findAll(
    @Req() req: AuthRequest,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.tracksService.findAll(isAdmin, Number(page), Number(perPage));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get track detail with ordered video list' })
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.tracksService.findOne(id, isAdmin);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new track (Admin only)' })
  create(@Body() dto: CreateTrackDto) {
    return this.tracksService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a track (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateTrackDto) {
    return this.tracksService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a track (Admin only)' })
  remove(@Param('id') id: string) {
    return this.tracksService.remove(id);
  }

  // ── Junction management ──────────────────────────────────────

  @Post(':id/videos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add existing video to track (Admin only)' })
  addVideo(@Param('id') trackId: string, @Body() dto: AddVideoToTrackDto) {
    return this.tracksService.addVideoToTrack(trackId, dto.videoId, dto.order ?? 0);
  }

  @Delete(':id/videos/:videoId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove video from track without deleting video (Admin only)' })
  removeVideo(@Param('id') trackId: string, @Param('videoId') videoId: string) {
    return this.tracksService.removeVideoFromTrack(trackId, videoId);
  }

  @Patch(':id/videos/:videoId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update video order within track (Admin only)' })
  updateVideoOrder(
    @Param('id') trackId: string,
    @Param('videoId') videoId: string,
    @Body() dto: UpdateVideoOrderDto,
  ) {
    return this.tracksService.updateVideoOrder(trackId, videoId, dto.order);
  }
}
