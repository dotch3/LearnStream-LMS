import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEnrollmentCodeDto } from './dto/create-enrollment-code.dto';
import { UpdateEnrollmentCodeDto } from './dto/update-enrollment-code.dto';
import { EnrollmentCodesService } from './enrollment-codes.service';

@Controller('api/enrollment-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EnrollmentCodesController {
  constructor(private readonly svc: EnrollmentCodesService) {}

  @Post()
  create(@Body() dto: CreateEnrollmentCodeDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('perPage') perPage = '50',
  ) {
    return this.svc.findAll(Number(page), Number(perPage));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEnrollmentCodeDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
