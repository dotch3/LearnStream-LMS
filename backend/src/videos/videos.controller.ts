import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface AuthRequest extends Request {
  user: { sub: string; email: string; role: Role };
}

@ApiTags('videos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get video detail (role-filtered)' })
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.videosService.findOne(id, isAdmin);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new video (Admin only)' })
  create(@Body() dto: CreateVideoDto) {
    return this.videosService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a video (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    return this.videosService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a video (Admin only)' })
  remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }
}
