import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

/**
 * Sobe um Postgres real e descartável (Testcontainers) e aplica as migrations
 * do Prisma nele. Nenhum teste fala com o banco de desenvolvimento nem com o
 * de produção: a URL vem sempre do container.
 */
export async function subirBanco(): Promise<{
  container: StartedPostgreSqlContainer;
  url: string;
}> {
  const container = await new PostgreSqlContainer('postgres:17').start();
  const url = container.getConnectionUri();
  const raiz = path.resolve(__dirname, '..', '..');
  execFileSync(
    process.execPath,
    [path.join(raiz, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
    {
      cwd: raiz,
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      stdio: 'pipe',
    },
  );
  return { container, url };
}
