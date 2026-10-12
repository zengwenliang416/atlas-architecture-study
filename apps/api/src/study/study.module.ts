import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StudyController } from './study.controller.js';
import { StudyService } from './study.service.js';

@Module({
  imports: [AuthModule],
  controllers: [StudyController],
  providers: [StudyService],
})
export class StudyModule {}
