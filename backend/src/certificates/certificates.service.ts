import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import PDFDocument from 'pdfkit';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { CertificateResponseDto } from './dto/certificate-response.dto';
import { PublicVerifyResponseDto } from './dto/public-verify-response.dto';
import { AdminCertificatesQueryDto } from './dto/admin-certificates-query.dto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

interface PdfData {
  recipientName: string;
  trackName: string;
  completedVideoCount: number;
  issuedAt: Date;
  code: string;
}

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  private generateCode(): string {
    const year = new Date().getFullYear();
    const suffix = Array.from(
      { length: 5 },
      () => CHARS[randomInt(CHARS.length)],
    ).join('');
    return `CERT-${year}-${suffix}`;
  }

  private buildPdfBuffer(data: PdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;

      // Outer border
      doc
        .rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)
        .strokeColor('#2c3e50')
        .lineWidth(3)
        .stroke();

      // Inner border
      doc
        .rect(
          margin + 8,
          margin + 8,
          pageWidth - (margin + 8) * 2,
          pageHeight - (margin + 8) * 2,
        )
        .strokeColor('#2c3e50')
        .lineWidth(1)
        .stroke();

      let y = margin + 60;

      doc
        .fontSize(28)
        .fillColor('#2c3e50')
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF COMPLETION', margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      y += 60;

      doc
        .fontSize(14)
        .fillColor('#555555')
        .font('Helvetica')
        .text('This certifies that', margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      y += 50;

      doc
        .fontSize(26)
        .fillColor('#1a252f')
        .font('Helvetica-Bold')
        .text(data.recipientName, margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      y += 50;

      doc
        .fontSize(14)
        .fillColor('#555555')
        .font('Helvetica')
        .text('has successfully completed', margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      y += 40;

      doc
        .fontSize(20)
        .fillColor('#1a252f')
        .font('Helvetica-Bold')
        .text(data.trackName, margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      y += 50;

      doc
        .fontSize(13)
        .fillColor('#555555')
        .font('Helvetica')
        .text(
          `comprising ${data.completedVideoCount} training video${data.completedVideoCount !== 1 ? 's' : ''}`,
          margin + 20,
          y,
          {
            align: 'center',
            width: pageWidth - (margin + 20) * 2,
          },
        );

      y += 70;

      const issuedDate = new Intl.DateTimeFormat('pt-BR').format(data.issuedAt);

      doc
        .fontSize(12)
        .fillColor('#333333')
        .font('Helvetica')
        .text(`Issued: ${issuedDate}`, margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      y += 25;

      doc
        .fontSize(12)
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text(`Verification Code: ${data.code}`, margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      y += 25;

      doc
        .fontSize(10)
        .fillColor('#777777')
        .font('Helvetica')
        .text('Verify at: https://learnstream.app/verify', margin + 20, y, {
          align: 'center',
          width: pageWidth - (margin + 20) * 2,
        });

      doc.end();
    });
  }

  private async _generate(
    userId: string,
    trackId: string,
  ): Promise<{ buffer: Buffer; code: string }> {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });
    if (!track) throw new NotFoundException('Track not found');

    const progress = await this.progressService.getTrackProgress(
      userId,
      trackId,
    );
    if (progress.totalActive === 0 || !progress.trackComplete) {
      throw new ForbiddenException(
        'Not eligible: not all active videos are completed',
      );
    }

    // Idempotency: return existing certificate if already issued
    const existing = await this.prisma.certificate.findUnique({
      where: { userId_trackId: { userId, trackId } },
      include: { user: true, track: true },
    });

    if (existing) {
      const buffer = await this.buildPdfBuffer({
        recipientName: existing.user.name,
        trackName: existing.track.name,
        completedVideoCount: existing.completedVideoCount,
        issuedAt: existing.issuedAt,
        code: existing.code,
      });
      return { buffer, code: existing.code };
    }

    // Generate unique code with retry on collision
    let cert: {
      id: string;
      code: string;
      completedVideoCount: number;
      issuedAt: Date;
    } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateCode();
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });
        cert = await this.prisma.certificate.create({
          data: {
            code,
            completedVideoCount: progress.completedCount,
            userId,
            trackId,
          },
        });
        const buffer = await this.buildPdfBuffer({
          recipientName: user!.name,
          trackName: track.name,
          completedVideoCount: cert.completedVideoCount,
          issuedAt: cert.issuedAt,
          code: cert.code,
        });
        return { buffer, code: cert.code };
      } catch (err) {
        if (
          err instanceof PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempt < 4
        ) {
          continue;
        }
        throw err;
      }
    }

    throw new InternalServerErrorException(
      'Failed to generate unique certificate code',
    );
  }

  async generate(
    userId: string,
    trackId: string,
  ): Promise<{ buffer: Buffer; code: string }> {
    return this._generate(userId, trackId);
  }

  async generateForUser(
    userId: string,
    trackId: string,
  ): Promise<{ buffer: Buffer; code: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this._generate(userId, trackId);
  }

  async getMyCertificates(userId: string): Promise<CertificateResponseDto[]> {
    const certs = await this.prisma.certificate.findMany({
      where: { userId },
      include: { track: true },
      orderBy: { issuedAt: 'desc' },
    });
    return certs.map((c) => ({
      id: c.id,
      code: c.code,
      completedVideoCount: c.completedVideoCount,
      issuedAt: c.issuedAt,
      trackId: c.trackId,
      trackName: c.track.name,
    }));
  }

  async verifyByCode(code: string): Promise<PublicVerifyResponseDto> {
    const cert = await this.prisma.certificate.findUnique({
      where: { code },
      include: { user: true, track: true },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return {
      recipientName: cert.user.name,
      trackName: cert.track.name,
      issuedAt: cert.issuedAt,
    };
  }

  async getAllCertificates(query: AdminCertificatesQueryDto) {
    const { userId, trackId, page = 1, perPage = 20 } = query;
    const where = {
      ...(userId ? { userId } : {}),
      ...(trackId ? { trackId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where,
        include: { user: true, track: true },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.certificate.count({ where }),
    ]);

    return {
      data: data.map((c) => ({
        id: c.id,
        code: c.code,
        completedVideoCount: c.completedVideoCount,
        issuedAt: c.issuedAt,
        userId: c.userId,
        userName: c.user.name,
        trackId: c.trackId,
        trackName: c.track.name,
      })),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }
}
