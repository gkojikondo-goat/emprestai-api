// Hook PreToolUse do subagente verificador-spec (declarado no frontmatter dele).
// Só roda enquanto o verificador está ativo. Garante, por código, o que o
// prompt do verificador só pede:
//   - Write: só cria arquivo novo em docs/specs/<spec>/verificacao/*.md
//   - Bash: só git de leitura e os comandos listados em rules/checks.md,
//     opcionalmente precedidos de `cd <repositório> &&`
// Qualquer erro deste script bloqueia (falha fechada).
const fs = require('fs');
const path = require('path');
const { raizDoRepo, relativo, base } = require('./repo.cjs');

function bloquear(motivo) {
  process.stderr.write(`[verificador-guarda] bloqueado: ${motivo}\n`);
  process.exit(2);
}

const GIT_LEITURA = /^git (rev-parse|status|log|diff|show)(\s|$)/;
const ENCADEAMENTO = /[;&|><`]|\$\(/;
const PRODUCAO = /supabase\.co|pooler\.supabase\.com|vercel\.app/i;

function comandosDoChecks(raiz) {
  const arq = path.join(raiz, 'rules', 'checks.md');
  if (!fs.existsSync(arq)) return [];
  const texto = fs.readFileSync(arq, 'utf8');
  return [...texto.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim());
}

try {
  const entrada = JSON.parse(fs.readFileSync(0, 'utf8'));
  const pasta = base(entrada);
  const { tool_name: ferramenta, tool_input: dados = {} } = entrada;

  if (ferramenta === 'Write') {
    const alvo = path.resolve(pasta, dados.file_path || '');
    const raiz = raizDoRepo(alvo);
    const rel = raiz ? relativo(raiz, alvo) : alvo;
    if (!raiz || !/^docs\/specs\/[^/]+\/verificacao\/[^/]+\.md$/.test(rel)) {
      bloquear(`o verificador só grava em docs/specs/<spec>/verificacao/*.md (tentou: ${alvo})`);
    }
    if (fs.existsSync(alvo)) {
      bloquear(`rodada anterior não pode ser sobrescrita (${rel}); use um nome novo`);
    }
    process.exit(0);
  }

  if (ferramenta === 'Bash') {
    let cmd = String(dados.command || '').trim();
    if (PRODUCAO.test(cmd)) bloquear('comando cita endereço de produção');
    let dir = pasta;
    const cd = cmd.match(/^cd\s+("([^"]+)"|'([^']+)'|(\S+))\s*&&\s*(.+)$/s);
    if (cd) {
      dir = path.resolve(pasta, cd[2] || cd[3] || cd[4]);
      cmd = cd[5].trim();
    }
    if (ENCADEAMENTO.test(cmd)) bloquear(`"${cmd}" encadeia comandos; rode um por vez`);
    if (GIT_LEITURA.test(cmd)) process.exit(0);
    const raiz = raizDoRepo(dir);
    if (raiz && path.resolve(dir) === raiz && comandosDoChecks(raiz).includes(cmd)) process.exit(0);
    bloquear(
      `"${cmd}" não é git de leitura nem está em rules/checks.md do repositório ` +
        `(${raiz || dir}). O verificador só roda o que está listado lá, exatamente como escrito.`,
    );
  }

  process.exit(0);
} catch (erro) {
  bloquear(`erro no hook (${erro.message}); por segurança, nada foi executado`);
}
