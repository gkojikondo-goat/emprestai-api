// Hook PreToolUse (Bash/PowerShell) — spec 009 CA-11 e regra da prática:
// "o agente nunca escreve em produção". Bloqueia, para o agente principal e
// para subagentes:
//   - o envio de fotos ao Storage (enviar.mjs) e qualquer uso da chave service_role;
//   - seed ou migration com URL de banco do Supabase;
//   - `prisma migrate deploy`, `prisma db push`, `prisma migrate reset`;
//   - CLIs que publicam ou mexem em produção (vercel, supabase).
// O que fica liberado: testes, build, seed e migrate contra o banco local do .env.
// Qualquer erro deste script bloqueia (falha fechada).
const fs = require('fs');

function bloquear(motivo) {
  process.stderr.write(
    `[producao-guarda] bloqueado: ${motivo}. Isto é operação de produção: quem executa é a pessoa, ` +
      'no terminal dela (ver docs/operacao-dados-iniciais.md).\n',
  );
  process.exit(2);
}

const REGRAS = [
  [/imagens-equipamentos[\\/]scripts[\\/]enviar(\.mjs)?\b/i, 'envio de fotos ao Storage'],
  [/SERVICE_ROLE|service_role|sb_secret_/i, 'uso da chave service_role'],
  [/\bprisma\b[^\n|;&]*\bmigrate\s+(deploy|reset)\b/i, 'migration fora do fluxo local'],
  [/\bprisma\b[^\n|;&]*\bdb\s+push\b/i, 'prisma db push'],
  [/(^|[\s;&|(])(npx\s+)?vercel(\.cmd|\.exe)?(\s|$)/i, 'CLI da Vercel'],
  [/(^|[\s;&|(])(npx\s+)?supabase(\.exe)?\s+(db|storage|projects|link|secrets|functions)\b/i, 'CLI do Supabase'],
  [/(postgres(ql)?:\/\/[^\s'"]*(supabase\.co|pooler\.supabase\.com))|((DATABASE_URL|DIRECT_URL)\s*=\s*['"]?[^\s'"]*supabase)/i, 'URL de banco do Supabase'],
];

try {
  const entrada = JSON.parse(fs.readFileSync(0, 'utf8'));
  const { tool_name: ferramenta, tool_input: dados = {} } = entrada;
  if (ferramenta !== 'Bash' && ferramenta !== 'PowerShell') process.exit(0);
  let cmd = String(dados.command || '');
  // A mensagem de um git commit é texto, não comando: sai antes da conferência.
  // Só para git commit — `bash -c "npx vercel --prod"` continua bloqueado.
  if (/\bgit\s+commit\b/.test(cmd)) {
    cmd = cmd
      .replace(/<<-?\s*'?(\w+)'?[\s\S]*?\n\1\s*$/m, '')
      .replace(/(-m|--message)\s+("(?:[^"\\]|\\.)*"|'[^']*')/g, '$1 ""');
  }
  for (const [re, motivo] of REGRAS) if (re.test(cmd)) bloquear(motivo);
  process.exit(0);
} catch (erro) {
  bloquear(`erro no hook (${erro.message}); por segurança, nada foi executado`);
}
