import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async create(email: string, role: Role): Promise<{ inviteUrl: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    const pending = await this.prisma.inviteToken.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending) throw new BadRequestException('An active invite already exists for this email');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 h

    await this.prisma.inviteToken.create({ data: { tokenHash, email, role, expiresAt } });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const inviteUrl = `${frontendUrl}/invite/${rawToken}`;
    void this.mail.sendInvite(email, inviteUrl, role);
    return { inviteUrl };
  }

  async regenerate(id: string): Promise<{ inviteUrl: string }> {
    const record = await this.prisma.inviteToken.findUnique({ where: { id } });
    if (!record) throw new BadRequestException('Invite not found');
    if (record.usedAt) throw new BadRequestException('Invite already accepted');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await this.prisma.inviteToken.update({
      where: { id },
      data: { tokenHash, expiresAt },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const inviteUrl = `${frontendUrl}/invite/${rawToken}`;
    void this.mail.sendInvite(record.email, inviteUrl, record.role);
    return { inviteUrl };
  }

  async validate(rawToken: string): Promise<{ email: string; role: Role }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.inviteToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invite link is invalid or has expired');
    }
    return { email: record.email, role: record.role };
  }

  async list() {
    const records = await this.prisma.inviteToken.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return records.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      usedAt: r.usedAt,
      status: r.usedAt ? 'accepted' : r.expiresAt < now ? 'expired' : 'pending',
    }));
  }

  async remove(id: string): Promise<void> {
    await this.prisma.inviteToken.delete({ where: { id } });
  }

  async accept(rawToken: string, name: string, password: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.inviteToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invite link is invalid or has expired');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: record.email } });
    if (existingUser) throw new BadRequestException('Account already exists for this email');

    const hashed = await bcrypt.hash(password, 10);

    await this.prisma.$transaction([
      this.prisma.user.create({
        data: { name, email: record.email, password: hashed, role: record.role },
      }),
      this.prisma.inviteToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);
  }
}
