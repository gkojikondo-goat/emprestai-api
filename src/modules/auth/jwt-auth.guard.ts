import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JWTPayload, JWTVerifyGetKey, jwtVerify } from 'jose';
import { contextoAtual, Papel } from '../../common/request-context';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { MembershipRepository } from './membership.repository';
import { ROTA_PUBLICA } from './public.decorator';

/** Fonte das chaves públicas. Produção: JWKS remota do Supabase. Testes: JWKS local. */
export const JWKS = Symbol('JWKS');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClaimsSupabase = JWTPayload & {
  email?: string;
  app_metadata?: { tenant_id?: unknown };
};

/**
 * Spec 002: valida o token pela JWKS (401), resolve o tenant só pela claim
 * app_metadata.tenant_id e confere o vínculo em memberships (403). Grava a
 * identidade no AsyncLocalStorage. Cabeçalho, query e corpo nunca são lidos.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipRepository,
    @Inject(JWKS) private readonly jwks: JWTVerifyGetKey,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(ROTA_PUBLICA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publica) return true;

    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const [esquema, token] = (req.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token ausente ou inválido.');
    }

    let claims: ClaimsSupabase;
    try {
      ({ payload: claims } = await jwtVerify<ClaimsSupabase>(token, this.jwks, {
        issuer: this.env.SUPABASE_JWT_ISSUER,
        audience: 'authenticated',
      }));
    } catch {
      throw new UnauthorizedException('Token ausente ou inválido.');
    }
    if (!claims.sub || !UUID.test(claims.sub)) {
      throw new UnauthorizedException('Token ausente ou inválido.');
    }

    const semVinculo = new ForbiddenException('Sua conta não está vinculada a uma área.');
    const tenantId = claims.app_metadata?.tenant_id;
    if (typeof tenantId !== 'string' || !UUID.test(tenantId)) throw semVinculo;

    const vinculo = await this.memberships.buscar(claims.sub, tenantId);
    if (!vinculo) throw semVinculo;

    const ctx = contextoAtual();
    if (!ctx) throw new Error('RequestContextMiddleware não foi aplicado.');
    ctx.tenantId = vinculo.tenant.id;
    ctx.userId = claims.sub;
    ctx.email = claims.email ?? '';
    ctx.papel = vinculo.papel as Papel;
    return true;
  }
}
