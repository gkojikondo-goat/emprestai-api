// Prepara as fotos que faltam (spec 009 regra 6). Uso:
//   node .claude/skills/imagens-equipamentos/scripts/preparar.mjs [--refazer TI-0005]
// Lê a chave de PIXABAY_API_KEY (ambiente ou .env). Não envia nada a produção.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  baseApi,
  caminhos,
  dimensoesJpeg,
  LARGURA,
  ALTURA,
  LICENCA,
  lerJson,
  origemPermitida,
  padronizar,
  sha256,
  tagsProibidas,
} from './lib.mjs';

const c = caminhos();
if (!process.env.PIXABAY_API_KEY && existsSync(path.join(c.raiz, '.env'))) {
  process.loadEnvFile(path.join(c.raiz, '.env'));
}
const chave = process.env.PIXABAY_API_KEY;
if (!chave) {
  console.error('PIXABAY_API_KEY ausente: coloque a chave no .env (nunca em código).');
  process.exit(1);
}

// --refazer TI-0005          troca a foto de um item
// --escolher TI-0007=12345   usa a foto 12345 do Pixabay (passa pelas mesmas regras)
// --candidatos TI-0007       não baixa nada: monta .cache/candidatos/TI-0007.jpg com as
//                            próximas 9 candidatas aceitas pelas regras, para revisão visual
// --desde 9                  com --candidatos, pula as N primeiras aceitas (paginar)
const refazer = new Set();
const escolhas = new Map();
const candidatos = new Set();
let desde = 0;
for (let i = 2; i < process.argv.length; i++) {
  const [arg, valor] = [process.argv[i], process.argv[i + 1]];
  if (!valor) continue;
  if (arg === '--refazer') refazer.add(valor);
  if (arg === '--candidatos') candidatos.add(valor);
  if (arg === '--desde') desde = Number(valor) || 0;
  if (arg === '--escolher') {
    const [p, id] = valor.split('=');
    escolhas.set(p, String(id));
    refazer.add(p);
  }
  if (arg.startsWith('--')) i++;
}

const itens = lerJson(c.lista, []);
const creditos = lerJson(c.creditos, {});
const revisao = lerJson(c.revisao, {});
mkdirSync(c.pasta, { recursive: true });
mkdirSync(c.cache, { recursive: true });

// Máximo da API (3–200): quanto maior o lote, mais candidatas sobram depois da revisão visual.
const POR_PAGINA = 200;

/** Busca com cache de 24h por termo e tamanho de lote (exigência da API). */
async function buscar(termo) {
  const arquivo = path.join(c.cache, `${sha256(Buffer.from(`${termo}|${POR_PAGINA}`))}.json`);
  if (existsSync(arquivo)) {
    const salvo = JSON.parse(readFileSync(arquivo, 'utf8'));
    if (Date.now() - salvo.em < 24 * 3600 * 1000) return salvo.resposta;
  }
  const url = new URL(baseApi());
  url.search = new URLSearchParams({
    key: chave,
    q: termo,
    image_type: 'photo',
    safesearch: 'true',
    orientation: 'horizontal',
    min_width: String(LARGURA),
    min_height: String(ALTURA),
    per_page: String(POR_PAGINA),
  }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay respondeu ${res.status} para "${termo}"`);
  const resposta = await res.json();
  writeFileSync(arquivo, JSON.stringify({ em: Date.now(), resposta }));
  return resposta;
}

const reprovadasGlobais = new Set(
  Object.values(revisao).flatMap((lista) => lista.map((r) => String(r.pixabayId))),
);

/** Motivo de descarte pelas regras do contrato, ou null se a foto é aceitável. */
function motivoDeDescarte(hit, usados) {
  const id = String(hit.id);
  if (usados.has(id)) return 'usada';
  if (reprovadasGlobais.has(id)) return 'reprovada';
  if (tagsProibidas(hit.tags).length) return 'tag';
  if ((hit.imageWidth ?? 0) < LARGURA || (hit.imageHeight ?? 0) < ALTURA) return 'pequena';
  if (!origemPermitida(hit.largeImageURL) || !origemPermitida(hit.pageURL)) return 'origem';
  return null;
}

/** Folha de contato com as próximas 9 candidatas (pré-visualização temporária, permitida pela API). */
async function montarCandidatos(item, aceitas) {
  const { default: sharp } = await import('sharp');
  const W = 320, H = 240, R = 26;
  const pecas = [];
  for (const [i, hit] of aceitas.slice(0, 9).entries()) {
    const url = hit.webformatURL ?? hit.largeImageURL;
    if (!origemPermitida(url)) continue;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const x = (i % 3) * W, y = Math.floor(i / 3) * (H + R);
    const rotulo = Buffer.from(`<svg width="${W}" height="${R}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="18" font-size="16" fill="#fff" font-family="Arial">${hit.id}</text></svg>`);
    pecas.push({ input: rotulo, left: x, top: y }, { input: await sharp(buf).resize(W, H).toBuffer(), left: x, top: y + R });
  }
  const pasta = path.join(c.cache, 'candidatos');
  mkdirSync(pasta, { recursive: true });
  const saida = path.join(pasta, `${item.patrimonio}.jpg`);
  await sharp({ create: { width: 3 * W, height: 3 * (H + R), channels: 3, background: '#000' } })
    .composite(pecas)
    .jpeg({ quality: 80 })
    .toFile(saida);
  console.log(`${item.patrimonio}: candidatas ${aceitas.slice(0, 9).map((h) => h.id).join(', ')} em ${saida}`);
}

let feitos = 0;
for (const item of itens) {
  const pedirCandidatos = candidatos.has(item.patrimonio);
  if (!pedirCandidatos && creditos[item.patrimonio] && !refazer.has(item.patrimonio)) continue;
  const usados = new Set(
    Object.entries(creditos)
      .filter(([p]) => p !== item.patrimonio)
      .map(([, cr]) => String(cr.pixabayId)),
  );
  const { hits = [] } = await buscar(item.busca);
  if (pedirCandidatos) {
    await montarCandidatos(item, hits.filter((h) => motivoDeDescarte(h, usados) === null).slice(desde));
    continue;
  }
  const descartes = { tag: 0, usada: 0, reprovada: 0, pequena: 0, origem: 0 };
  let escolhida;
  const fixada = escolhas.get(item.patrimonio);
  for (const hit of hits) {
    if (fixada && String(hit.id) !== fixada) continue;
    const motivo = motivoDeDescarte(hit, usados);
    if (motivo) {
      descartes[motivo]++;
      continue;
    }
    escolhida = hit;
    break;
  }
  if (!escolhida) {
    const alvo = fixada ? `a foto ${fixada}` : `nenhuma foto aceitável para "${item.busca}"`;
    console.error(`${item.patrimonio}: ${alvo} não passa nas regras (${JSON.stringify(descartes)})`);
    process.exitCode = 1;
    continue;
  }
  const res = await fetch(escolhida.largeImageURL);
  if (!res.ok) throw new Error(`${item.patrimonio}: download falhou (${res.status})`);
  const final = await padronizar(Buffer.from(await res.arrayBuffer()));
  const d = dimensoesJpeg(final);
  if (!d || d.largura !== LARGURA || d.altura !== ALTURA) {
    throw new Error(`${item.patrimonio}: padronização não deu ${LARGURA}×${ALTURA}`);
  }
  writeFileSync(path.join(c.pasta, `${item.patrimonio}.jpg`), final);
  creditos[item.patrimonio] = {
    pixabayId: escolhida.id,
    pagina: escolhida.pageURL,
    autor: escolhida.user,
    autorUrl: `https://pixabay.com/users/${escolhida.user}-${escolhida.user_id}/`,
    licenca: LICENCA,
    tags: escolhida.tags,
    baixadoEm: new Date().toISOString(),
    sha256: sha256(final),
  };
  usados.add(String(escolhida.id));
  feitos++;
  console.log(`${item.patrimonio}: foto ${escolhida.id} de ${escolhida.user} (${JSON.stringify(descartes)})`);
}

const ordenado = Object.fromEntries(Object.entries(creditos).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(c.creditos, `${JSON.stringify(ordenado, null, 2)}\n`);
console.log(`preparar: ${feitos} foto(s) nova(s). Faça a revisão visual antes de commitar.`);
