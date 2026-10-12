import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const session = await this.authService.readSession(request);
    if (!session) throw new UnauthorizedException('请先登录');
    request.userId = session.user.id;
    return true;
  }
}
