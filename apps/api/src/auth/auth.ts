import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import * as schema from '../db/auth-schema.js';
import type { Database } from '../db/database.js';
import type { Env } from '../env.js';

export function createAuth(db: Database, env: Env) {
  return betterAuth({
    appName: 'Atlas',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: '/api/auth',
    trustedOrigins: [env.WEB_ORIGIN],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
