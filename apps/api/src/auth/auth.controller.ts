import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { setupCommandSchema } from '@atlas/domain';
import type { FastifyRequest } from 'fastify';
import { allow } from '../http/rate-limit.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';

@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('setup/status')
  async status() {
    return { registrationOpen: await this.authService.registrationOpen() };
  }

  @Post('setup')
  @HttpCode(201)
  async setup(@Req() request: FastifyRequest, @Body() body: unknown) {
    if (!allow(`setup:${request.ip || 'local'}`, 5, 60_000)) {
      throw new HttpException({ code: 'rate_limited', detail: '创建账号过于频繁，请稍后再试' }, 429);
    }
    const parsed = setupCommandSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_body', detail: '邮箱或密码不符合要求' });
    }
    const name = parsed.data.name || parsed.data.email.split('@')[0] || 'owner';
    try {
      const result = await this.authService.createFirstAccount({
        email: parsed.data.email,
        password: parsed.data.password,
        name,
      });
      if (!result.created) {
        throw new ForbiddenException({ code: 'registration_closed', detail: '首个账号已存在，公开注册已关闭' });
      }
      return { ok: true };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      const message = error instanceof Error ? error.message : '无法创建账号';
      throw new BadRequestException({ code: 'signup_failed', detail: message });
    }
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() request: FastifyRequest) {
    const session = await this.authService.readSession(request);
    if (!session) throw new ForbiddenException('请先登录');
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  }
}
