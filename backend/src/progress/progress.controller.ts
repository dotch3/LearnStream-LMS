import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { ProgressService } from './progress.service';
import { ReportProgressDto } from './dto/report-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface AuthRequest extends Request {
  user: { userId: string; email: string; role: Role };
}

@ApiTags('progress')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Report video watch progress (never decrements)' })
  report(@Req() req: AuthRequest, @Body() dto: ReportProgressDto) {
    return this.progressService.report(req.user.userId, dto);
  }

  @Get('tracks/:trackId')
  @ApiOperation({ summary: "Get authenticated user's track progress" })
  getMyTrackProgress(
    @Req() req: AuthRequest,
    @Param('trackId') trackId: string,
  ) {
    return this.progressService.getTrackProgress(req.user.userId, trackId);
  }

  @Get('users/:userId/tracks/:trackId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get any user's track progress (Admin only)" })
  getUserTrackProgress(
    @Param('userId') userId: string,
    @Param('trackId') trackId: string,
  ) {
    return this.progressService.getTrackProgress(userId, trackId);
  }
}
