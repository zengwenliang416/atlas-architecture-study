import { createHash } from 'node:crypto';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { BANK_ID, DATA } from '@atlas/bank-architecture';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionGuard } from '../auth/session.guard.js';

const body = JSON.stringify({ bankId: BANK_ID, questions: DATA });
const etag = `"${createHash('sha256').update(body).digest('hex')}"`;

@Controller('api/banks')
@UseGuards(SessionGuard)
export class BanksController {
  @Get('architecture')
  bank(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    reply.header('etag', etag);
    reply.header('cache-control', 'private, max-age=0, must-revalidate');
    if (request.headers['if-none-match'] === etag) {
      return reply.status(304).send();
    }
    return reply.send({ bankId: BANK_ID, etag, questions: DATA });
  }
}
