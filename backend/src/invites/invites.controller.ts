import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InvitesService } from './invites.service';

class AcceptInviteDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(8) password!: string;
}

class CreateInviteDto {
  @IsString() email!: string;
  @IsEnum(Role) role!: Role;
}

@ApiTags('invites')
@Controller('api/invites')
export class InvitesController {
  constructor(private readonly svc: InvitesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all invites (ADMIN only)' })
  list() {
    return this.svc.list();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an invite (ADMIN only)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/regenerate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Regenerate invite link — resets token + 72h expiry (ADMIN only)' })
  regenerate(@Param('id') id: string) {
    return this.svc.regenerate(id);
  }

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Validate invite token' })
  validate(@Param('token') token: string) {
    return this.svc.validate(token);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept invite — create account' })
  accept(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.svc.accept(token, dto.name, dto.password);
  }
}
