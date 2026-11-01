import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import * as schema from '../db/auth-schema.js';
import type { Database } from '../db/database.js';
import type { Env } from '../env.js';

function trustedWebOrigins(webOrigin: string): string[] {
  const url = new URL(webOrigin);
  const origins = new Set([url.origin]);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    origins.add(url.origin);
  }
  return [...origins];
}

export function createAuth(db: Database, env: Env) {
  return betterAuth({
    appName: 'Atlas',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: '/api/auth',
    trustedOrigins: trustedWebOrigins(env.WEB_ORIGIN),
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
