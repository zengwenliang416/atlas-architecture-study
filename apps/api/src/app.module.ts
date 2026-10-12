import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { BanksModule } from './banks/banks.module.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health.controller.js';
import { StudyModule } from './study/study.module.js';

@Module({
  imports: [DbModule, AuthModule, BanksModule, StudyModule],
  controllers: [HealthController],
})
export class AppModule {}
