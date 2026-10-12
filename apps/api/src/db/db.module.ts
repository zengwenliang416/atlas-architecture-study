import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { createDatabase, createPool, type Database } from './database.js';
import { loadEnv } from '../env.js';
import type { Pool } from 'pg';

export const DATABASE = Symbol('DATABASE');
export const POOL = Symbol('POOL');

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      useFactory: () => createPool(loadEnv().DATABASE_URL),
    },
    {
      provide: DATABASE,
      inject: [POOL],
      useFactory: (pool: Pool) => createDatabase(pool),
    },
  ],
  exports: [DATABASE, POOL],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

export type { Database };
