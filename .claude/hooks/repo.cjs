// Utilitários comuns dos hooks. O repositório é descoberto pelo caminho do
// arquivo (sobe até achar .git), não pela pasta da sessão: assim o hook vale
// também quando o agente opera a partir de outra pasta (ex.: a pasta de docs
// que tem emprestai-api e emprestai-front como vizinhos).
const fs = require('fs');
const path = require('path');

function raizDoRepo(caminho) {
  let dir = path.resolve(caminho);
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) dir = path.dirname(dir);
  while (!fs.existsSync(dir)) dir = path.dirname(dir);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const pai = path.dirname(dir);
    if (pai === dir) return null;
    dir = pai;
  }
}

function relativo(raiz, alvo) {
  return path.relative(raiz, path.resolve(alvo)).split(path.sep).join('/');
}

/** Pasta base para caminhos relativos: a da sessão (ou o cwd do hook). */
function base(entrada) {
  return process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
}

module.exports = { raizDoRepo, relativo, base };
