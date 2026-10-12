import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export function createPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    options: '-c statement_timeout=5000 -c lock_timeout=2000',
  });
}

export function createDatabase(pool: Pool) {
  return drizzle({ client: pool, schema });
}

export type Database = ReturnType<typeof createDatabase>;
