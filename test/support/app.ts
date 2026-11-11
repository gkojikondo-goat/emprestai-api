import { Writable } from 'node:stream';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pino from 'pino';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { LOGGER } from '../../src/common/request-context';
import { ENV } from '../../src/config/config.module';
import { parseEnv } from '../../src/config/env';
import { JWKS } from '../../src/modules/auth/jwt-auth.guard';
import { subirBanco } from './banco';
import { criarEmissor, EMISSOR } from './tokens';

/**
 * App Nest completa contra um Postgres descartável, com JWKS local e o log
 * capturado em memória (linhas JSON do pino).
 */
export async function subirApp() {
  const { container, url } = await subirBanco();
  const emissor = await criarEmissor();
  const logs: Record<string, unknown>[] = [];
  const destino = new Writable({
    write(chunk, _enc, cb) {
      for (const linha of String(chunk).split('\n').filter(Boolean)) logs.push(JSON.parse(linha));
      cb();
    },
  });
  const env = parseEnv({
    DATABASE_URL: url,
    CORS_ORIGIN: 'http://localhost:5173',
    SUPABASE_JWKS_URL: `${EMISSOR}/.well-known/jwks.json`,
    SUPABASE_JWT_ISSUER: EMISSOR,
  });
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(JWKS)
    .useValue(emissor.jwks)
    .overrideProvider(LOGGER)
    .useValue(pino(destino))
    .compile();
  const app: INestApplication = modulo.createNestApplication({ logger: false });
  configureApp(app, env.CORS_ORIGIN);
  // Escuta uma vez numa porta livre: o supertest reaproveita o servidor em vez
  // de abrir um por request (importa nos testes de concorrência).
  await app.listen(0, '127.0.0.1');

  async function encerrar() {
    await app.close();
    await container.stop();
  }

  return { app, url, container: container as StartedPostgreSqlContainer, token: emissor.token, logs, encerrar };
}
