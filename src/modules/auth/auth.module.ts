import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { JWKS, JwtAuthGuard } from './jwt-auth.guard';
import { MembershipRepository } from './membership.repository';

/** Guard global: toda rota exige token, exceto as marcadas com @Public(). */
@Global()
@Module({
  providers: [
    MembershipRepository,
    {
      provide: JWKS,
      inject: [ENV],
      // Cacheia as chaves; não consulta o Supabase a cada request (spec 002 regra 2).
      useFactory: (env: Env) => createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL)),
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [MembershipRepository],
})
export class AuthModule {}
