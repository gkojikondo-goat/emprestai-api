// Regras puras da skill imagens-equipamentos (spec 009, regra 6).
// Usadas por preparar, verificar e enviar: a mesma conferência em todo lugar.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const LARGURA = 800;
export const ALTURA = 600;
export const LICENCA = 'Pixabay Content License';

/** Raiz do repositório (ou a de teste, via SKILL_RAIZ). */
export function raiz() {
  return path.resolve(process.env.SKILL_RAIZ ?? path.join(import.meta.dirname, '..', '..', '..', '..'));
}

export const caminhos = () => {
  const r = raiz();
  const pasta = path.join(r, 'imagens', 'equipamentos');
  return {
    raiz: r,
    lista: path.join(r, 'prisma', 'dados', 'equipamentos.json'),
    pasta,
    creditos: path.join(pasta, 'creditos.json'),
    revisao: path.join(pasta, 'revisao.json'),
    cache: path.join(r, '.cache', 'pixabay'),
  };
};

export function lerJson(arquivo, padrao) {
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8')) : padrao;
}

const LOCAL = /^http:\/\/127\.0\.0\.1:\d+$/;

/**
 * Fonte única: a API do Pixabay. PIXABAY_API_BASE só é aceito apontando para
 * 127.0.0.1 (servidor falso dos testes); qualquer outro valor é recusado.
 */
export function baseApi() {
  const base = process.env.PIXABAY_API_BASE;
  if (!base) return 'https://pixabay.com/api/';
  if (LOCAL.test(base.replace(/\/+$/, ''))) return `${base.replace(/\/+$/, '')}/api/`;
  throw new Error(`PIXABAY_API_BASE recusado (${base}): a única fonte é a API do Pixabay.`);
}

/** Download só de domínios do Pixabay (ou do servidor falso local nos testes). */
export function origemPermitida(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol === 'https:' && (u.hostname === 'pixabay.com' || u.hostname.endsWith('.pixabay.com'))) {
    return true;
  }
  const base = process.env.PIXABAY_API_BASE;
  return Boolean(base && LOCAL.test(base.replace(/\/+$/, '')) && url.startsWith(base.replace(/\/+$/, '') + '/'));
}

/** Direito de imagem: tags que indicam pessoa, marca/logo, texto ou tela com conteúdo. */
const PROIBIDAS = [
  /\b(person|people|persons|man|men|woman|women|girl|girls|boy|boys|child|children|kid|kids|baby|human|face|faces|portrait|hand|hands|finger|fingers|businessman|businesswoman|student|worker|user|selfie|model)\b/,
  // Lista ampliada depois da 1ª revisão visual (Olympus, Fujifilm, ThinkPad, GoPro passaram pelas tags).
  /\b(logo|brand|trademark|apple|macbook|imac|iphone|ipad|samsung|dell|lenovo|thinkpad|asus|acer|sony|canon|nikon|olympus|fujifilm|fuji|gopro|panasonic|leica|microsoft|windows|google|logitech|hp|lg|philips|twitter)\b/,
  /\b(text|word|words|letter|letters|sign|quote|typography|code|coding|programming|programmer|website|web design|social media|facebook|instagram|youtube|twitter|chart|graph|dashboard|email)\b/,
];

export function tagsProibidas(tags) {
  const lista = String(tags ?? '')
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return lista.filter((t) => PROIBIDAS.some((re) => re.test(t)));
}

/** Largura e altura lidas do cabeçalho JPEG (marcador SOF). null se não for JPEG. */
export function dimensoesJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marcador = buf[i + 1];
    const tamanho = buf.readUInt16BE(i + 2);
    const ehSof = marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);
    if (ehSof) return { largura: buf.readUInt16BE(i + 7), altura: buf.readUInt16BE(i + 5) };
    i += 2 + tamanho;
  }
  return null;
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** sharp → 800×600, recorte 4:3 pelo ponto de interesse, JPEG 82 sem metadados. */
export async function padronizar(buf) {
  const { default: sharp } = await import('sharp');
  return sharp(buf)
    .rotate()
    .resize(LARGURA, ALTURA, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

const CAMPOS_CREDITO = ['pixabayId', 'pagina', 'autor', 'autorUrl', 'licenca', 'baixadoEm', 'sha256'];

/**
 * Conferência do conjunto contra o contrato. Devolve a lista de problemas
 * (vazia = conforme). Usada por verificar.mjs e, antes de enviar, por enviar.mjs.
 */
export function conferirConjunto() {
  const c = caminhos();
  const itens = lerJson(c.lista, []);
  const creditos = lerJson(c.creditos, {});
  const problemas = [];
  const ids = new Map();
  const hashes = new Map();
  for (const { patrimonio } of itens) {
    const arquivo = path.join(c.pasta, `${patrimonio}.jpg`);
    const cr = creditos[patrimonio];
    if (!existsSync(arquivo)) {
      problemas.push(`${patrimonio}: foto ausente`);
      continue;
    }
    const buf = readFileSync(arquivo);
    const d = dimensoesJpeg(buf);
    if (!d) problemas.push(`${patrimonio}: não é JPEG`);
    else if (d.largura !== LARGURA || d.altura !== ALTURA) {
      problemas.push(`${patrimonio}: ${d.largura}×${d.altura}, esperado ${LARGURA}×${ALTURA}`);
    }
    if (!cr) {
      problemas.push(`${patrimonio}: sem crédito em creditos.json`);
      continue;
    }
    for (const campo of CAMPOS_CREDITO) if (!cr[campo]) problemas.push(`${patrimonio}: crédito sem ${campo}`);
    if (cr.licenca && cr.licenca !== LICENCA) problemas.push(`${patrimonio}: licença inesperada (${cr.licenca})`);
    if (cr.pagina && !origemPermitida(cr.pagina)) problemas.push(`${patrimonio}: página fora do Pixabay`);
    const h = sha256(buf);
    if (cr.sha256 && cr.sha256 !== h) problemas.push(`${patrimonio}: arquivo mudou depois do crédito`);
    if (ids.has(cr.pixabayId)) problemas.push(`${patrimonio}: mesma foto (id ${cr.pixabayId}) que ${ids.get(cr.pixabayId)}`);
    ids.set(cr.pixabayId, patrimonio);
    if (hashes.has(h)) problemas.push(`${patrimonio}: conteúdo idêntico ao de ${hashes.get(h)}`);
    hashes.set(h, patrimonio);
  }
  for (const p of Object.keys(creditos)) {
    if (!itens.some((i) => i.patrimonio === p)) problemas.push(`${p}: crédito de patrimônio fora da lista`);
  }
  return problemas;
}
