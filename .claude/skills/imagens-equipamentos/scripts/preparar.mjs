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

const refazer = new Set();
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--refazer' && process.argv[i + 1]) refazer.add(process.argv[++i]);
}

const itens = lerJson(c.lista, []);
const creditos = lerJson(c.creditos, {});
const revisao = lerJson(c.revisao, {});
mkdirSync(c.pasta, { recursive: true });
mkdirSync(c.cache, { recursive: true });

/** Busca com cache de 24h por termo (exigência da API). */
async function buscar(termo) {
  const arquivo = path.join(c.cache, `${sha256(Buffer.from(termo))}.json`);
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
    per_page: '50',
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

let feitos = 0;
for (const item of itens) {
  if (creditos[item.patrimonio] && !refazer.has(item.patrimonio)) continue;
  const usados = new Set(
    Object.entries(creditos)
      .filter(([p]) => p !== item.patrimonio)
      .map(([, cr]) => String(cr.pixabayId)),
  );
  const { hits = [] } = await buscar(item.busca);
  const descartes = { tag: 0, usada: 0, reprovada: 0, pequena: 0, origem: 0 };
  let escolhida;
  for (const hit of hits) {
    const id = String(hit.id);
    if (usados.has(id)) descartes.usada++;
    else if (reprovadasGlobais.has(id)) descartes.reprovada++;
    else if (tagsProibidas(hit.tags).length) descartes.tag++;
    else if ((hit.imageWidth ?? 0) < LARGURA || (hit.imageHeight ?? 0) < ALTURA) descartes.pequena++;
    else if (!origemPermitida(hit.largeImageURL) || !origemPermitida(hit.pageURL)) descartes.origem++;
    else {
      escolhida = hit;
      break;
    }
  }
  if (!escolhida) {
    console.error(`${item.patrimonio}: nenhuma foto aceitável para "${item.busca}" (${JSON.stringify(descartes)})`);
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
