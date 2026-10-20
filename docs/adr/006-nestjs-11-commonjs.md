# ADR-006 — NestJS na versão 11 (CommonJS)

**Status:** aceito
**Complementa:** ADR-001 (NestJS como framework; o ADR não fixava a versão major)

## Contexto

No primeiro deploy na Vercel, a função falhou ao iniciar com
`ERR_REQUIRE_ESM: require() of ES Module .../@nestjs/core/index.js from .../src/main.js`
(todas as requisições, inclusive `/`, responderam 500). Os pacotes do NestJS 12
(`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) são publicados somente
como ESM (`"type": "module"`), e o projeto compila para CommonJS. Localmente funcionava
porque o Node 24 permite `require()` de módulos ESM; o ambiente da Vercel não.

## Decisão

| Item | Escolha |
|---|---|
| Versão do NestJS | 11.x (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) |
| Versão do Nest CLI | 11.x |
| Formato de módulos do projeto | CommonJS, como já estava |
| `incremental` no tsconfig | Desligado (cache de build deixava arquivos sem emitir após o CLI limpar `dist/`) |

## Justificativa

- NestJS 11: é a linha CommonJS; mantém o build, o Prisma e o restante do projeto como
  estão, sem reescrever imports nem a configuração de módulos.
- Reprodução do problema: o servidor foi iniciado localmente com
  `node --no-experimental-require-module`, que reproduz a restrição da Vercel, e
  respondeu 200 em `/v1/health`.

## Alternativas descartadas

- Manter o NestJS 12 e converter o projeto para ESM (`"type": "module"`, extensões `.js`
  nos imports, cliente do Prisma em ESM) — descartada por ora porque muda o build inteiro
  e o ecossistema do ADR-001 (`nestjs-zod`, Jest) precisa de verificação com o Nest 12 e ESM.
  Este ADR deve ser revisto quando o ecossistema do ADR-001 tiver suporte confirmado ao
  NestJS 12.

## Consequências

- O que fica mais fácil: Jest, `nestjs-zod` e as demais bibliotecas do ADR-001 seguem a
  linha onde o ecossistema está.
- O que fica mais difícil: o NestJS 11 é a linha anterior; correções e novidades vão
  primeiro para a 12.
- O que isso impede de fazer depois sem custo: migrar para o NestJS 12 exige converter o
  projeto para ESM.

## O que este ADR NÃO decide

- A data da migração para o NestJS 12.
- O formato de módulos de bibliotecas de terceiros.
