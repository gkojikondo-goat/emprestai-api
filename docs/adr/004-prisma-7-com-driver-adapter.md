# ADR-004 — Prisma 7 com driver adapter

**Status:** aceito
**Complementa:** ADR-001 (Prisma como ORM e dono do schema)
**Substitui:** a linha "Conexão de runtime" do ADR-001, no que diz respeito aos
parâmetros `?pgbouncer=true&connection_limit=1`

## Contexto

O ADR-001 decidiu Prisma, Prisma Migrate como único dono do schema e conexão de
runtime pelo Supavisor (porta 6543) com `?pgbouncer=true&connection_limit=1`.
A versão estável atual do Prisma é a 7. Nela o client não acessa o Postgres
sozinho: exige um driver adapter, e a URL usada pela CLI do Prisma passa a ficar
em `prisma.config.ts`. Os parâmetros de URL do ADR-001 eram da versão anterior.

## Decisão

| Item | Escolha |
|---|---|
| Versão do Prisma | 7.10.1, CLI (`prisma`) e client (`@prisma/client`) na mesma versão |
| Driver adapter | `@prisma/adapter-pg`, com o driver `pg` |
| Limite de conexões de runtime | `max: 1` na configuração do adapter, por instância |
| Conexão de migration | `DIRECT_URL`, lida em `prisma.config.ts` (continua como no ADR-001) |
| Client gerado | em `src/generated/prisma/`, fora do git, gerado por `prisma generate` |

## Justificativa

- Prisma 7 em vez de manter a versão anterior: é a versão estável atual, e o client
  é JavaScript puro, sem o binário do engine que a versão anterior exigiria incluir
  no pacote da função da Vercel.
- `@prisma/adapter-pg` e `pg`: o Prisma 7 não conecta ao Postgres sem um adapter, e
  esse é o adapter oficial para Postgres.
- `max: 1`: preserva a intenção do ADR-001 (uma conexão por instância em serverless);
  só muda o lugar onde o limite é configurado.
- Client fora do git: é código gerado a partir do schema, e versioná-lo criaria
  dois lugares com a mesma informação.

## Alternativas descartadas

- Prisma 6 — descartada porque o binário do engine precisaria ser incluído no pacote
  da função da Vercel, e é a versão anterior. Se o adapter mostrar problemas com o
  pooler do Supabase no deploy (AZ-09), este ADR deve ser revisto.
- Prisma Accelerate — descartada porque é um serviço pago e externo, sem necessidade
  neste escopo.

## Consequências

- O que fica mais fácil: empacotar a função da Vercel, que não carrega binário do engine.
- O que fica mais difícil: o comportamento do `pg` com o Supavisor em modo transaction
  ainda não foi verificado neste projeto; só o deploy (AZ-09) prova.
- O que isso impede de fazer depois sem custo: voltar à versão anterior do Prisma
  exige remover o adapter e reescrever a configuração da conexão.

## O que este ADR NÃO decide

- Modelagem de domínio.
- Estratégia de pool além de `max: 1`.
- Uso de `pg` diretamente fora do Prisma.
