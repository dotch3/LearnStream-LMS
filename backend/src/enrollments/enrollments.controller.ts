import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EnrollmentCodesService } from '../enrollment-codes/enrollment-codes.service';
import { RedeemCodeDto } from './dto/redeem-code.dto';
import { RequestEnrollmentDto } from './dto/request-enrollment.dto';
import { EnrollmentsService } from './enrollments.service';

@Controller('api/enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(
    private readonly svc: EnrollmentsService,
    private readonly codes: EnrollmentCodesService,
  ) {}

  @Post('request')
  request(@Request() req: { user: { id?: string; userId?: string } }, @Body() dto: RequestEnrollmentDto) {
    const userId = req.user.id ?? req.user.userId ?? '';
    console.log('User object:', req.user, 'Using userId:', userId);
    return this.svc.request(userId, dto.trackId);
  }

  @Post('redeem')
  redeem(@Request() req: { user: { id: string } }, @Body() dto: RedeemCodeDto) {
    return this.codes.redeem(req.user.id, dto.code);
  }

  @Get('my')
  findMy(@Request() req: { user: { id: string } }) {
    return this.svc.findMy(req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll(
    @Query('status') status?: string,
    @Query('trackId') trackId?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    return this.svc.findAllAdmin(status, trackId, Number(page), Number(perPage));
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  approve(@Param('id') id: string) {
    return this.svc.approve(id);
  }

  @Patch(':id/deny')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deny(@Param('id') id: string) {
    return this.svc.deny(id);
  }

  @Post('admin-enroll')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  adminEnroll(@Body() dto: { trackId: string; userId: string }) {
    return this.svc.adminEnroll(dto.trackId, dto.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
