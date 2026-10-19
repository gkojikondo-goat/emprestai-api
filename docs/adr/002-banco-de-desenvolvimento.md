# ADR-002 — Banco de desenvolvimento

**Status:** aceito
**Complementa:** ADR-001 (não o contradiz; o ADR-001 não decidia de onde sai o banco de desenvolvimento)

## Contexto

O ADR-001 fixa PostgreSQL gerenciado pelo Supabase, Prisma Migrate como único dono do schema e Testcontainers com Postgres real nos testes. Ele não diz onde a pessoa que desenvolve roda o banco no dia a dia. O Docker já é pré-requisito dos testes (Testcontainers).

## Decisão

| Item | Escolha |
|---|---|
| Banco de desenvolvimento local | Postgres em container Docker, subido por Docker Compose |
| Banco dos testes | Postgres em container via Testcontainers (ADR-001), separado do de desenvolvimento |
| Banco publicado | Projeto Supabase, acessado só por deploy; nunca por desenvolvimento ou teste |
| Aplicação das migrations | Prisma Migrate: `migrate dev` no banco local; `migrate deploy` no Supabase, pelo job do GitHub Actions (ADR-001) |

## Justificativa

- Postgres em Docker: o Docker já é exigido pelos testes; reaproveitá-lo evita uma segunda ferramenta só para subir banco.
- Banco de dev separado do Supabase: o projeto Supabase atende o deploy da Vercel, então é produção. Desenvolver nele deixaria um erro de migration ou de seed na mesma base que o site publicado usa.
- Prisma Migrate no local e no Supabase: mantém o Prisma como único dono do schema (ADR-001); a CLI do Supabase não entra.

## Alternativas descartadas

- Supabase local pela CLI do Supabase — descartada porque traria uma segunda ferramenta de banco ao lado do Prisma Migrate, e o ADR-001 já decidiu que não há dois donos de schema. Se o projeto passar a depender de recursos do Supabase que um Postgres comum não tem (Auth local, Storage), este ADR deve ser revisto.
- Usar o projeto Supabase como banco de desenvolvimento — descartada porque ele é o mesmo banco do site publicado.
- Dois projetos Supabase (dev e produção) — descartada por ora: o plano gratuito limita projetos ativos e dobra a configuração, sem necessidade de um terceiro ambiente neste escopo.

## Consequências

- O que fica mais fácil: subir o banco do zero com um comando; resetar o banco sem tocar em nada publicado; rodar testes de integração sem rede.
- O que fica mais difícil: o Postgres local é o Postgres puro, sem os schemas e extensões do Supabase (`auth`, `storage`). Qualquer SQL que dependa deles só poderá ser exercitado no Supabase.
- O que isso impede de fazer depois sem custo: testar localmente políticas de RLS que referenciem funções do Supabase, como `auth.uid()`.

## O que este ADR NÃO decide

- A região do projeto Supabase.
- Estratégia de backup do banco publicado.
- Dados de seed além do que o ADR-001 já define.
- Ambiente de preview ou de homologação.
