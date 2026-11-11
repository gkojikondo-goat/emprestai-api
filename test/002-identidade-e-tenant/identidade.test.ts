import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { subirApp } from '../support/app';
import { rodarSeed } from '../support/seed';

describe('002 · identidade e tenant (API)', () => {
  let ctx: Awaited<ReturnType<typeof subirApp>>;
  let db: Client;
  let tenantA: string;
  let tenantB: string;
  const ana = randomUUID(); // vínculo em A, colaboradora
  const bia = randomUUID(); // vínculo só em B
  const semVinculo = randomUUID();

  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await subirApp();
    rodarSeed(ctx.url);
    db = new Client({ connectionString: ctx.url });
    await db.connect();
    tenantA = (await db.query(`SELECT id FROM tenants WHERE slug = 'suporte_ti'`)).rows[0].id;
    tenantB = (
      await db.query(`INSERT INTO tenants (slug, nome) VALUES ('outra_area', 'Outra') RETURNING id`)
    ).rows[0].id;
    await db.query(
      `INSERT INTO memberships (user_id, tenant_id, papel, nome) VALUES
       ($1, $2, 'colaborador', 'Ana Souza'), ($3, $4, 'operacoes', 'Bia Lima')`,
      [ana, tenantA, bia, tenantB],
    );
  });

  afterAll(async () => {
    await db?.end();
    await ctx?.encerrar();
  });

  it('[002 CA-01] sem Authorization responde 401 em Problem Details', async () => {
    const res = await http().get('/v1/me');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({ type: 'about:blank', status: 401 });
    expect(res.body.title).toBeDefined();
    expect(res.body.detail).toBeDefined();
  });

  it('[002 CA-02] assinatura errada, expirado ou outro emissor responde 401', async () => {
    const casos = [
      await ctx.token({ sub: ana, tenantId: tenantA, chaveErrada: true }),
      await ctx.token({ sub: ana, tenantId: tenantA, expiraEm: Math.floor(Date.now() / 1000) - 60 }),
      await ctx.token({ sub: ana, tenantId: tenantA, emissor: 'https://outro.supabase.co/auth/v1' }),
      'nao.e.jwt',
    ];
    for (const t of casos) {
      const res = await http().get('/v1/me').set('Authorization', `Bearer ${t}`);
      expect(res.status).toBe(401);
      expect(res.body.status).toBe(401);
    }
  });

  it('[002 CA-03] token válido com vínculo responde 200 com os campos', async () => {
    const t = await ctx.token({ sub: ana, email: 'ana@teste.dev', tenantId: tenantA });
    const res = await http().get('/v1/me').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: ana,
      email: 'ana@teste.dev',
      nome: 'Ana Souza',
      tenant: { id: tenantA, slug: 'suporte_ti' },
      papel: 'colaborador',
    });
  });

  it('[002 CA-04] sem a claim tenant_id, ou sem memberships, responde 403 sem dados', async () => {
    const semClaim = await ctx.token({ sub: ana, tenantId: null });
    const semLinha = await ctx.token({ sub: semVinculo, tenantId: tenantA });
    for (const t of [semClaim, semLinha]) {
      const res = await http().get('/v1/me').set('Authorization', `Bearer ${t}`);
      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(Object.keys(res.body).sort()).toEqual(['detail', 'status', 'title', 'type']);
    }
  });

  it('[002 CA-05] tenant_id por cabeçalho, query ou corpo não muda o tenant', async () => {
    const t = await ctx.token({ sub: ana, tenantId: tenantA });
    const res = await http()
      .get(`/v1/me?tenant_id=${tenantB}`)
      .set('Authorization', `Bearer ${t}`)
      .set('X-Tenant-Id', tenantB)
      .set('tenant_id', tenantB)
      .send({ tenant_id: tenantB });
    expect(res.status).toBe(200);
    expect(res.body.tenant).toEqual({ id: tenantA, slug: 'suporte_ti' });
  });

  it('[002 CA-06] vínculo só no tenant B com claim apontando A responde 403', async () => {
    const t = await ctx.token({ sub: bia, tenantId: tenantA });
    const res = await http().get('/v1/me').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(403);
  });

  it('[002 CA-07] requests simultâneos de tenants diferentes não misturam contexto', async () => {
    const ta = await ctx.token({ sub: ana, tenantId: tenantA });
    const tb = await ctx.token({ sub: bia, tenantId: tenantB });
    const pedidos = Array.from({ length: 20 }, (_, i) =>
      http().get('/v1/me').set('Authorization', `Bearer ${i % 2 ? tb : ta}`),
    );
    const respostas = await Promise.all(pedidos);
    respostas.forEach((res, i) => {
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(i % 2 ? bia : ana);
      expect(res.body.tenant.id).toBe(i % 2 ? tenantB : tenantA);
      expect(res.body.papel).toBe(i % 2 ? 'operacoes' : 'colaborador');
    });
  });

  it('[002 CA-11] o log do request autenticado traz request_id e tenant_id', async () => {
    const t = await ctx.token({ sub: ana, tenantId: tenantA });
    ctx.logs.length = 0;
    await http().get('/v1/me').set('Authorization', `Bearer ${t}`);
    const linha = ctx.logs.find((l) => l.url === '/v1/me');
    expect(linha).toBeDefined();
    expect(linha?.request_id).toEqual(expect.any(String));
    expect(linha?.tenant_id).toBe(tenantA);
  });

  it('[002 CA-09] rodar o seed de novo deixa exatamente um suporte_ti', async () => {
    rodarSeed(ctx.url);
    rodarSeed(ctx.url);
    const r = await db.query(`SELECT count(*)::int AS n FROM tenants WHERE slug = 'suporte_ti'`);
    expect(r.rows[0].n).toBe(1);
  });
});
