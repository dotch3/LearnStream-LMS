import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  preferredLocale: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto & { emailSent: boolean }> {
    const password = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password,
          name: dto.name,
          role: dto.role ?? Role.VIEWER,
        },
        select: SAFE_SELECT,
      });
      const emailSent = await this.mail.sendWelcome(user.email, user.name, dto.password);
      return { ...user, emailSent };
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async findAll(
    page: number,
    perPage: number,
  ): Promise<{
    data: UserResponseDto[];
    meta: { total: number; page: number; perPage: number; totalPages: number };
  }> {
    const safePerPage = Math.min(perPage, 100);
    const skip = (page - 1) * safePerPage;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: safePerPage,
        orderBy: { createdAt: 'desc' },
        select: SAFE_SELECT,
      }),
      this.prisma.user.count(),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        perPage: safePerPage,
        totalPages: Math.ceil(total / safePerPage),
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: dto,
        select: SAFE_SELECT,
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002')
          throw new ConflictException('Email already in use');
        if (err.code === 'P2025') throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  async deactivate(
    adminId: string,
    targetId: string,
  ): Promise<{ message: string }> {
    if (adminId === targetId) {
      throw new ForbiddenException('Admins cannot deactivate themselves');
    }
    try {
      await this.prisma.user.update({
        where: { id: targetId },
        data: { isActive: false },
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
    return { message: 'User deactivated successfully' };
  }

  async reactivate(id: string): Promise<{ message: string }> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { isActive: true },
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
    return { message: 'User reactivated successfully' };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const data: { name: string; preferredLocale?: string } = { name: dto.name };
    if (dto.locale) data.preferredLocale = dto.locale;
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: SAFE_SELECT,
    });
  }

  async adminResetPassword(id: string, password: string): Promise<{ message: string }> {
    const hashed = await bcrypt.hash(password, 10);
    try {
      await this.prisma.user.update({ where: { id }, data: { password: hashed } });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match)
      throw new UnauthorizedException('Current password is incorrect');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    return { message: 'Password changed successfully' };
  }
}
