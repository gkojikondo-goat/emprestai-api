# ADR-005 — NestJS sem adapter serverless na Vercel

**Status:** aceito
**Substitui:** a linha "Backend — Adapter HTTP" do ADR-001
(`Express via @vendia/serverless-express, com instância cacheada`)

## Contexto

O ADR-001 previa o adapter `@vendia/serverless-express` porque "na Vercel o Nest
não roda como processo; sem guardar a aplicação criada fora do handler, cada request
paga o bootstrap do container de DI". A documentação atual da Vercel para NestJS
(https://vercel.com/docs/frameworks/backend/nestjs, atualizada em 2026-08-10) descreve
outro cenário: a Vercel detecta o `src/main.ts`, executa o `app.listen(...)` e trata o
app inteiro como uma única função com Fluid compute, que reaproveita instâncias entre
requisições. Não há build command nem `vercel.json` necessários.

## Decisão

| Item | Escolha |
|---|---|
| Adapter HTTP na Vercel | Nenhum; o `src/main.ts` com `app.listen(PORT)` é o entrypoint |
| `@vendia/serverless-express` | Não é instalado |
| `vercel.json` | Não existe, até haver necessidade (por exemplo, tarefa agendada) |
| Execução local | `npm run start`, como já é; `vercel dev` fica opcional |

## Justificativa

- Sem adapter: a premissa do ADR-001 (o Nest não roda como processo) não vale mais
  segundo a documentação da Vercel, e o reaproveitamento da instância passa a ser
  feito pela plataforma.
- Menos uma dependência e um arquivo de handler a manter.

## Alternativas descartadas

- Manter `@vendia/serverless-express` com handler em `api/index.ts` — descartada porque
  adiciona uma biblioteca e um arquivo para resolver um problema que a plataforma
  já resolve. Se o deploy mostrar cold start inaceitável ou comportamento diferente
  do local, este ADR deve ser revisto.

## Consequências

- O que fica mais fácil: o deploy usa o mesmo entrypoint do desenvolvimento local.
- O que fica mais difícil: o empacotamento (build próprio da Vercel, cliente do Prisma
  gerado, arquivos WASM do Prisma 7) só é provado no deploy (AZ-09).
- O que isso impede de fazer depois sem custo: trocar de hospedagem exige conferir
  se ela também executa o `app.listen`.

## O que este ADR NÃO decide

- Região das functions.
- Tarefas agendadas (cron).
- Limites de tamanho do pacote da função.
