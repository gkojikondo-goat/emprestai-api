import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Roda o seed de verdade (`node prisma/seed.ts`) contra o banco do container. */
export function rodarSeed(url: string, env: Record<string, string> = {}): string {
  const raiz = path.resolve(__dirname, '..', '..');
  return execFileSync(process.execPath, [path.join(raiz, 'prisma', 'seed.ts')], {
    cwd: raiz,
    env: { ...process.env, ...env, DATABASE_URL: url },
    encoding: 'utf8',
    stdio: 'pipe',
  });
}
