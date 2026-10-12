import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from './db/db.module.js';

@Controller('api')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get('health')
  async health() {
    await this.db.execute(sql`select 1`);
    return { ok: true };
  }
}
