// Envia as fotos ao bucket público `equipamentos` do Supabase Storage (spec 009 CA-10).
// SÓ A PESSOA RODA ESTE SCRIPT, no terminal dela:
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node .claude/skills/imagens-equipamentos/scripts/enviar.mjs
// Não lê .env de propósito: a chave service_role nunca fica em arquivo do repositório.
// O hook producao-guarda bloqueia o agente de rodá-lo.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ALTURA, caminhos, conferirConjunto, dimensoesJpeg, LARGURA, lerJson } from './lib.mjs';

const BUCKET = 'equipamentos';
const base = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!chave) {
  console.error('SUPABASE_SERVICE_ROLE_KEY ausente: exporte no seu terminal (nunca em arquivo do repositório).');
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base) && !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) {
  console.error(`SUPABASE_URL inválida (${base || 'ausente'}): use https://<ref>.supabase.co`);
  process.exit(1);
}

// Mesma conferência do verificar: nada fora do contrato sai daqui.
const problemas = conferirConjunto();
if (problemas.length) {
  console.error(`enviar: recusado, ${problemas.length} problema(s):\n- ${problemas.join('\n- ')}`);
  process.exit(1);
}

const auth = { Authorization: `Bearer ${chave}`, apikey: chave };

async function garantirBucket() {
  const r = await fetch(`${base}/storage/v1/bucket/${BUCKET}`, { headers: auth });
  if (r.ok) {
    const b = await r.json();
    if (!b.public) throw new Error(`o bucket ${BUCKET} existe mas não é público`);
    return 'existente';
  }
  const criar = await fetch(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!criar.ok) throw new Error(`criar bucket: ${criar.status} ${await criar.text()}`);
  return 'criado';
}

const c = caminhos();
const itens = lerJson(c.lista, []);
console.log(`bucket ${BUCKET}: ${await garantirBucket()}`);
for (const { patrimonio } of itens) {
  const nome = `${patrimonio}.jpg`;
  const buf = readFileSync(path.join(c.pasta, nome));
  const d = dimensoesJpeg(buf);
  if (!d || d.largura !== LARGURA || d.altura !== ALTURA) throw new Error(`${nome}: fora de ${LARGURA}×${ALTURA}`);
  // Caminho fixo + upsert: repetir o envio substitui, não duplica.
  const r = await fetch(`${base}/storage/v1/object/${BUCKET}/${nome}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=3600' },
    body: buf,
  });
  if (!r.ok) throw new Error(`${nome}: ${r.status} ${await r.text()}`);
  console.log(`${nome}: enviado`);
}
console.log(`enviar: ${itens.length} fotos no bucket público ${BUCKET}`);
