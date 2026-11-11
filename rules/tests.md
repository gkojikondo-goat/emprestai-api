# Testes

## Todo CA [back] tem teste que o cita

- O título do teste começa com o número da spec e o ID do CA entre
  colchetes: `it('[006 CA-04] com 3 em aberto responde 422 limite-de-itens', ...)`.
  O número da spec é obrigatório porque todas as specs têm um CA-01.
- Um teste pode citar mais de um CA: `[006 CA-07][006 CA-09]`.
- CA sem teste com essa marca é SEM TESTE para o verificador-spec, mesmo que
  o código pareça certo.

## Onde fica cada tipo

| Tipo | Ferramenta | Onde |
|---|---|---|
| Unidade (regra pura, sem banco) | Jest | `src/**/*.spec.ts`, ao lado do arquivo |
| API (rota, guard, pipe, filtro de erro) | Jest + supertest | `test/<spec>/*.test.ts` |
| Banco (constraint, RLS, transação, concorrência) | Jest + Testcontainers | `test/<spec>/*.test.ts` |

## Banco

- Teste que precisa de banco usa `subirBanco()` de `test/support/banco.ts`:
  Postgres descartável com as migrations aplicadas. Nunca `DATABASE_URL` do
  `.env`, nunca o banco do Supabase.
- Prisma mockado não prova CA de banco (ADR-001).

## Obrigatórios por endpoint (ADR-001)

- Isolamento: tenant A não enxerga nem altera dado do tenant B.
- Sem token: 401.

## Token nos testes

Testes não usam o Supabase. Geram um par de chaves ES256 local
(`test/support/tokens.ts`) e injetam a JWKS local no guard; o formato das
claims é o mesmo do Supabase (`sub`, `email`, `app_metadata.tenant_id`).
