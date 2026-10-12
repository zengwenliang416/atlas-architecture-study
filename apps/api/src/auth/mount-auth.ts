import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { Auth } from './auth.js';
import { allow } from '../http/rate-limit.js';

function problem(status: number, title: string, detail: string, code?: string) {
  return {
    type: 'about:blank' as const,
    title,
    status,
    detail,
    ...(code ? { code } : {}),
  };
}

export function mountAuth(fastify: FastifyInstance, auth: Auth): void {
  fastify.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const ip = request.ip || 'local';
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      const sensitive = url.pathname.includes('sign-in') || url.pathname.includes('sign-up');
      if (!allow(`auth:${ip}:${sensitive ? 'strict' : 'open'}`, sensitive ? 10 : 60, 60_000)) {
        return reply
          .status(429)
          .type('application/problem+json')
          .send(problem(429, 'Too Many Requests', '请求过于频繁，请稍后再试', 'rate_limited'));
      }
      if (url.pathname.includes('/sign-up')) {
        return reply
          .status(403)
          .type('application/problem+json')
          .send(problem(403, 'Forbidden', '公开注册已关闭。首个账号请使用 POST /api/setup。', 'registration_closed'));
      }
      try {
        const fetchRequest = new Request(url.toString(), {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          body: request.body ? JSON.stringify(request.body) : undefined,
        });
        const response = await auth.handler(fetchRequest);
        reply.status(response.status);
        const cookies = response.headers.getSetCookie?.() ?? [];
        response.headers.forEach((value, key) => {
          if (key === 'set-cookie' || key === 'content-length' || key === 'transfer-encoding') return;
          reply.header(key, value);
        });
        if (cookies.length > 0) reply.header('set-cookie', cookies);
        const text = response.body ? await response.text() : '';
        return text ? reply.send(text) : reply.send();
      } catch (error) {
        request.log.error(error);
        return reply
          .status(500)
          .type('application/problem+json')
          .send(problem(500, 'Internal Server Error', '认证服务暂时不可用'));
      }
    },
  });
}
