import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

type ProblemBody = {
  type: 'about:blank';
  title: string;
  status: number;
  detail: string;
  code?: string;
};

const titles: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  503: 'Service Unavailable',
};

function detailOf(exception: HttpException): { detail: string; code?: string } {
  const response = exception.getResponse();
  if (typeof response === 'string') return { detail: response };
  if (response && typeof response === 'object') {
    const body = response as { message?: string | string[]; detail?: string; code?: string };
    if (typeof body.detail === 'string') return { detail: body.detail, code: body.code };
    if (Array.isArray(body.message)) return { detail: body.message.join('; '), code: body.code };
    if (typeof body.message === 'string') return { detail: body.message, code: body.code };
  }
  return { detail: exception.message };
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    if (reply.sent) return;
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const known = exception instanceof HttpException ? detailOf(exception) : null;
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    const body: ProblemBody = {
      type: 'about:blank',
      title: titles[status] ?? 'Error',
      status,
      detail: known?.detail ?? '服务器暂时无法完成这个请求',
      ...(known?.code ? { code: known.code } : {}),
    };
    reply.status(status).type('application/problem+json').send(body);
  }
}
