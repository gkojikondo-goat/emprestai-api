import { execFile } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const SCRIPTS = path.resolve(__dirname, '../../.claude/skills/imagens-equipamentos/scripts');

type Hit = {
  id: number;
  tags: string;
  imageWidth: number;
  imageHeight: number;
  largeImageURL?: string;
  pageURL?: string;
  user?: string;
  user_id?: number;
};

/** Servidor falso do Pixabay: /api/?q=… e /img/<id>.jpg (JPEG 1280×853 único por id). */
async function pixabayFalso(porTermo: Record<string, Hit[]>) {
  const contagem = { api: 0, img: 0 };
  const servidor: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname === '/api/') {
      contagem.api++;
      const base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
      const hits = (porTermo[url.searchParams.get('q') ?? ''] ?? []).map((h) => ({
        user: 'fotografo',
        user_id: 42,
        pageURL: `https://pixabay.com/photos/foto-${h.id}/`,
        largeImageURL: `${base}/img/${h.id}.jpg`,
        ...h,
      }));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ total: hits.length, totalHits: hits.length, hits }));
      return;
    }
    const m = url.pathname.match(/^\/img\/(\d+)\.jpg$/);
    if (m) {
      contagem.img++;
      const id = Number(m[1]);
      const jpg = await sharp({
        create: { width: 1280, height: 853, channels: 3, background: { r: id % 256, g: (id * 7) % 256, b: 90 } },
      })
        .jpeg()
        .toBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      res.end(jpg);
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  return { base, contagem, fechar: () => new Promise((r) => servidor.close(r)) };
}

/** Storage falso do Supabase: bucket e objetos em memória. */
async function storageFalso() {
  const estado = { bucket: null as null | { public: boolean }, objetos: new Map<string, Buffer>(), auth: [] as string[] };
  const servidor = createServer((req, res) => {
    const partes: Buffer[] = [];
    req.on('data', (p) => partes.push(p));
    req.on('end', () => {
      estado.auth.push(String(req.headers.authorization));
      const corpo = Buffer.concat(partes);
      if (req.method === 'GET' && req.url === '/storage/v1/bucket/equipamentos') {
        res.statusCode = estado.bucket ? 200 : 404;
        res.end(JSON.stringify(estado.bucket ?? { error: 'not found' }));
      } else if (req.method === 'POST' && req.url === '/storage/v1/bucket') {
        estado.bucket = { public: JSON.parse(corpo.toString()).public };
        res.end('{}');
      } else if (req.method === 'POST' && req.url?.startsWith('/storage/v1/object/equipamentos/')) {
        const nome = req.url.split('/').pop() as string;
        if (estado.objetos.has(nome) && req.headers['x-upsert'] !== 'true') {
          res.statusCode = 409;
          res.end('duplicate');
          return;
        }
        estado.objetos.set(nome, corpo);
        res.end('{}');
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  return { base, estado, fechar: () => new Promise((r) => servidor.close(r)) };
}

function rodar(script: string, args: string[], env: Record<string, string | undefined>) {
  return new Promise<{ codigo: number; saida: string }>((resolve) => {
    const limpo = { ...process.env };
    delete limpo.PIXABAY_API_KEY;
    delete limpo.SUPABASE_SERVICE_ROLE_KEY;
    execFile(
      process.execPath,
      [path.join(SCRIPTS, script), ...args],
      { env: { ...limpo, ...env } as NodeJS.ProcessEnv },
      (erro, stdout, stderr) =>
        resolve({ codigo: erro ? ((erro as { code?: number }).code ?? 1) : 0, saida: stdout + stderr }),
    );
  });
}

const LISTA = [
  { patrimonio: 'TI-0001', nome: 'Notebook', categoria: 'notebook', situacao: 'disponivel', busca: 'laptop' },
  { patrimonio: 'TI-0002', nome: 'Monitor', categoria: 'monitor', situacao: 'disponivel', busca: 'monitor' },
  { patrimonio: 'TI-0003', nome: 'Cabo', categoria: 'cabo', situacao: 'manutencao', busca: 'cable' },
];

function novaRaiz() {
  const raiz = mkdtempSync(path.join(tmpdir(), 'skill-'));
  mkdirSync(path.join(raiz, 'prisma', 'dados'), { recursive: true });
  writeFileSync(path.join(raiz, 'prisma', 'dados', 'equipamentos.json'), JSON.stringify(LISTA));
  return raiz;
}

const ler = (raiz: string, arq: string) =>
  JSON.parse(readFileSync(path.join(raiz, 'imagens', 'equipamentos', arq), 'utf8'));

describe('009 · skill imagens-equipamentos', () => {
  let pixabay: Awaited<ReturnType<typeof pixabayFalso>>;
  let raiz: string;
  let env: Record<string, string>;

  beforeAll(async () => {
    pixabay = await pixabayFalso({
      laptop: [
        { id: 101, tags: 'laptop, man, office', imageWidth: 1920, imageHeight: 1280 }, // pessoa
        { id: 102, tags: 'laptop, apple, macbook', imageWidth: 1920, imageHeight: 1280 }, // marca
        { id: 103, tags: 'laptop, desk', imageWidth: 1920, imageHeight: 1280, largeImageURL: 'https://evil.example.com/x.jpg' }, // origem
        { id: 104, tags: 'laptop, white, desk', imageWidth: 1920, imageHeight: 1280 }, // ok
        { id: 105, tags: 'laptop, minimal', imageWidth: 1920, imageHeight: 1280 }, // ok (reserva)
      ],
      monitor: [
        { id: 104, tags: 'monitor, desk', imageWidth: 1920, imageHeight: 1280 }, // já usada pelo TI-0001
        { id: 201, tags: 'monitor, text, website', imageWidth: 1920, imageHeight: 1280 }, // texto
        { id: 202, tags: 'monitor, small', imageWidth: 640, imageHeight: 480 }, // pequena
        { id: 203, tags: 'monitor, office', imageWidth: 1920, imageHeight: 1280 }, // ok
      ],
      cable: [{ id: 301, tags: 'cable, ethernet', imageWidth: 2000, imageHeight: 1500 }],
    });
    raiz = novaRaiz();
    env = { SKILL_RAIZ: raiz, PIXABAY_API_BASE: pixabay.base, PIXABAY_API_KEY: 'chave-de-teste' };
    const r = await rodar('preparar.mjs', [], env);
    expect(r.codigo).toBe(0);
  });

  afterAll(async () => {
    await pixabay?.fechar();
    rmSync(raiz, { recursive: true, force: true });
  });

  it('[009 CA-08] só aceita a API do Pixabay: outra base é recusada antes de qualquer busca', async () => {
    const outra = novaRaiz();
    try {
      const r = await rodar('preparar.mjs', [], { ...env, SKILL_RAIZ: outra, PIXABAY_API_BASE: 'https://outra-fonte.com' });
      expect(r.codigo).not.toBe(0);
      expect(r.saida).toMatch(/única fonte é a API do Pixabay/);
    } finally {
      rmSync(outra, { recursive: true, force: true });
    }
  });

  it('[009 CA-08] resultado com download fora do Pixabay é descartado', () => {
    const cr = ler(raiz, 'creditos.json');
    expect(cr['TI-0001'].pixabayId).not.toBe(103);
  });

  it('[009 CA-09] descarta tags de pessoa, marca/logo e texto, foto pequena e foto já usada', () => {
    const cr = ler(raiz, 'creditos.json');
    expect(cr['TI-0001'].pixabayId).toBe(104); // pulou 101 (pessoa), 102 (marca), 103 (origem)
    expect(cr['TI-0002'].pixabayId).toBe(203); // pulou 104 (usada), 201 (texto), 202 (pequena)
    expect(cr['TI-0003'].pixabayId).toBe(301);
  });

  it('[009 CA-09] foto reprovada na revisão fica registrada e nunca é escolhida de novo', async () => {
    const rep = await rodar('reprovar.mjs', ['TI-0001', 'logo legível na tampa'], env);
    expect(rep.codigo).toBe(0);
    const prep = await rodar('preparar.mjs', [], env);
    expect(prep.codigo).toBe(0);
    expect(ler(raiz, 'creditos.json')['TI-0001'].pixabayId).toBe(105);
    expect(ler(raiz, 'revisao.json')['TI-0001']).toEqual([
      expect.objectContaining({ pixabayId: 104, motivo: 'logo legível na tampa' }),
    ]);
  });

  it('[009 CA-09] escolha manual (--escolher) passa pelas mesmas regras: marca e reprovada são recusadas', async () => {
    const marca = await rodar('preparar.mjs', ['--escolher', 'TI-0001=102'], env);
    expect(marca.codigo).toBe(1);
    expect(marca.saida).toMatch(/TI-0001: a foto 102 não passa nas regras/);
    const reprovada = await rodar('preparar.mjs', ['--escolher', 'TI-0001=104'], env);
    expect(reprovada.codigo).toBe(1);
    expect(ler(raiz, 'creditos.json')['TI-0001'].pixabayId).toBe(105);
    const valida = await rodar('preparar.mjs', ['--escolher', 'TI-0002=203'], env);
    expect(valida.codigo).toBe(0);
    expect(ler(raiz, 'creditos.json')['TI-0002'].pixabayId).toBe(203);
  });

  it('busca respeita o cache de 24h (exigência da API do Pixabay)', async () => {
    const antes = pixabay.contagem.api;
    const r = await rodar('preparar.mjs', ['--refazer', 'TI-0003'], env);
    expect(r.codigo).toBe(0);
    expect(pixabay.contagem.api).toBe(antes);
  });

  it('[009 CA-07] as fotos saem 800×600, sem repetição e com crédito completo (verificar passa)', async () => {
    const r = await rodar('verificar.mjs', [], env);
    expect(r.codigo).toBe(0);
    for (const { patrimonio } of LISTA) {
      const meta = await sharp(path.join(raiz, 'imagens', 'equipamentos', `${patrimonio}.jpg`)).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([800, 600, 'jpeg']);
    }
    const cr = ler(raiz, 'creditos.json');
    expect(cr['TI-0002']).toEqual({
      pixabayId: 203,
      pagina: 'https://pixabay.com/photos/foto-203/',
      autor: 'fotografo',
      autorUrl: 'https://pixabay.com/users/fotografo-42/',
      licenca: 'Pixabay Content License',
      tags: 'monitor, office',
      baixadoEm: expect.any(String),
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('[009 CA-07] verificar acusa foto repetida e foto fora de 800×600', async () => {
    const copia = novaRaiz();
    try {
      const pasta = path.join(copia, 'imagens', 'equipamentos');
      mkdirSync(pasta, { recursive: true });
      for (const f of ['TI-0001.jpg', 'TI-0002.jpg', 'creditos.json']) {
        copyFileSync(path.join(raiz, 'imagens', 'equipamentos', f), path.join(pasta, f));
      }
      // TI-0003 recebe o mesmo arquivo e o mesmo id do TI-0002.
      copyFileSync(path.join(pasta, 'TI-0002.jpg'), path.join(pasta, 'TI-0003.jpg'));
      const cr = JSON.parse(readFileSync(path.join(pasta, 'creditos.json'), 'utf8'));
      cr['TI-0003'] = { ...cr['TI-0002'] };
      writeFileSync(path.join(pasta, 'creditos.json'), JSON.stringify(cr));
      // TI-0001 vira 640×480.
      writeFileSync(path.join(pasta, 'TI-0001.jpg'), await sharp({ create: { width: 640, height: 480, channels: 3, background: '#333' } }).jpeg().toBuffer());
      const r = await rodar('verificar.mjs', [], { ...env, SKILL_RAIZ: copia });
      expect(r.codigo).toBe(1);
      expect(r.saida).toMatch(/TI-0001: 640×480, esperado 800×600/);
      expect(r.saida).toMatch(/TI-0003: mesma foto \(id 203\) que TI-0002/);
      expect(r.saida).toMatch(/TI-0003: conteúdo idêntico ao de TI-0002/);
    } finally {
      rmSync(copia, { recursive: true, force: true });
    }
  });

  it('[009 CA-10] enviar não roda sem SUPABASE_SERVICE_ROLE_KEY', async () => {
    const r = await rodar('enviar.mjs', [], { ...env, SUPABASE_URL: 'http://127.0.0.1:9' });
    expect(r.codigo).toBe(1);
    expect(r.saida).toMatch(/SUPABASE_SERVICE_ROLE_KEY ausente/);
  });

  it('[009 CA-10] enviar cria o bucket público e faz upsert: duas rodadas deixam 3 objetos', async () => {
    const storage = await storageFalso();
    try {
      const e = { ...env, SUPABASE_URL: storage.base, SUPABASE_SERVICE_ROLE_KEY: 'chave-falsa' };
      expect((await rodar('enviar.mjs', [], e)).codigo).toBe(0);
      expect((await rodar('enviar.mjs', [], e)).codigo).toBe(0);
      expect(storage.estado.bucket).toEqual({ public: true });
      expect([...storage.estado.objetos.keys()].sort()).toEqual(['TI-0001.jpg', 'TI-0002.jpg', 'TI-0003.jpg']);
      expect(storage.estado.auth.every((a) => a === 'Bearer chave-falsa')).toBe(true);
    } finally {
      await storage.fechar();
    }
  });

  it('[009 CA-10] enviar recusa o conjunto se alguma foto estiver fora de 800×600, sem enviar nada', async () => {
    const copia = novaRaiz();
    const storage = await storageFalso();
    try {
      const pasta = path.join(copia, 'imagens', 'equipamentos');
      mkdirSync(pasta, { recursive: true });
      for (const f of ['TI-0001.jpg', 'TI-0002.jpg', 'TI-0003.jpg', 'creditos.json']) {
        copyFileSync(path.join(raiz, 'imagens', 'equipamentos', f), path.join(pasta, f));
      }
      writeFileSync(path.join(pasta, 'TI-0002.jpg'), await sharp({ create: { width: 1024, height: 768, channels: 3, background: '#555' } }).jpeg().toBuffer());
      const r = await rodar('enviar.mjs', [], {
        ...env,
        SKILL_RAIZ: copia,
        SUPABASE_URL: storage.base,
        SUPABASE_SERVICE_ROLE_KEY: 'chave-falsa',
      });
      expect(r.codigo).toBe(1);
      expect(r.saida).toMatch(/TI-0002: 1024×768, esperado 800×600/);
      expect(storage.estado.objetos.size).toBe(0);
    } finally {
      await storage.fechar();
      rmSync(copia, { recursive: true, force: true });
    }
  });

  it('[009 CA-10] enviar recusa URL que não seja de projeto Supabase', async () => {
    const r = await rodar('enviar.mjs', [], { ...env, SUPABASE_URL: 'https://outro-servidor.com', SUPABASE_SERVICE_ROLE_KEY: 'x' });
    expect(r.codigo).toBe(1);
    expect(r.saida).toMatch(/SUPABASE_URL inválida/);
  });
});
