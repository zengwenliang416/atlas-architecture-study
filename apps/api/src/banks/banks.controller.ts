import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionGuard } from '../auth/session.guard.js';
import { BANKS } from './catalog.js';

@Controller('api/banks')
@UseGuards(SessionGuard)
export class BanksController {
  @Get(':bankId')
  bank(@Param('bankId') bankId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const bank = BANKS[bankId];
    if (!bank) {
      reply.status(404);
      return reply.send({ detail: '题库不存在' });
    }
    reply.header('etag', bank.etag);
    reply.header('cache-control', 'private, max-age=0, must-revalidate');
    if (request.headers['if-none-match'] === bank.etag) {
      return reply.status(304).send();
    }
    return reply.send({ bankId: bank.id, etag: bank.etag, questions: bank.questions });
  }
}
