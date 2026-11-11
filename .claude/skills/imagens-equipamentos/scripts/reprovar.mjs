// Registra a reprovação visual de uma foto e a remove (spec 009 CA-09). Uso:
//   node .claude/skills/imagens-equipamentos/scripts/reprovar.mjs TI-0005 "logo legível na tampa"
// A foto reprovada nunca volta a ser escolhida para nenhum equipamento.
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { caminhos, lerJson } from './lib.mjs';

const [patrimonio, motivo] = process.argv.slice(2);
if (!patrimonio || !motivo) {
  console.error('Uso: reprovar.mjs <patrimônio> "<motivo>"');
  process.exit(1);
}
const c = caminhos();
const creditos = lerJson(c.creditos, {});
const revisao = lerJson(c.revisao, {});
const cr = creditos[patrimonio];
if (!cr) {
  console.error(`${patrimonio}: não há foto com crédito para reprovar.`);
  process.exit(1);
}
(revisao[patrimonio] ??= []).push({
  pixabayId: cr.pixabayId,
  pagina: cr.pagina,
  motivo,
  em: new Date().toISOString(),
});
delete creditos[patrimonio];
const arquivo = path.join(c.pasta, `${patrimonio}.jpg`);
if (existsSync(arquivo)) rmSync(arquivo);
writeFileSync(c.revisao, `${JSON.stringify(revisao, null, 2)}\n`);
writeFileSync(c.creditos, `${JSON.stringify(creditos, null, 2)}\n`);
console.log(`${patrimonio}: foto ${cr.pixabayId} reprovada (${motivo}). Rode preparar.mjs de novo.`);
