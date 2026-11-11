import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { Logger } from 'pino';

export type Papel = 'colaborador' | 'operacoes';

/** Contexto de um request (ADR-001). O guard preenche quem é a pessoa. */
export type ContextoRequest = {
  requestId: string;
  tenantId?: string;
  userId?: string;
  email?: string;
  papel?: Papel;
};

/** Logger pino da aplicação (ADR-001: JSON com request_id e tenant_id). */
export const LOGGER = Symbol('LOGGER');

const armazenamento = new AsyncLocalStorage<ContextoRequest>();

type Req = { method: string; originalUrl: string };
type Res = { statusCode: number; on(evento: 'finish', fn: () => void): void };

/**
 * Abre o contexto para todo o request (o guard completa a identidade depois)
 * e registra uma linha de log quando a resposta termina.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  use(req: Req, res: Res, next: () => void) {
    const ctx: ContextoRequest = { requestId: randomUUID() };
    const inicio = Date.now();
    res.on('finish', () => {
      this.logger.info({
        request_id: ctx.requestId,
        tenant_id: ctx.tenantId ?? null,
        user_id: ctx.userId ?? null,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - inicio,
      });
    });
    armazenamento.run(ctx, next);
  }
}

export function contextoAtual(): ContextoRequest | undefined {
  return armazenamento.getStore();
}

/** Para services e repositories: só existe dentro de um request autenticado. */
export function quemChama(): Required<ContextoRequest> {
  const ctx = armazenamento.getStore();
  if (!ctx?.tenantId || !ctx.userId || !ctx.papel || ctx.email === undefined) {
    throw new Error('Contexto de request sem identidade: rota sem guard?');
  }
  return ctx as Required<ContextoRequest>;
}

/** Só para testes: roda uma função dentro de um contexto montado à mão. */
export function rodarComContexto<T>(ctx: ContextoRequest, fn: () => T): T {
  return armazenamento.run(ctx, fn);
}
