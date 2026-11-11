import { spawnSync } from 'node:child_process';
import path from 'node:path';

const HOOK = path.resolve(__dirname, '../../.claude/hooks/producao-guarda.cjs');

function hook(command: string, tool = 'Bash') {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: tool, tool_input: { command } }),
    encoding: 'utf8',
  });
  return { codigo: r.status, saida: r.stderr };
}

describe('009 · hook producao-guarda', () => {
  it.each([
    ['node .claude/skills/imagens-equipamentos/scripts/enviar.mjs', 'envio de fotos'],
    ['SUPABASE_SERVICE_ROLE_KEY=x node qualquer.mjs', 'service_role'],
    ['DATABASE_URL=postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:5432/postgres npm run seed', 'URL de banco do Supabase'],
    ['npx prisma migrate deploy', 'migration'],
    ['npx prisma db push', 'db push'],
    ['npx vercel --prod', 'Vercel'],
    ['supabase storage cp x.jpg ss:///equipamentos', 'Supabase'],
  ])('[009 CA-11] bloqueia: %s', (comando, motivo) => {
    const r = hook(comando);
    expect(r.codigo).toBe(2);
    expect(r.saida).toMatch(new RegExp(motivo, 'i'));
  });

  it('[009 CA-11] comando escondido entre aspas continua bloqueado', () => {
    expect(hook('bash -c "npx vercel --prod"').codigo).toBe(2);
  });

  it('mensagem de commit que cita Vercel ou a chave de serviço não bloqueia o commit', () => {
    expect(hook('git commit -q -m "bloqueia as CLIs da Vercel e do Supabase e a SERVICE_ROLE"').codigo).toBe(0);
    expect(
      hook("git commit -q -F - <<'EOF'\nhook barra Vercel e supabase storage\nEOF").codigo,
    ).toBe(0);
    expect(hook('git commit -m "x" && npx vercel --prod').codigo).toBe(2);
  });

  it('[009 CA-11] bloqueia também pelo PowerShell', () => {
    expect(hook('$env:SUPABASE_SERVICE_ROLE_KEY="x"; node enviar.mjs', 'PowerShell').codigo).toBe(2);
  });

  it.each([
    'npm test',
    'npm run seed',
    'npx prisma migrate dev',
    'node .claude/skills/imagens-equipamentos/scripts/preparar.mjs',
    'node .claude/skills/imagens-equipamentos/scripts/verificar.mjs',
    'git status',
  ])('libera o fluxo local: %s', (comando) => {
    expect(hook(comando).codigo).toBe(0);
  });

  it('falha fechado com entrada inválida', () => {
    const r = spawnSync(process.execPath, [HOOK], { input: 'nao-e-json', encoding: 'utf8' });
    expect(r.status).toBe(2);
  });
});
