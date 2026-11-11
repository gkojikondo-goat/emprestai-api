import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { subirBanco } from '../support/banco';

describe('002 · RLS em tenants e memberships', () => {
  let container: StartedPostgreSqlContainer;
  let db: Client;

  beforeAll(async () => {
    const banco = await subirBanco();
    container = banco.container;
    db = new Client({ connectionString: banco.url });
    await db.connect();
    const t = await db.query(
      `INSERT INTO tenants (slug, nome) VALUES ('suporte_ti', 'Suporte de TI') RETURNING id`,
    );
    await db.query(
      `INSERT INTO memberships (user_id, tenant_id, papel, nome)
       VALUES (gen_random_uuid(), $1, 'colaborador', 'Ana')`,
      [t.rows[0].id],
    );
    // Role sem bypass, como anon/authenticated do Supabase.
    await db.query('CREATE ROLE sem_bypass NOLOGIN');
    await db.query('GRANT SELECT ON tenants, memberships TO sem_bypass');
  });

  afterAll(async () => {
    await db?.end();
    await container?.stop();
  });

  it('[002 CA-08] RLS habilitado nas duas tabelas', async () => {
    const r = await db.query(
      `SELECT relname, relrowsecurity FROM pg_class
       WHERE relname IN ('tenants', 'memberships') ORDER BY relname`,
    );
    expect(r.rows).toEqual([
      { relname: 'memberships', relrowsecurity: true },
      { relname: 'tenants', relrowsecurity: true },
    ]);
  });

  it('[002 CA-08] role sem bypass lê zero linhas; o dono lê as linhas', async () => {
    await db.query('SET ROLE sem_bypass');
    const semBypass = await db.query(
      'SELECT (SELECT count(*) FROM tenants)::int AS t, (SELECT count(*) FROM memberships)::int AS m',
    );
    await db.query('RESET ROLE');
    const dono = await db.query(
      'SELECT (SELECT count(*) FROM tenants)::int AS t, (SELECT count(*) FROM memberships)::int AS m',
    );
    expect(semBypass.rows[0]).toEqual({ t: 0, m: 0 });
    expect(dono.rows[0]).toEqual({ t: 1, m: 1 });
  });

  it('memberships recusa papel fora de colaborador/operacoes', async () => {
    await expect(
      db.query(
        `INSERT INTO memberships (user_id, tenant_id, papel, nome)
         SELECT gen_random_uuid(), id, 'admin', 'X' FROM tenants LIMIT 1`,
      ),
    ).rejects.toThrow(/memberships_papel_check/);
  });
});
