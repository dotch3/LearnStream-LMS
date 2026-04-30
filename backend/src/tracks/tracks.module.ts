import { Module } from '@nestjs/common';
import { EnrollmentGuard } from '../auth/guards/enrollment.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { TracksController } from './tracks.controller';
import { TracksService } from './tracks.service';

@Module({
  imports: [PrismaModule],
  controllers: [TracksController],
  providers: [TracksService, EnrollmentGuard],
  exports: [TracksService],
})
export class TracksModule {}
