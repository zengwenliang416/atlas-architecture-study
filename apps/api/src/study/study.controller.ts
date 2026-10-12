import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  importCommandSchema,
  levelCommandSchema,
  notesCommandSchema,
  questionIdSchema,
} from '@atlas/domain';
import { BANK_ID } from '@atlas/bank-architecture';
import type { FastifyRequest } from 'fastify';
import { SessionGuard } from '../auth/session.guard.js';
import { StudyService } from './study.service.js';

@Controller('api/study')
@UseGuards(SessionGuard)
export class StudyController {
  constructor(private readonly study: StudyService) {}

  private userId(request: FastifyRequest): string {
    if (!request.userId) throw new BadRequestException('缺少登录用户');
    return request.userId;
  }

  private bankId(value?: string): string {
    return value && value.length > 0 ? value : BANK_ID;
  }

  @Get('records')
  records(@Req() request: FastifyRequest, @Query('bankId') bankId?: string) {
    return this.study.list(this.userId(request), this.bankId(bankId));
  }

  @Get('due')
  due(@Req() request: FastifyRequest, @Query('bankId') bankId?: string) {
    return this.study.due(this.userId(request), this.bankId(bankId));
  }

  @Patch('records/:questionId/notes')
  notes(
    @Req() request: FastifyRequest,
    @Param('questionId') questionId: string,
    @Body() body: unknown,
    @Query('bankId') bankId?: string,
  ) {
    const id = this.parseQuestionId(questionId);
    const parsed = notesCommandSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ code: 'invalid_body', detail: '笔记格式无效' });
    return this.study.saveNotes(this.userId(request), this.bankId(bankId), id, parsed.data.version, parsed.data.notes);
  }

  @Post('records/:questionId/level')
  @HttpCode(200)
  level(
    @Req() request: FastifyRequest,
    @Param('questionId') questionId: string,
    @Body() body: unknown,
    @Query('bankId') bankId?: string,
  ) {
    const id = this.parseQuestionId(questionId);
    const parsed = levelCommandSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ code: 'invalid_body', detail: '掌握程度格式无效' });
    return this.study.saveLevel(this.userId(request), this.bankId(bankId), id, parsed.data.version, parsed.data.level);
  }

  @Post('records/:questionId/complete')
  @HttpCode(200)
  complete(
    @Req() request: FastifyRequest,
    @Param('questionId') questionId: string,
    @Query('bankId') bankId?: string,
  ) {
    return this.study.complete(this.userId(request), this.bankId(bankId), this.parseQuestionId(questionId));
  }

  @Post('import')
  @HttpCode(200)
  importSnapshot(@Req() request: FastifyRequest, @Body() body: unknown, @Query('bankId') bankId?: string) {
    const parsed = importCommandSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ code: 'invalid_body', detail: '导入内容必须是题目记录对象' });
    return this.study.importSnapshot(this.userId(request), this.bankId(bankId), parsed.data.records);
  }

  private parseQuestionId(questionId: string): string {
    const parsed = questionIdSchema.safeParse(questionId);
    if (!parsed.success) throw new BadRequestException({ code: 'invalid_question', detail: '题目编号无效' });
    return parsed.data;
  }
}
