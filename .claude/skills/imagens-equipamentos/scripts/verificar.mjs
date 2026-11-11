// Confere as fotos contra o contrato (spec 009 CA-07). Sai 1 se houver problema.
//   node .claude/skills/imagens-equipamentos/scripts/verificar.mjs
import { conferirConjunto } from './lib.mjs';

const problemas = conferirConjunto();
if (problemas.length) {
  console.error(`verificar: ${problemas.length} problema(s):\n- ${problemas.join('\n- ')}`);
  process.exit(1);
}
console.log('verificar: ok — todas as fotos 800×600, sem repetição, com crédito completo');
