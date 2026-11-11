// Seed idempotente (ADR-001). Roda com `npm run seed` (Node 24 executa .ts).
// Usa a DATABASE_URL do ambiente; sem ela, lê o .env local (banco do Docker).
// Contra produção, quem roda é a pessoa, no terminal dela — nunca o agente
// (o hook producao-guarda bloqueia). Este arquivo não contém senha nenhuma:
// a conta do professor é criada no painel do Supabase (spec 009 regra 4).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

type Item = { patrimonio: string; nome: string; categoria: string; situacao: string };

// Caminhos a partir deste arquivo (funciona como CJS ou ESM).
const pastaPrisma = path.dirname(path.resolve(process.argv[1] ?? 'prisma/seed.ts'));
const raiz = path.resolve(pastaPrisma, '..');

const PROFESSOR = { email: 'marcelo.grilo@institutojef.org.br', nome: 'Marcelo Grilo' };

function lerJson<T>(arquivo: string, padrao: T): T {
  return existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, 'utf8')) as T) : padrao;
}

async function main() {
  if (!process.env.DATABASE_URL && existsSync(path.join(raiz, '.env'))) {
    process.loadEnvFile(path.join(raiz, '.env'));
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL ausente.');

  // Spec 009 regra 1: fonte única dos equipamentos.
  const itens = lerJson<Item[]>(path.join(pastaPrisma, 'dados', 'equipamentos.json'), []);
  // Spec 009 regra 3: só aponta para foto que passou pela skill (tem crédito).
  const creditos = lerJson<Record<string, unknown>>(
    path.join(raiz, 'imagens', 'equipamentos', 'creditos.json'),
    {},
  );

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    await db.query('BEGIN');
    // Spec 002 CA-09: o tenant suporte_ti existe exatamente uma vez.
    const tenant = await db.query<{ id: string }>(
      `INSERT INTO tenants (slug, nome) VALUES ('suporte_ti', 'Suporte de TI')
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
       RETURNING id`,
    );
    const tenantId = tenant.rows[0]?.id;
    if (!tenantId) throw new Error('tenant suporte_ti não foi criado.');

    // Spec 009 regra 2: upsert por (tenant, patrimônio); nunca cria empréstimo.
    for (const item of itens) {
      const foto = creditos[item.patrimonio] ? `${item.patrimonio}.jpg` : null;
      await db.query(
        `INSERT INTO equipamentos (tenant_id, nome, categoria, patrimonio, situacao, imagem_path)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, patrimonio) DO UPDATE
           SET nome = EXCLUDED.nome, categoria = EXCLUDED.categoria,
               situacao = EXCLUDED.situacao, imagem_path = EXCLUDED.imagem_path`,
        [tenantId, item.nome, item.categoria, item.patrimonio, item.situacao, foto],
      );
    }

    // Spec 009 regra 4: vincula a conta do professor, se ela já existir.
    const temAuth = await db.query<{ ok: boolean }>(
      `SELECT to_regclass('auth.users') IS NOT NULL AS ok`,
    );
    let professor = 'schema auth ausente (banco local): vínculo do professor ignorado';
    if (temAuth.rows[0]?.ok) {
      const conta = await db.query<{ id: string }>(
        `UPDATE auth.users
         SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                                 || jsonb_build_object('tenant_id', $2::text)
         WHERE lower(email) = lower($1)
         RETURNING id`,
        [PROFESSOR.email, tenantId],
      );
      const userId = conta.rows[0]?.id;
      if (userId) {
        await db.query(
          `INSERT INTO memberships (user_id, tenant_id, papel, nome)
           VALUES ($1, $2, 'colaborador', $3)
           ON CONFLICT (user_id, tenant_id) DO UPDATE SET papel = EXCLUDED.papel, nome = EXCLUDED.nome`,
          [userId, tenantId, PROFESSOR.nome],
        );
        professor = `professor vinculado (${PROFESSOR.email})`;
      } else {
        professor = `AVISO: conta ${PROFESSOR.email} não existe no Supabase Auth; crie no painel e rode o seed de novo`;
      }
    }

    await db.query('COMMIT');
    console.log(`seed: tenant suporte_ti ok; ${itens.length} equipamentos; ${professor}`);
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
