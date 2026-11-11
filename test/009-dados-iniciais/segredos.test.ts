import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Spec 009 CA-06: nenhum arquivo versionado — nem no histórico — contém a senha
 * da turma ou uma chave service_role do Supabase. A senha não aparece aqui em
 * texto: o teste guarda só o SHA-256 dela e compara com cada palavra.
 */
const SHA256_SENHA_DA_TURMA = 'f96c10b7b6fc75ba2860671efc04ce1aa277e18c4dfa514b29dcbc48795310ef';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function encontrarSegredos(texto: string, hashesProibidos: string[]): string[] {
  const achados: string[] = [];
  for (const palavra of new Set(texto.match(/[A-Za-z0-9_@.!#$%-]{6,64}/g) ?? [])) {
    if (hashesProibidos.includes(sha256(palavra))) achados.push('senha proibida');
  }
  for (const jwt of texto.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) ?? []) {
    try {
      const corpo = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString('utf8'));
      if (corpo.role === 'service_role') achados.push('JWT service_role');
    } catch {
      // não é JWT de verdade
    }
  }
  if (/\bsb_secret_[A-Za-z0-9_-]{10,}/.test(texto)) achados.push('chave secreta sb_secret_');
  return achados;
}

const raiz = path.resolve(__dirname, '..', '..');
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

describe('009 · segredos fora do repositório', () => {
  it('[009 CA-06] o detector acha senha (pelo hash), JWT service_role e sb_secret_', () => {
    const jwt = (role: string) =>
      [
        Buffer.from('{"alg":"HS256"}').toString('base64url'),
        Buffer.from(JSON.stringify({ role, iss: 'supabase' })).toString('base64url'),
        'assinatura',
      ].join('.');
    // Amostra falsa montada por partes: o literal não aparece neste arquivo.
    const chaveFalsa = ['sb', 'secret', 'abcdefghijk12'].join('_');
    const texto = `senha=SenhaFalsa123 key=${jwt('service_role')} anon=${jwt('anon')} ${chaveFalsa}`;
    expect(encontrarSegredos(texto, [sha256('SenhaFalsa123')]).sort()).toEqual(
      ['JWT service_role', 'chave secreta sb_secret_', 'senha proibida'].sort(),
    );
    expect(encontrarSegredos(`anon=${jwt('anon')} texto comum`, [sha256('SenhaFalsa123')])).toEqual([]);
  });

  it('[009 CA-06] nenhum arquivo versionado, em nenhum commit, tem a senha da turma ou chave service_role', () => {
    // O próprio arquivo do detector é ignorado: ele contém amostras falsas
    // (uma versão antiga, já no histórico, tinha a amostra por extenso).
    const DETECTOR = 'test/009-dados-iniciais/segredos.test.ts';
    const objetos = git('rev-list', '--objects', '--all')
      .split('\n')
      .filter((l) => l && !l.endsWith(` ${DETECTOR}`))
      .map((l) => l.split(' ')[0]);
    const tipos = execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
      cwd: raiz,
      input: objetos.join('\n'),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const blobs = tipos
      .split('\n')
      .filter((l) => l.endsWith(' blob'))
      .map((l) => l.split(' ')[0] as string);
    const achados: string[] = [];
    for (const blob of blobs) {
      const conteudo = git('cat-file', '-p', blob);
      if (conteudo.includes('\u0000')) continue; // binário (fotos)
      for (const a of encontrarSegredos(conteudo, [SHA256_SENHA_DA_TURMA])) achados.push(`${blob}: ${a}`);
    }
    expect(achados).toEqual([]);
  }, 120_000);
});
