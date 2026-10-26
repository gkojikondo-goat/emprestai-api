# Tarefas — 002 Identidade e tenant

Uma tarefa por vez, um commit por tarefa. T1 a T7 são da API; T8 a T10 são do front.

- [ ] T1 · Migration `tenants` e `memberships` com RLS em SQL bruto
      atende: CA-08
      verifico assim: teste de integração com Postgres real; role sem bypass lê zero linhas

- [ ] T2 · Seed idempotente do tenant `suporte_ti`
      atende: CA-09
      verifico assim: rodar o seed duas vezes; `select count(*) from tenants` dá 1

- [ ] T3 · Contexto de request com `AsyncLocalStorage`
      atende: CA-07
      verifico assim: teste com dois requests concorrentes de tenants diferentes não se misturam

- [ ] T4 · Guard JWT (JWKS), `@Public()` no health e variáveis de ambiente validadas
      atende: CA-01, CA-02, CA-10
      verifico assim: supertest sem token, com token adulterado e expirado dá 401; health dá 200

- [ ] T5 · Resolução do tenant pela claim e conferência do `memberships`
      atende: CA-04, CA-05, CA-06
      verifico assim: supertest cobre sem claim, sem vínculo, tenant trocado por header/body/query

- [ ] T6 · `GET /v1/me` e `docs/provisionamento.md`
      atende: CA-03, CA-11
      verifico assim: supertest com token válido devolve os campos; log mostra `request_id` e `tenant_id`

- [ ] T7 · `openapi.json` gerado dos schemas Zod e publicado como artefato do CI
      atende: CA-15 (lado API)
      verifico assim: o arquivo existe no artefato e lista `/v1/me`

- [ ] T8 · Cliente orval, fetcher com token e script `gen:api`
      atende: CA-15
      verifico assim: alterar o `openapi.json` sem regenerar faz o CI do front falhar

- [ ] T9 · Hook `useMe` e tratamento de 401 (sai da sessão)
      atende: CA-12, CA-14
      verifico assim: teste Vitest; no navegador, token inválido leva ao Login

- [ ] T10 · Estado 403 na interface
      atende: CA-13
      verifico assim: usuário sem `memberships` vê a mensagem e consegue sair
