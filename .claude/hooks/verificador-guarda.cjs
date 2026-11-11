// Hook PreToolUse do subagente verificador-spec (declarado no frontmatter dele).
// Só roda enquanto o verificador está ativo. Garante, por código, o que o
// prompt do verificador só pede:
//   - Write: só cria arquivo novo em docs/specs/<spec>/verificacao/*.md
//   - Bash: só git de leitura e os comandos listados em rules/checks.md
// Qualquer erro deste script bloqueia (falha fechada).
const fs = require('fs');
const path = require('path');

function bloquear(motivo) {
  process.stderr.write(`[verificador-guarda] bloqueado: ${motivo}\n`);
  process.exit(2);
}

function relativo(raiz, alvo) {
  return path.relative(raiz, path.resolve(raiz, alvo)).split(path.sep).join('/');
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
  const raiz = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
  const { tool_name: ferramenta, tool_input: dados = {} } = entrada;

  if (ferramenta === 'Write') {
    const rel = relativo(raiz, dados.file_path || '');
    if (!/^docs\/specs\/[^/]+\/verificacao\/[^/]+\.md$/.test(rel)) {
      bloquear(`o verificador só grava em docs/specs/<spec>/verificacao/*.md (tentou: ${rel})`);
    }
    if (fs.existsSync(path.resolve(raiz, dados.file_path))) {
      bloquear(`rodada anterior não pode ser sobrescrita (${rel}); use um nome novo`);
    }
    process.exit(0);
  }

  if (ferramenta === 'Bash') {
    const cmd = String(dados.command || '').trim();
    if (PRODUCAO.test(cmd)) bloquear('comando cita endereço de produção');
    if (GIT_LEITURA.test(cmd) && !ENCADEAMENTO.test(cmd)) process.exit(0);
    if (comandosDoChecks(raiz).includes(cmd)) process.exit(0);
    bloquear(
      `"${cmd}" não é git de leitura nem está em rules/checks.md. ` +
        'O verificador só roda o que está listado lá, exatamente como escrito.',
    );
  }

  process.exit(0);
} catch (erro) {
  bloquear(`erro no hook (${erro.message}); por segurança, nada foi executado`);
}
