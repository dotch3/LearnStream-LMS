import { forwardRef, Module } from '@nestjs/common';
import { EnrollmentCodesModule } from '../enrollment-codes/enrollment-codes.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [forwardRef(() => EnrollmentCodesModule)],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
