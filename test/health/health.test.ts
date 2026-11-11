import request from 'supertest';
import { subirApp } from '../support/app';

describe('GET /v1/health', () => {
  let ctx: Awaited<ReturnType<typeof subirApp>>;

  beforeAll(async () => {
    ctx = await subirApp();
  });

  afterAll(async () => {
    await ctx?.encerrar();
  });

  it('[AZ-04][002 CA-10] continua público: 200 sem token, com a mesma resposta', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });
});
