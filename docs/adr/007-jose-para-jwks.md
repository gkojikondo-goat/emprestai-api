# ADR-007 — `jose` para validar o token do Supabase pela JWKS

**Status:** aceito — decidido pelo agente em 2026-11-10 por delegação do Gabriel
("pode seguir tomando as decisões apropriadas"); **revisar antes da entrega**.
**Complementa:** ADR-001 ("Nest valida o JWT via JWKS do Supabase" — o ADR não
nomeia a biblioteca) e ADR-006 (projeto em CommonJS).

## Contexto

A spec 002 exige validar assinatura, expiração e emissor do token pela JWKS do
Supabase, sem consultar o Supabase a cada request. O projeto do Supabase assina
com chave assimétrica ES256 (a JWKS pública em
`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` tem uma chave EC P-256).
O ADR-001 não lista biblioteca para isso, e `rules/restrictions.md` proíbe
biblioteca fora do ADR-001 sem aprovação. O verificador-spec reprovou a spec 002
por esse motivo na rodada `docs/specs/002-identidade-e-tenant/verificacao/2026-11-10-e956405.md`.

## Decisão

| Item | Escolha |
|---|---|
| Biblioteca | `jose` 5.x |
| Uso | `createRemoteJWKSet` (produção, com cache das chaves) e `jwtVerify` com `issuer` e `audience: 'authenticated'` |
| Versão | 5.x fixada: a 6.x é só ESM e quebraria na Vercel pelo mesmo motivo do ADR-006 |

## Alternativas

- **`@nestjs/jwt` + `jwks-rsa`**: duas bibliotecas fora do ADR-001 em vez de uma; o
  `@nestjs/jwt` foi desenhado para segredo compartilhado e a JWKS entra por um
  callback do `jwks-rsa`.
- **`passport-jwt` + `jwks-rsa`**: acrescenta o Passport inteiro, que o ADR-001
  não prevê, só para uma estratégia.
- **Implementar à mão com `node:crypto`**: buscar a JWKS, cachear, escolher a
  chave pelo `kid`, validar ES256 e as claims. É exatamente o código de segurança
  que não se deve escrever de novo.

## Justificativa

- Uma dependência, sem dependências transitivas, mantida, com suporte nativo a
  JWKS remota com cache, rotação de chave por `kid` e ES256.
- Nos testes, a mesma API aceita `createLocalJWKSet`: o guard é testado com chave
  local sem tocar no Supabase (`test/support/tokens.ts`).

## Consequências

- A versão major fica presa à 5.x enquanto o projeto for CommonJS (ADR-006).
- Atualizar para 6.x exige migrar o projeto para ESM primeiro.
