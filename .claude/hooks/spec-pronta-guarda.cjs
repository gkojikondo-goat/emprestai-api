// Hook PreToolUse do projeto (.claude/settings.json). Roda em toda chamada de
// Edit, Write, Bash e PowerShell, do agente principal e de subagentes. Garante:
//   1. Uma spec só passa para "**Implementada:** sim" se existir em
//      docs/specs/<spec>/verificacao/ uma rodada do verificador com
//      "Veredito: PRONTA" para o commit atual (HEAD), sem código alterado
//      fora de docs/specs/ depois dela.
//   2. Só o verificador-spec escreve em docs/specs/<spec>/verificacao/.
// O repositório é o do arquivo editado (repo.cjs). Qualquer erro bloqueia.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { raizDoRepo, relativo, base } = require('./repo.cjs');

const VERIFICADOR = 'verificador-spec';
const MARCA_PRONTA = /\*\*Implementada:\*\*\s*sim/i;

function bloquear(motivo) {
  process.stderr.write(`[spec-pronta-guarda] bloqueado: ${motivo}\n`);
  process.exit(2);
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
  const pasta = base(entrada);
  const { tool_name: ferramenta, tool_input: dados = {}, agent_type: agente } = entrada;
  const ehVerificador = agente === VERIFICADOR;

  if (ferramenta === 'Bash' || ferramenta === 'PowerShell') {
    const cmd = String(dados.command || '').trim();
    // git add/commit/status/log/diff/show são liberados: o agente principal
    // precisa commitar a rodada que o verificador gravou.
    // Leitura (ls, cat, grep, git log...) é livre; só comando que escreve é barrado.
    // Texto entre aspas e corpo de heredoc (ex.: mensagem de commit com
    // "<email>") não é comando: sai antes de procurar redirecionamento.
    const semTexto = cmd
      .replace(/<<-?\s*'?(\w+)'?[\s\S]*?\n\1\s*$/m, '')
      .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
    const semCd = semTexto.replace(/^cd\s+\S+\s*&&\s*/, '');
    const gitSemEscrita =
      /^git (add|commit|status|log|diff|show)\s/.test(semCd) && !/[;|>`]|&&|\$\(/.test(semCd);
    const escreve =
      /(^|[^0-9&])>{1,2}(?!&)|\b(rm|mv|cp|tee|touch|truncate|install|ln)\b|\bsed\b[^|;]*\s-i|\bperl\b[^|;]*\s-i|\b(node|node\.exe|python3?|deno|bun)\b\s+-e|\b(Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|New-Item|Rename-Item|Clear-Content)\b|\bgit\s+(checkout|restore|rm|mv|stash|reset|apply)\b/i.test(
        semTexto,
      );
    if (!ehVerificador && !gitSemEscrita && escreve && /verificacao[\/\\]|Implementada/i.test(cmd)) {
      bloquear('registro do verificador e marca "Implementada" não se alteram por shell');
    }
    process.exit(0);
  }

  if (ferramenta !== 'Edit' && ferramenta !== 'Write') process.exit(0);

  const arquivo = path.resolve(pasta, dados.file_path || '');
  const raiz = raizDoRepo(arquivo);
  if (!raiz) process.exit(0);
  const rel = relativo(raiz, arquivo);

  if (/^docs\/specs\/[^/]+\/verificacao\//.test(rel) && !ehVerificador) {
    bloquear(`só o ${VERIFICADOR} escreve em ${rel}`);
  }

  const spec = rel.match(/^docs\/specs\/([^/]+)\/spec\.md$/);
  if (spec) {
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
