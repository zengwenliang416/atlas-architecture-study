import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BanksController } from './banks.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [BanksController],
})
export class BanksModule {}
