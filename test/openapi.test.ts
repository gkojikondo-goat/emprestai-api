import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gerarDocumento, serializar } from '../src/openapi';
import { subirApp } from './support/app';

describe('openapi.json', () => {
  let ctx: Awaited<ReturnType<typeof subirApp>>;

  beforeAll(async () => {
    ctx = await subirApp();
  });

  afterAll(async () => {
    await ctx?.encerrar();
  });

  it('o arquivo versionado está igual ao gerado dos schemas (rode `npm run openapi`)', () => {
    const versionado = readFileSync(path.resolve(__dirname, '..', 'openapi.json'), 'utf8');
    expect(versionado.replace(/\r\n/g, '\n')).toBe(serializar(gerarDocumento(ctx.app)));
  });

  it('lista GET /v1/me com o schema de resposta e exige bearer', () => {
    const doc = gerarDocumento(ctx.app);
    const op = doc.paths['/v1/me']?.get;
    expect(op).toBeDefined();
    expect(JSON.stringify(op?.responses)).toMatch(/papel/);
    expect(op?.security).toEqual([{ bearer: [] }]);
  });
});
