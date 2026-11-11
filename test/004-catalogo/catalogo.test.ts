import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { subirApp } from '../support/app';
import { rodarSeed } from '../support/seed';

const STORAGE = 'https://teste.supabase.co/storage/v1/object/public/equipamentos';

describe('004 · GET /v1/equipamentos', () => {
  let ctx: Awaited<ReturnType<typeof subirApp>>;
  let db: Client;
  let tenantA: string;
  let tenantB: string;
  let tenantPag: string;
  const ana = randomUUID(); // colaboradora em A
  const otavio = randomUUID(); // operações em A
  const bia = randomUUID(); // colaboradora em B
  const pedro = randomUUID(); // colaborador no tenant de paginação
  const ids: Record<string, string> = {};

  const http = () => request(ctx.app.getHttpServer());
  const como = async (sub: string, tenantId: string) =>
    `Bearer ${await ctx.token({ sub, tenantId })}`;

  async function equipamento(
    tenantId: string,
    nome: string,
    o: { patrimonio?: string | null; situacao?: string; obs?: string; imagem?: string; minutosAtras: number },
  ) {
    const r = await db.query(
      `INSERT INTO equipamentos (tenant_id, nome, categoria, patrimonio, situacao, observacao, imagem_path, criado_em)
       VALUES ($1, $2, 'notebook', $3, $4, $5, $6, now() - make_interval(mins => $7)) RETURNING id`,
      [tenantId, nome, o.patrimonio ?? null, o.situacao ?? 'disponivel', o.obs ?? null, o.imagem ?? null, o.minutosAtras],
    );
    return r.rows[0].id as string;
  }

  beforeAll(async () => {
    ctx = await subirApp();
    rodarSeed(ctx.url);
    db = new Client({ connectionString: ctx.url });
    await db.connect();
    tenantA = (await db.query(`SELECT id FROM tenants WHERE slug = 'suporte_ti'`)).rows[0].id;
    tenantB = (await db.query(`INSERT INTO tenants (slug, nome) VALUES ('b', 'B') RETURNING id`)).rows[0].id;
    tenantPag = (await db.query(`INSERT INTO tenants (slug, nome) VALUES ('pag', 'Pag') RETURNING id`)).rows[0].id;
    await db.query(
      `INSERT INTO memberships (user_id, tenant_id, papel, nome) VALUES
       ($1, $2, 'colaborador', 'Ana Ribeiro'), ($3, $2, 'operacoes', 'Otávio Lima'),
       ($4, $5, 'colaborador', 'Bia'), ($6, $7, 'colaborador', 'Pedro')`,
      [ana, tenantA, otavio, bia, tenantB, pedro, tenantPag],
    );
    // Tenant A, do mais novo (1 min) ao mais antigo (6 min).
    ids.notebook = await equipamento(tenantA, 'Notebook Dell Latitude', { patrimonio: 'TI-0142', imagem: 'TI-0142.jpg', minutosAtras: 1 });
    ids.macbook = await equipamento(tenantA, 'MacBook Pro 14', { patrimonio: 'TI-0088', minutosAtras: 2 });
    ids.monitor = await equipamento(tenantA, 'Monitor Dell 24', { patrimonio: 'TI-0233', situacao: 'manutencao', obs: 'Painel com falha', minutosAtras: 3 });
    ids.camera = await equipamento(tenantA, 'Câmera Sony ZV-1', { patrimonio: 'TI-0301', minutosAtras: 4 });
    ids.cabo = await equipamento(tenantA, 'Cabo HDMI 2.1', { patrimonio: null, minutosAtras: 5 });
    ids.manutEmprestado = await equipamento(tenantA, 'Tripé Manfrotto', { patrimonio: 'TI-0318', situacao: 'manutencao', minutosAtras: 6 });
    // Empréstimos abertos: MacBook com Otávio, Câmera com Ana; um devolvido não conta.
    await db.query(
      `INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, retirada_em, devolver_ate, devolvido_em) VALUES
       ($1, $2, $3, '2026-08-24', '2026-09-07', NULL),
       ($1, $4, $5, '2026-08-29', '2026-09-12', NULL),
       ($1, $6, $5, '2026-07-01', '2026-07-15', '2026-07-10')`,
      [tenantA, ids.macbook, otavio, ids.camera, ana, ids.notebook],
    );
    // Tenant B: um item que A nunca pode ver.
    ids.deB = await equipamento(tenantB, 'Notebook do tenant B', { patrimonio: 'TI-0142', minutosAtras: 1 });
  });

  afterAll(async () => {
    await db?.end();
    await ctx?.encerrar();
  });

  it('[004 CA-01] devolve só os equipamentos do tenant do token, do mais novo ao mais antigo', async () => {
    const res = await http().get('/v1/equipamentos').set('Authorization', await como(ana, tenantA));
    expect(res.status).toBe(200);
    expect(res.body.itens.map((i: { id: string }) => i.id)).toEqual([
      ids.notebook, ids.macbook, ids.monitor, ids.camera, ids.cabo, ids.manutEmprestado,
    ]);
  });

  it('[004 CA-02] situação derivada: emprestado com empréstimo aberto, manutenção nunca disponível', async () => {
    const res = await http().get('/v1/equipamentos').set('Authorization', await como(ana, tenantA));
    const sit = Object.fromEntries(res.body.itens.map((i: { id: string; situacao: string }) => [i.id, i.situacao]));
    expect(sit[ids.notebook]).toBe('disponivel'); // empréstimo devolvido não conta
    expect(sit[ids.macbook]).toBe('emprestado');
    expect(sit[ids.monitor]).toBe('manutencao');
    expect(sit[ids.camera]).toBe('emprestado');
    expect(sit[ids.manutEmprestado]).toBe('manutencao');
    const monitor = res.body.itens.find((i: { id: string }) => i.id === ids.monitor);
    expect(monitor.observacao).toBe('Painel com falha');
  });

  it('[004 CA-03] q filtra por trecho do nome ou do patrimônio, sem diferenciar maiúsculas', async () => {
    const auth = await como(ana, tenantA);
    const porNome = await http().get('/v1/equipamentos?q=dELL').set('Authorization', auth);
    expect(porNome.body.itens.map((i: { id: string }) => i.id)).toEqual([ids.notebook, ids.monitor]);
    const porPatrimonio = await http().get('/v1/equipamentos?q=ti-03').set('Authorization', auth);
    expect(porPatrimonio.body.itens.map((i: { id: string }) => i.id)).toEqual([ids.camera, ids.manutEmprestado]);
    const curinga = await http().get('/v1/equipamentos?q=%25').set('Authorization', auth);
    expect(curinga.body.itens).toEqual([]);
  });

  it('[004 CA-04] situacao filtra pelo valor derivado', async () => {
    const auth = await como(ana, tenantA);
    const ids_ = async (s: string) =>
      (await http().get(`/v1/equipamentos?situacao=${s}`).set('Authorization', auth)).body.itens.map(
        (i: { id: string }) => i.id,
      );
    expect(await ids_('emprestado')).toEqual([ids.macbook, ids.camera]);
    expect(await ids_('manutencao')).toEqual([ids.monitor, ids.manutEmprestado]);
    expect(await ids_('disponivel')).toEqual([ids.notebook, ids.cabo]);
  });

  it('[004 CA-05] 120 itens em 3 páginas sem repetir nem pular, mesmo com cadastro entre as páginas', async () => {
    for (let i = 0; i < 120; i++) {
      await db.query(
        `INSERT INTO equipamentos (tenant_id, nome, categoria, situacao, criado_em)
         VALUES ($1, $2, 'cabo', 'disponivel', '2026-01-01T00:00:00Z'::timestamptz + make_interval(secs => $3))`,
        [tenantPag, `Item ${i}`, i % 7], // muitos empates de criado_em: o id desempata
      );
    }
    const auth = await como(pedro, tenantPag);
    const vistos: string[] = [];
    let cursor: string | null = null;
    let paginas = 0;
    do {
      const url: string = `/v1/equipamentos?limite=50${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await http().get(url).set('Authorization', auth);
      expect(res.status).toBe(200);
      vistos.push(...res.body.itens.map((i: { id: string }) => i.id));
      cursor = res.body.proximoCursor;
      paginas++;
      if (paginas === 1) {
        // cadastro novo entre a 1ª e a 2ª página: entra no topo e não desloca as próximas
        await db.query(
          `INSERT INTO equipamentos (tenant_id, nome, categoria, situacao) VALUES ($1, 'Novo', 'cabo', 'disponivel')`,
          [tenantPag],
        );
      }
    } while (cursor);
    expect(paginas).toBe(3);
    expect(vistos).toHaveLength(120);
    expect(new Set(vistos).size).toBe(120);
  });

  it('[004 CA-06] totais ignoram q e situacao', async () => {
    const res = await http()
      .get('/v1/equipamentos?q=macbook&situacao=emprestado')
      .set('Authorization', await como(ana, tenantA));
    expect(res.body.itens).toHaveLength(1);
    expect(res.body.totais).toEqual({ total: 6, disponiveis: 2 });
  });

  it('[004 CA-07] item emprestado traz pessoaNome, devolverAte e comigo correto', async () => {
    const res = await http().get('/v1/equipamentos').set('Authorization', await como(ana, tenantA));
    const porId = (id: string) => res.body.itens.find((i: { id: string }) => i.id === id);
    expect(porId(ids.camera).emprestimo).toEqual({ pessoaNome: 'Ana Ribeiro', devolverAte: '2026-09-12', comigo: true });
    expect(porId(ids.macbook).emprestimo).toEqual({ pessoaNome: 'Otávio Lima', devolverAte: '2026-09-07', comigo: false });
    expect(porId(ids.notebook).emprestimo).toBeNull();
  });

  it('[004 CA-08] sem token 401; token do tenant B nunca vê itens do tenant A', async () => {
    expect((await http().get('/v1/equipamentos')).status).toBe(401);
    const resB = await http().get('/v1/equipamentos').set('Authorization', await como(bia, tenantB));
    expect(resB.body.itens.map((i: { id: string }) => i.id)).toEqual([ids.deB]);
    const resA = await http().get('/v1/equipamentos').set('Authorization', await como(ana, tenantA));
    expect(resA.body.itens.map((i: { id: string }) => i.id)).not.toContain(ids.deB);
  });

  it('[004 CA-09] limite fora de 1–100, situacao inválida ou cursor adulterado respondem 400', async () => {
    const auth = await como(ana, tenantA);
    for (const qs of ['limite=0', 'limite=101', 'limite=abc', 'situacao=quebrado', 'cursor=lixo']) {
      const res = await http().get(`/v1/equipamentos?${qs}`).set('Authorization', auth);
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    }
  });

  it('[004 CA-10] Colaborador e Operações recebem a mesma lista', async () => {
    const colab = await http().get('/v1/equipamentos').set('Authorization', await como(ana, tenantA));
    const ops = await http().get('/v1/equipamentos').set('Authorization', await como(otavio, tenantA));
    const semComigo = (b: { itens: { emprestimo: { comigo?: boolean } | null }[] }) =>
      b.itens.map((i) => ({ ...i, emprestimo: i.emprestimo && { ...i.emprestimo, comigo: undefined } }));
    expect(semComigo(ops.body)).toEqual(semComigo(colab.body));
    expect(ops.body.totais).toEqual(colab.body.totais);
  });

  it('[004 CA-20] imagemUrl é a URL pública da foto, ou null sem foto', async () => {
    const res = await http().get('/v1/equipamentos').set('Authorization', await como(ana, tenantA));
    const porId = (id: string) => res.body.itens.find((i: { id: string }) => i.id === id);
    expect(porId(ids.notebook).imagemUrl).toBe(`${STORAGE}/TI-0142.jpg`);
    expect(porId(ids.macbook).imagemUrl).toBeNull();
  });
});

describe('004 · tabelas equipamentos e emprestimos', () => {
  let ctx: Awaited<ReturnType<typeof subirApp>>;
  let db: Client;

  beforeAll(async () => {
    ctx = await subirApp();
    rodarSeed(ctx.url);
    db = new Client({ connectionString: ctx.url });
    await db.connect();
  });

  afterAll(async () => {
    await db?.end();
    await ctx?.encerrar();
  });

  it('dois empréstimos abertos do mesmo equipamento são recusados pelo banco', async () => {
    const t = (await db.query(`SELECT id FROM tenants WHERE slug = 'suporte_ti'`)).rows[0].id;
    const e = (
      await db.query(
        `INSERT INTO equipamentos (tenant_id, nome, categoria, situacao) VALUES ($1, 'X', 'cabo', 'disponivel') RETURNING id`,
        [t],
      )
    ).rows[0].id;
    const abrir = () =>
      db.query(
        `INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, retirada_em, devolver_ate)
         VALUES ($1, $2, gen_random_uuid(), current_date, current_date + 14)`,
        [t, e],
      );
    await abrir();
    await expect(abrir()).rejects.toThrow(/emprestimos_um_aberto_por_equipamento/);
  });

  it('RLS habilitado em equipamentos e emprestimos', async () => {
    const r = await db.query(
      `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('equipamentos','emprestimos') ORDER BY relname`,
    );
    expect(r.rows).toEqual([
      { relname: 'emprestimos', relrowsecurity: true },
      { relname: 'equipamentos', relrowsecurity: true },
    ]);
  });
});
