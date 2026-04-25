import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async isSetupComplete(): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { role: Role.ADMIN } });
    return count > 0;
  }

  async createAdmin(dto: CreateAdminDto): Promise<void> {
    if (await this.isSetupComplete()) {
      throw new NotFoundException();
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: Role.ADMIN,
      },
    });
  }
}
