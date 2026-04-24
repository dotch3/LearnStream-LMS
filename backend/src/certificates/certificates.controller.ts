import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { CertificatesService } from './certificates.service';
import { AdminCertificatesQueryDto } from './dto/admin-certificates-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

interface AuthRequest extends Request {
  user: { sub: string; email: string; role: Role };
}

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // Route order is critical: static segments (my, admin) before parameterized (:code)

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List authenticated viewer own certificates' })
  @ApiResponse({ status: 200, description: 'Array of certificates' })
  getMyCertificates(@Req() req: AuthRequest) {
    const userId = req.user.sub;
    return this.certificatesService.getMyCertificates(userId);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: list all certificates with optional filters and pagination' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'trackId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated certificate list' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  adminListCertificates(@Query() query: AdminCertificatesQueryDto) {
    return this.certificatesService.getAllCertificates(query);
  }

  @Post('tracks/:trackId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Viewer generates own certificate for a completed track (idempotent)' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF certificate file' })
  @ApiResponse({ status: 403, description: 'Not eligible: not all active videos are completed' })
  @ApiResponse({ status: 404, description: 'Track not found' })
  async generateCertificate(
    @Req() req: AuthRequest,
    @Param('trackId') trackId: string,
    @Res() res: Response,
  ) {
    const userId = req.user.sub;
    const { buffer, code } = await this.certificatesService.generate(userId, trackId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${code}.pdf"`);
    res.send(buffer);
  }

  @Post('admin/users/:userId/tracks/:trackId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin generates certificate for an eligible user (idempotent)' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF certificate file' })
  @ApiResponse({ status: 403, description: 'Not admin or user not eligible' })
  @ApiResponse({ status: 404, description: 'User or track not found' })
  async adminGenerateCertificate(
    @Param('userId') userId: string,
    @Param('trackId') trackId: string,
    @Res() res: Response,
  ) {
    const { buffer, code } = await this.certificatesService.generateForUser(userId, trackId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${code}.pdf"`);
    res.send(buffer);
  }

  // MUST be last — parameterized route would shadow static routes declared above
  @Get(':code')
  @Public()
  @ApiOperation({ summary: 'Public: verify a certificate by code (no authentication required)' })
  @ApiResponse({ status: 200, description: 'Certificate verification info' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  verifyByCode(@Param('code') code: string) {
    return this.certificatesService.verifyByCode(code);
  }
}
