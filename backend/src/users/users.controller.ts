import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: Role };
}

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Self-service endpoints (/me/*) — MUST be before /:id ────────────────

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update own display name' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change own password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(req.user.userId, dto);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user (ADMIN only)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users paginated (ADMIN only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  findAll(@Query('page') page = 1, @Query('perPage') perPage = 20) {
    return this.usersService.findAll(Number(page), Number(perPage));
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (ADMIN only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user (ADMIN only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/password')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Reset a user's password (ADMIN only)" })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  adminResetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.adminResetPassword(id, dto.password);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a user (ADMIN only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden or self-deactivation attempt',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.usersService.deactivate(req.user.userId, id);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reactivate a user (ADMIN only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User reactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  reactivate(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.reactivate(id);
  }
}
