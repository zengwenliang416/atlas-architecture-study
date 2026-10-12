import 'reflect-metadata';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import { mountAuth } from './auth/mount-auth.js';
import { migrateDatabase } from './db/migrate.js';
import { loadEnv } from './env.js';
import { ProblemFilter } from './http/problem.filter.js';

async function bootstrap() {
  const env = loadEnv();
  await migrateDatabase(env.DATABASE_URL);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 1_048_576,
      trustProxy: true,
      forceCloseConnections: true,
      logger: { level: env.LOG_LEVEL },
      genReqId: (request: IncomingMessage | Http2ServerRequest) => {
        const header = request.headers['x-request-id'];
        const value = Array.isArray(header) ? header[0] : header;
        return typeof value === 'string' && value.length > 0 && value.length <= 80
          ? value
          : crypto.randomUUID();
      },
    }),
    { logger: ['error', 'warn', 'log'] },
  );
  app.useGlobalFilters(new ProblemFilter());
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  mountAuth(fastify, app.get(AuthService).auth);
  app.enableShutdownHooks();
  await app.listen(env.PORT, '0.0.0.0');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
