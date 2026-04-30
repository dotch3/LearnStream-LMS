import { forwardRef, Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { EnrollmentCodesController } from './enrollment-codes.controller';
import { EnrollmentCodesService } from './enrollment-codes.service';

@Module({
  imports: [forwardRef(() => EnrollmentsModule)],
  providers: [EnrollmentCodesService],
  controllers: [EnrollmentCodesController],
  exports: [EnrollmentCodesService],
})
export class EnrollmentCodesModule {}
