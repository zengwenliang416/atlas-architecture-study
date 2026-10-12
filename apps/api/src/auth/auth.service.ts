import { Inject, Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { count } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { user } from '../db/auth-schema.js';
import { DATABASE, POOL, type Database } from '../db/db.module.js';
import { loadEnv } from '../env.js';
import { createAuth, type Auth } from './auth.js';

const REGISTRATION_LOCK = 814201;

@Injectable()
export class AuthService {
  readonly auth: Auth;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(POOL) private readonly pool: Pool,
  ) {
    this.auth = createAuth(this.db, loadEnv());
  }

  readSession(request: FastifyRequest) {
    return this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
  }

  async registrationOpen(): Promise<boolean> {
    const [row] = await this.db.select({ n: count() }).from(user);
    return Number(row?.n ?? 0) === 0;
  }

  /**
   * Holds a session advisory lock so two bootstrap requests cannot both observe an empty user table.
   * The public sign-up route is rejected before it reaches Better Auth.
   */
  async createFirstAccount(input: { email: string; password: string; name: string }) {
    const client = await this.pool.connect();
    try {
      await client.query('select pg_advisory_lock($1)', [REGISTRATION_LOCK]);
      const existing = await client.query<{ n: number }>('select count(*)::int as n from "user"');
      if (Number(existing.rows[0]?.n ?? 0) > 0) {
        return { created: false as const };
      }
      await this.auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
        },
      });
      return { created: true as const };
    } finally {
      await client.query('select pg_advisory_unlock($1)', [REGISTRATION_LOCK]).catch(() => undefined);
      client.release();
    }
  }
}
