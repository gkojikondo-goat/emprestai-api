import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import { subirApp } from '../support/app';

const HOJE = '2026-11-10';
const AGORA = new Date('2026-11-10T15:00:00Z'); // 12:00 em São Paulo

describe('006 · solicitar empréstimo (API)', () => {
  let ctx: Awaited<ReturnType<typeof subirApp>>;
  let segunda: INestApplication;
  let db: Client;
  let tenant: string;
  let outroTenant: string;

  const http = (app?: INestApplication) => request((app ?? ctx.app).getHttpServer());
  const auth = async (sub: string, t = tenant) => `Bearer ${await ctx.token({ sub, tenantId: t })}`;

  async function pessoa(nome: string, t = tenant) {
    const id = randomUUID();
    await db.query(`INSERT INTO memberships (user_id, tenant_id, papel, nome) VALUES ($1, $2, 'colaborador', $3)`, [id, t, nome]);
    return id;
  }
  async function equipamento(situacao = 'disponivel', t = tenant) {
    const r = await db.query(
      `INSERT INTO equipamentos (tenant_id, nome, categoria, patrimonio, situacao)
       VALUES ($1, 'Item ' || substr(md5(random()::text), 1, 6), 'cabo', 'TI-' || substr(md5(random()::text), 1, 8), $2) RETURNING id`,
      [t, situacao],
    );
    return r.rows[0].id as string;
  }
  async function emprestimoAberto(user: string, devolverAte: string) {
    const e = await equipamento();
    await db.query(
      `INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, retirada_em, devolver_ate)
       VALUES ($1, $2, $3, $4::date - 14, $4::date)`,
      [tenant, e, user, devolverAte],
    );
    return e;
  }
  const pedir = async (user: string, equipamentoId: string, app?: INestApplication, extra = {}) =>
    http(app).post('/v1/emprestimos').set('Authorization', await auth(user)).send({ equipamentoId, ...extra });
  const abertos = async (user: string) =>
    (await db.query(`SELECT count(*)::int AS n FROM emprestimos WHERE user_id = $1 AND devolvido_em IS NULL`, [user])).rows[0].n;

  beforeAll(async () => {
    ctx = await subirApp();
    ctx.relogio.agora = AGORA;
    segunda = await ctx.outraInstancia();
    db = new Client({ connectionString: ctx.url });
    await db.connect();
    tenant = (await db.query(`INSERT INTO tenants (slug, nome) VALUES ('t', 'T') RETURNING id`)).rows[0].id;
    outroTenant = (await db.query(`INSERT INTO tenants (slug, nome) VALUES ('o', 'O') RETURNING id`)).rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
    await ctx?.encerrar();
  });

  it('[006 CA-01] pedido de item disponível responde 201 em nome da pessoa do token', async () => {
    const ana = await pessoa('Ana');
    const e = await equipamento();
    const res = await pedir(ana, e);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ equipamentoId: e, userId: ana });
  });

  it('[006 CA-02] devolverAte = retiradaEm + 14 dias (data civil de São Paulo)', async () => {
    const bia = await pessoa('Bia');
    const res = await pedir(bia, await equipamento());
    expect(res.body.retiradaEm).toBe(HOJE);
    expect(res.body.devolverAte).toBe('2026-11-24');
  });

  it('[006 CA-03] depois do pedido o item aparece como emprestado no catálogo', async () => {
    const caio = await pessoa('Caio');
    const e = await equipamento();
    await pedir(caio, e);
    const cat = await http().get('/v1/equipamentos?limite=100').set('Authorization', await auth(caio));
    const item = cat.body.itens.find((i: { id: string }) => i.id === e);
    expect(item.situacao).toBe('emprestado');
    expect(item.emprestimo).toMatchObject({ pessoaNome: 'Caio', devolverAte: '2026-11-24', comigo: true });
  });

  it('[006 CA-04] com 3 em aberto responde 422 limite-de-itens e nada é criado', async () => {
    const davi = await pessoa('Davi');
    for (let i = 0; i < 3; i++) expect((await pedir(davi, await equipamento())).status).toBe(201);
    const res = await pedir(davi, await equipamento());
    expect(res.status).toBe(422);
    expect(res.body.type).toBe('limite-de-itens');
    expect(res.body.detail).toBe('Você já tem 3 itens emprestados.');
    expect(await abertos(davi)).toBe(3);
  });

  it('[006 CA-05] com 2 em aberto, dois pedidos simultâneos (duas instâncias): um 201 e um 422; nunca 4', async () => {
    for (let rodada = 0; rodada < 5; rodada++) {
      const eva = await pessoa(`Eva ${rodada}`);
      await pedir(eva, await equipamento());
      await pedir(eva, await equipamento());
      const [a, b] = await Promise.all([pedir(eva, await equipamento()), pedir(eva, await equipamento(), segunda)]);
      expect([a.status, b.status].sort()).toEqual([201, 422]);
      expect(await abertos(eva)).toBe(3);
    }
  });

  it('[006 CA-06] com empréstimo em atraso responde 422 bloqueado-por-atraso; prazo igual a hoje não bloqueia', async () => {
    const fabi = await pessoa('Fabi');
    await emprestimoAberto(fabi, '2026-11-09'); // ontem: atrasado
    const res = await pedir(fabi, await equipamento());
    expect(res.status).toBe(422);
    expect(res.body.type).toBe('bloqueado-por-atraso');
    const gil = await pessoa('Gil');
    await emprestimoAberto(gil, HOJE); // vence hoje: ainda em dia
    expect((await pedir(gil, await equipamento())).status).toBe(201);
  });

  it('[006 CA-07] item já emprestado responde 409; duas pessoas no mesmo item ao mesmo tempo: um 201 e um 409', async () => {
    const hugo = await pessoa('Hugo');
    const iris = await pessoa('Iris');
    const e = await equipamento();
    await pedir(hugo, e);
    const res = await pedir(iris, e);
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('equipamento-indisponivel');
    for (let rodada = 0; rodada < 5; rodada++) {
      const alvo = await equipamento();
      const j = await pessoa(`J${rodada}`);
      const k = await pessoa(`K${rodada}`);
      const [a, b] = await Promise.all([pedir(j, alvo), pedir(k, alvo, segunda)]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      const n = await db.query(`SELECT count(*)::int AS n FROM emprestimos WHERE equipamento_id = $1`, [alvo]);
      expect(n.rows[0].n).toBe(1);
    }
  });

  it('[006 CA-08] item em manutenção responde 409 equipamento-em-manutencao', async () => {
    const res = await pedir(await pessoa('Lia'), await equipamento('manutencao'));
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('equipamento-em-manutencao');
  });

  it('[006 CA-09] equipamento inexistente ou de outro tenant: 404; corpo inválido: 400', async () => {
    const mel = await pessoa('Mel');
    expect((await pedir(mel, randomUUID())).status).toBe(404);
    expect((await pedir(mel, await equipamento('disponivel', outroTenant))).status).toBe(404);
    const invalido = await http().post('/v1/emprestimos').set('Authorization', await auth(mel)).send({ equipamentoId: 'abc' });
    expect(invalido.status).toBe(400);
    expect(invalido.headers['content-type']).toMatch(/application\/problem\+json/);
    expect((await http().post('/v1/emprestimos').set('Authorization', await auth(mel)).send({})).status).toBe(400);
  });

  it('[006 CA-10] /meus devolve só os abertos de quem chama, com emAtraso e bloqueado', async () => {
    const nina = await pessoa('Nina');
    const outra = await pessoa('Otto');
    const doOutroTenant = await pessoa('Paulo', outroTenant);
    const atrasado = await emprestimoAberto(nina, '2026-11-01');
    const emDia = await emprestimoAberto(nina, '2026-11-20');
    await db.query(`UPDATE emprestimos SET devolvido_em = '2026-11-05' WHERE equipamento_id = $1`, [await emprestimoAberto(nina, '2026-11-08')]);
    await emprestimoAberto(outra, '2026-11-20');
    const res = await http().get('/v1/emprestimos/meus').set('Authorization', await auth(nina));
    expect(res.status).toBe(200);
    expect(res.body.limite).toBe(3);
    expect(res.body.bloqueado).toBe(true);
    expect(res.body.itens.map((i: { equipamento: { id: string }; emAtraso: boolean }) => [i.equipamento.id, i.emAtraso])).toEqual([
      [atrasado, true],
      [emDia, false],
    ]);
    const vazio = await http().get('/v1/emprestimos/meus').set('Authorization', await auth(doOutroTenant, outroTenant));
    expect(vazio.body).toEqual({ itens: [], limite: 3, bloqueado: false });
  });

  it('[006 CA-11] userId e tenant_id no corpo são ignorados', async () => {
    const quem = await pessoa('Quem');
    const vitima = await pessoa('Vítima');
    const res = await pedir(quem, await equipamento(), undefined, { userId: vitima, tenant_id: outroTenant });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(quem);
    expect(await abertos(vitima)).toBe(0);
  });

  it('[006 CA-12] sem token responde 401', async () => {
    expect((await http().post('/v1/emprestimos').send({ equipamentoId: randomUUID() })).status).toBe(401);
    expect((await http().get('/v1/emprestimos/meus')).status).toBe(401);
  });

  it('[006 CA-13] cada pedido aceito grava auditoria com ator, tenant, ação e recurso; ela é append-only', async () => {
    const rui = await pessoa('Rui');
    const res = await pedir(rui, await equipamento());
    const a = await db.query(`SELECT tenant_id, ator_id, acao, recurso_tipo, recurso_id FROM auditoria WHERE recurso_id = $1`, [res.body.id]);
    expect(a.rows).toEqual([{ tenant_id: tenant, ator_id: rui, acao: 'emprestimo.criado', recurso_tipo: 'emprestimo', recurso_id: res.body.id }]);
    const recusado = await pedir(rui, await equipamento('manutencao'));
    expect(recusado.status).toBe(409);
    await expect(db.query(`DELETE FROM auditoria WHERE recurso_id = $1`, [res.body.id])).rejects.toThrow(/append-only/);
  });
});
