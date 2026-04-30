import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SetupService } from './setup.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Check if first-run setup is complete' })
  @ApiResponse({ status: 200, description: '{ isSetupComplete: boolean }' })
  async getStatus() {
    return { isSetupComplete: await this.setupService.isSetupComplete() };
  }

  @Post('admin')
  @Public()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create the first admin account (locked after first use)',
  })
  @ApiResponse({ status: 201, description: 'Admin account created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Setup already complete' })
  async createAdmin(@Body() dto: CreateAdminDto): Promise<void> {
    await this.setupService.createAdmin(dto);
  }
}
