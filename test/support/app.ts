import { Writable } from 'node:stream';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pino from 'pino';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { RELOGIO } from '../../src/common/datas';
import { LOGGER } from '../../src/common/request-context';
import { ENV } from '../../src/config/config.module';
import { parseEnv } from '../../src/config/env';
import { JWKS } from '../../src/modules/auth/jwt-auth.guard';
import { subirBanco } from './banco';
import { criarEmissor, EMISSOR } from './tokens';

type Emissor = Awaited<ReturnType<typeof criarEmissor>>;

/** Relógio dos testes: `relogio.agora` pode ser trocado no meio do teste. */
export type RelogioTeste = { agora: Date };

async function montarApp(url: string, emissor: Emissor, relogio: RelogioTeste, destino: Writable) {
  const env = parseEnv({
    DATABASE_URL: url,
    CORS_ORIGIN: 'http://localhost:5173',
    SUPABASE_JWKS_URL: `${EMISSOR}/.well-known/jwks.json`,
    SUPABASE_JWT_ISSUER: EMISSOR,
    STORAGE_PUBLIC_URL: 'https://teste.supabase.co/storage/v1/object/public/equipamentos',
  });
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(JWKS)
    .useValue(emissor.jwks)
    .overrideProvider(LOGGER)
    .useValue(pino(destino))
    .overrideProvider(RELOGIO)
    .useValue(() => relogio.agora)
    .compile();
  const app: INestApplication = modulo.createNestApplication({ logger: false });
  configureApp(app, env.CORS_ORIGIN);
  // Escuta uma vez numa porta livre: o supertest reaproveita o servidor em vez
  // de abrir um por request (importa nos testes de concorrência).
  await app.listen(0, '127.0.0.1');
  return app;
}

/**
 * App Nest completa contra um Postgres descartável, com JWKS local, relógio
 * controlável e o log capturado em memória (linhas JSON do pino).
 * `outraInstancia()` sobe uma segunda app no mesmo banco — como duas funções
 * da Vercel ao mesmo tempo, cada uma com o seu pool de 1 conexão.
 */
export async function subirApp() {
  const { container, url } = await subirBanco();
  const emissor = await criarEmissor();
  const relogio: RelogioTeste = { agora: new Date() };
  const logs: Record<string, unknown>[] = [];
  const destino = new Writable({
    write(chunk, _enc, cb) {
      for (const linha of String(chunk).split('\n').filter(Boolean)) logs.push(JSON.parse(linha));
      cb();
    },
  });
  const app = await montarApp(url, emissor, relogio, destino);
  const extras: INestApplication[] = [];

  async function outraInstancia() {
    const outra = await montarApp(url, emissor, relogio, destino);
    extras.push(outra);
    return outra;
  }

  async function encerrar() {
    for (const e of extras) await e.close();
    await app.close();
    await container.stop();
  }

  return {
    app,
    url,
    container: container as StartedPostgreSqlContainer,
    token: emissor.token,
    logs,
    relogio,
    outraInstancia,
    encerrar,
  };
}
