# Plano — 002 Identidade e tenant

Deriva de docs/specs/002-identidade-e-tenant/spec.md.

## Restrições que este plano obedece

- docs/adr/001-stack.md — NestJS, Prisma, Zod via `nestjs-zod`, CASL, JWKS, RLS, orval.
- docs/adr/004 e 005 da API — Prisma 7 com adapter pg; sem adapter serverless na Vercel.
- rules/restrictions.md — uma tarefa por vez; biblioteca fora do ADR-001 só com aprovação.

## Bibliotecas novas (todas previstas no ADR-001)

- API: `jose` para validar o JWT pela JWKS (**não está no ADR-001: precisa de aprovação**;
  alternativa: `@nestjs/jwt` + `jwks-rsa`), `@casl/ability`, `nestjs-zod`, `zod`.
- Front: `orval`, `@tanstack/react-query`.

## Modelo de dados proposto (P13 — aguardando aprovação)

```
tenants      (id uuid pk, slug text unique, nome text, criado_em timestamptz)
memberships  (id uuid pk, user_id uuid, tenant_id uuid fk, papel text check in
              ('colaborador','operacoes'), nome text, unique (user_id, tenant_id))
```

`user_id` é o `sub` do Supabase Auth (não há FK para o schema `auth`). RLS ligado nas duas, sem policy.

## Organização de pastas proposta (API)

```
src/
  common/
    request-context.ts         AsyncLocalStorage { tenantId, userId, papel }
  modules/
    auth/
      jwt-auth.guard.ts        valida JWT (JWKS), confere membership, preenche o contexto
      auth.module.ts
    me/
      me.controller.ts         GET /v1/me
      me.service.ts
      me.schemas.ts            Zod -> OpenAPI
prisma/
  seed.ts                      tenant suporte_ti, idempotente (upsert)
  migrations/<ts>_tenants_memberships/   tabelas + RLS em SQL bruto
docs/
  provisionamento.md           passo a passo manual: criar usuário, app_metadata, membership
```

Front: `src/lib/api/` recebe o cliente gerado; `src/features/auth/useMe.ts` consulta `/v1/me`.

## Como cada parte será feita

- Guard global com decorator `@Public()` para o health (CA-10). Falha de assinatura/expiração = 401;
  token ok mas sem tenant ou sem membership = 403 (CA-01 a CA-06).
- Contexto: o guard abre `AsyncLocalStorage.run(...)` para o restante do request (CA-07).
- Migration cria tabelas e executa `ENABLE ROW LEVEL SECURITY` (CA-08); teste de integração em
  Testcontainers com role sem bypass.
- Seed com `upsert` por `slug` (CA-09).
- Problem Details já existe (`problem-details.filter.ts`); 401/403 reaproveitam.
- Log: pino com `request_id` e `tenant_id` vindos do contexto (CA-11).
- Front: orval gera o cliente; um `fetcher` customizado anexa o token do `supabase-js`; 401 chama
  `signOut` (CA-12 a CA-14). Script `gen:api` e checagem no CI (CA-15).

## Testes

Jest + supertest para CA-01 a CA-07 e CA-10; Testcontainers para CA-08 e CA-09; Vitest para o hook e
o tratamento de 401/403 no front; teste de isolamento do `/v1/me` (CA-06).
