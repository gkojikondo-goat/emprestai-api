import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import request from 'supertest';
import { subirApp } from '../support/app';
import { rodarSeed } from '../support/seed';

type Item = { patrimonio: string; nome: string; categoria: string; situacao: string };
const LISTA: Item[] = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../prisma/dados/equipamentos.json'), 'utf8'),
);
const CREDITOS: Record<string, unknown> = (() => {
  try {
    return JSON.parse(
      readFileSync(path.resolve(__dirname, '../../imagens/equipamentos/creditos.json'), 'utf8'),
    );
  } catch {
    return {};
  }
})();
const STORAGE = 'https://teste.supabase.co/storage/v1/object/public/equipamentos';
const PROFESSOR = 'marcelo.grilo@institutojef.org.br';

describe('009 · seed dos dados iniciais', () => {
  let ctx: Awaited<ReturnType<typeof subirApp>>;
  let db: Client;
  let tenantId: string;
  const professorId = randomUUID();

  beforeAll(async () => {
    ctx = await subirApp();
    db = new Client({ connectionString: ctx.url });
    await db.connect();
    // Schema auth mínimo, como o do Supabase, com a conta do professor já criada no painel.
    await db.query(`CREATE SCHEMA auth`);
    await db.query(
      `CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_app_meta_data jsonb)`,
    );
    await db.query(
      `INSERT INTO auth.users VALUES ($1, $2, '{"provider":"email","providers":["email"]}')`,
      [professorId, PROFESSOR],
    );
    // Três rodadas: a idempotência é parte do que se prova.
    for (let i = 0; i < 3; i++) rodarSeed(ctx.url);
    tenantId = (await db.query(`SELECT id FROM tenants WHERE slug = 'suporte_ti'`)).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await ctx?.encerrar();
  });

  it('[009 CA-01] o suporte_ti tem exatamente os 12 patrimônios da lista, com nome, categoria e situação', async () => {
    expect(LISTA).toHaveLength(12);
    const r = await db.query(
      `SELECT patrimonio, nome, categoria, situacao FROM equipamentos WHERE tenant_id = $1 ORDER BY patrimonio`,
      [tenantId],
    );
    expect(r.rows).toEqual(
      [...LISTA]
        .sort((a, b) => a.patrimonio.localeCompare(b.patrimonio))
        .map(({ patrimonio, nome, categoria, situacao }) => ({ patrimonio, nome, categoria, situacao })),
    );
  });

  it('[009 CA-02] TI-0004, TI-0007 e TI-0010 em manutenção, 9 disponíveis, nenhum empréstimo', async () => {
    const r = await db.query(
      `SELECT patrimonio FROM equipamentos WHERE tenant_id = $1 AND situacao = 'manutencao' ORDER BY 1`,
      [tenantId],
    );
    expect(r.rows.map((x) => x.patrimonio)).toEqual(['TI-0004', 'TI-0007', 'TI-0010']);
    const disp = await db.query(
      `SELECT count(*)::int AS n FROM equipamentos WHERE tenant_id = $1 AND situacao = 'disponivel'`,
      [tenantId],
    );
    expect(disp.rows[0].n).toBe(9);
    expect((await db.query(`SELECT count(*)::int AS n FROM emprestimos`)).rows[0].n).toBe(0);
  });

  it('[009 CA-03] três rodadas do seed não duplicam equipamento, tenant nem vínculo', async () => {
    const r = await db.query(`
      SELECT (SELECT count(*) FROM tenants WHERE slug = 'suporte_ti')::int AS tenants,
             (SELECT count(*) FROM equipamentos)::int AS equipamentos,
             (SELECT count(*) FROM memberships)::int AS vinculos`);
    expect(r.rows[0]).toEqual({ tenants: 1, equipamentos: 12, vinculos: 1 });
  });

  it('[009 CA-04] equipamento com foto aprovada aponta para <patrimônio>.jpg e a API devolve a URL pública', async () => {
    const r = await db.query(
      `SELECT patrimonio, imagem_path FROM equipamentos WHERE tenant_id = $1 ORDER BY patrimonio`,
      [tenantId],
    );
    for (const { patrimonio, imagem_path } of r.rows) {
      expect(imagem_path).toBe(CREDITOS[patrimonio] ? `${patrimonio}.jpg` : null);
    }
    const token = await ctx.token({ sub: professorId, tenantId });
    const res = await request(ctx.app.getHttpServer())
      .get('/v1/equipamentos?limite=100')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.itens).toHaveLength(12);
    for (const item of res.body.itens) {
      expect(item.imagemUrl).toBe(CREDITOS[item.patrimonio] ? `${STORAGE}/${item.patrimonio}.jpg` : null);
    }
  });

  it('[009 CA-05] com a conta no Auth, grava tenant_id no app_metadata, vincula como colaborador e não cria empréstimo', async () => {
    const u = await db.query(`SELECT raw_app_meta_data AS m FROM auth.users WHERE id = $1`, [professorId]);
    expect(u.rows[0].m).toEqual({ provider: 'email', providers: ['email'], tenant_id: tenantId });
    const v = await db.query(`SELECT papel, nome FROM memberships WHERE user_id = $1 AND tenant_id = $2`, [
      professorId,
      tenantId,
    ]);
    expect(v.rows).toEqual([{ papel: 'colaborador', nome: 'Marcelo Grilo' }]);
    const e = await db.query(`SELECT count(*)::int AS n FROM emprestimos WHERE user_id = $1`, [professorId]);
    expect(e.rows[0].n).toBe(0);
    // E o professor entra de verdade na API com esse vínculo.
    const token = await ctx.token({ sub: professorId, email: PROFESSOR, tenantId });
    const me = await request(ctx.app.getHttpServer()).get('/v1/me').set('Authorization', `Bearer ${token}`);
    expect(me.body).toMatchObject({ email: PROFESSOR, nome: 'Marcelo Grilo', papel: 'colaborador' });
  });

  it('[009 CA-05] sem a conta no Auth, o seed avisa e termina com código 0', async () => {
    await db.query(`DELETE FROM memberships WHERE user_id = $1`, [professorId]);
    await db.query(`DELETE FROM auth.users WHERE id = $1`, [professorId]);
    const saida = rodarSeed(ctx.url); // lança se o código de saída não for 0
    expect(saida).toMatch(/AVISO: conta marcelo\.grilo@institutojef\.org\.br não existe/);
  });
});
