import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPool } from './database.js';

export async function migrateDatabase(databaseUrl: string): Promise<void> {
  const pool = createPool(databaseUrl);
  try {
    const db = drizzle({ client: pool });
    const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
