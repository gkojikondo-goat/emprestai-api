// Seed idempotente (ADR-001). Roda com `npm run seed` (Node 24 executa .ts).
// Usa a DATABASE_URL do ambiente; sem ela, lê o .env local (banco do Docker).
// Contra produção, quem roda é a pessoa, no terminal dela — nunca o agente.
import { existsSync } from 'node:fs';
import pg from 'pg';

async function main() {
  if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL ausente.');

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    await db.query('BEGIN');
    // Spec 002 CA-09: o tenant suporte_ti existe exatamente uma vez.
    await db.query(
      `INSERT INTO tenants (slug, nome) VALUES ('suporte_ti', 'Suporte de TI')
       ON CONFLICT (slug) DO NOTHING`,
    );
    await db.query('COMMIT');
    console.log('seed: tenant suporte_ti ok');
  } catch (erro) {
    await db.query('ROLLBACK');
    throw erro;
  } finally {
    await db.end();
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
