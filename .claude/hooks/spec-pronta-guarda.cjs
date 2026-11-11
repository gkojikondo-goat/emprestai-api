// Hook PreToolUse do projeto (.claude/settings.json). Roda em toda chamada de
// Edit, Write, Bash e PowerShell, do agente principal e de subagentes. Garante:
//   1. Uma spec só passa para "**Implementada:** sim" se existir em
//      docs/specs/<spec>/verificacao/ uma rodada do verificador com
//      "Veredito: PRONTA" para o commit atual (HEAD), sem código alterado
//      fora de docs/specs/ depois dela.
//   2. Só o verificador-spec escreve em docs/specs/<spec>/verificacao/.
// Qualquer erro deste script bloqueia (falha fechada).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VERIFICADOR = 'verificador-spec';
const MARCA_PRONTA = /\*\*Implementada:\*\*\s*sim/i;

function bloquear(motivo) {
  process.stderr.write(`[spec-pronta-guarda] bloqueado: ${motivo}\n`);
  process.exit(2);
}

function relativo(raiz, alvo) {
  return path.relative(raiz, path.resolve(raiz, alvo)).split(path.sep).join('/');
}

function git(raiz, ...args) {
  return execFileSync('git', args, { cwd: raiz, encoding: 'utf8' }).trim();
}

function conteudoDepois(arquivo, ferramenta, dados) {
  if (ferramenta === 'Write') return String(dados.content || '');
  const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
  const velho = String(dados.old_string || '');
  const novo = String(dados.new_string || '');
  return dados.replace_all ? atual.split(velho).join(novo) : atual.replace(velho, novo);
}

function vereditoValido(raiz, spec) {
  const pasta = path.join(raiz, 'docs', 'specs', spec, 'verificacao');
  if (!fs.existsSync(pasta)) {
    return `não existe nenhuma rodada do verificador em docs/specs/${spec}/verificacao/`;
  }
  const head = git(raiz, 'rev-parse', 'HEAD');
  const rodadas = fs.readdirSync(pasta).filter((n) => n.endsWith('.md'));
  const doHead = rodadas
    .map((n) => fs.readFileSync(path.join(pasta, n), 'utf8'))
    .filter((t) => {
      const m = t.match(/^Commit verificado:\s*([0-9a-f]{7,40})/m);
      return m && head.startsWith(m[1]);
    });
  if (doHead.length === 0) {
    return `nenhuma rodada do verificador é do commit atual (${head.slice(0, 7)}); rode o verificador de novo`;
  }
  if (!doHead.some((t) => /^Veredito:\s*PRONTA\b/m.test(t))) {
    return `a rodada do commit ${head.slice(0, 7)} não tem "Veredito: PRONTA"`;
  }
  const sujos = git(raiz, 'status', '--porcelain')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/"/g, ''))
    .filter((p) => !p.startsWith('docs/specs/'));
  if (sujos.length > 0) {
    return `há alteração não commitada depois da verificação: ${sujos.join(', ')}`;
  }
  return null;
}

try {
  const entrada = JSON.parse(fs.readFileSync(0, 'utf8'));
  const raiz = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
  const { tool_name: ferramenta, tool_input: dados = {}, agent_type: agente } = entrada;
  const ehVerificador = agente === VERIFICADOR;

  if (ferramenta === 'Bash' || ferramenta === 'PowerShell') {
    const cmd = String(dados.command || '').trim();
    // git add/commit/status/log/diff/show são liberados: o agente principal
    // precisa commitar a rodada que o verificador gravou.
    const gitSemEscrita = /^git (add|commit|status|log|diff|show)\s/.test(cmd) && !/[;|>`]|&&|\$\(/.test(cmd);
    if (!ehVerificador && !gitSemEscrita && /verificacao[\/\\]|Implementada/i.test(cmd)) {
      bloquear('registro do verificador e marca "Implementada" não se alteram por shell');
    }
    process.exit(0);
  }

  if (ferramenta !== 'Edit' && ferramenta !== 'Write') process.exit(0);

  const rel = relativo(raiz, dados.file_path || '');

  if (/^docs\/specs\/[^/]+\/verificacao\//.test(rel) && !ehVerificador) {
    bloquear(`só o ${VERIFICADOR} escreve em ${rel}`);
  }

  const spec = rel.match(/^docs\/specs\/([^/]+)\/spec\.md$/);
  if (spec) {
    const arquivo = path.resolve(raiz, dados.file_path);
    const antes = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
    const depois = conteudoDepois(arquivo, ferramenta, dados);
    if (!MARCA_PRONTA.test(antes) && MARCA_PRONTA.test(depois)) {
      const problema = vereditoValido(raiz, spec[1]);
      if (problema) bloquear(`spec ${spec[1]} não pode ser marcada como implementada: ${problema}`);
    }
  }

  process.exit(0);
} catch (erro) {
  bloquear(`erro no hook (${erro.message}); por segurança, nada foi executado`);
}
