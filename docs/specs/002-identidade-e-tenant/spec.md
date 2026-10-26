# Spec — Identidade e tenant

**Status:** aprovada
**Implementada:** não

## Objetivo

A API reconhece quem está chamando: valida o token do Supabase, descobre o tenant e o papel
da pessoa e expõe isso em `GET /v1/me`. O front usa essa resposta para saber quem está logado.

## Vínculo

- PRD: "O que precisa existir na primeira versão", item 1 — "cada pessoa vê os próprios empréstimos"
  exige que a API saiba quem é a pessoa.
- ADR-001: JWT validado por JWKS; tenant vindo do token e nunca do corpo; `AsyncLocalStorage` com
  `tenant_id` e `user_id`; tabela `memberships (user_id, tenant_id, role)`; seed idempotente com o
  tenant `suporte_ti`; RLS ligado e negado por padrão; Guards do Nest + CASL; erro em RFC 9457;
  log com `request_id` e `tenant_id`.
- Specs: 001 (login fornece o token).

## Regras

1. Toda rota sob `/v1` exige `Authorization: Bearer <token>`, exceto `GET /v1/health`.
2. A API valida assinatura, expiração e emissor do token pela JWKS do Supabase. Não consulta o
   Supabase a cada request.
3. O tenant vem exclusivamente da claim `app_metadata.tenant_id` do token. Cabeçalho, query ou
   corpo com `tenant_id` são ignorados.
4. O papel vem da tabela `memberships`, não do token. O guard confere que existe uma linha para
   o par (usuário, tenant) do token; sem linha, a pessoa não tem acesso.
5. Papéis: `colaborador` e `operacoes`.
6. O guard grava `tenant_id`, `user_id` e `papel` no `AsyncLocalStorage`; services e repositories
   leem de lá e não recebem `tenant_id` por parâmetro.
7. `GET /v1/me` devolve `{ id, email, nome, tenant: { id, slug }, papel }`.
8. Erros: 401 para token ausente, inválido ou expirado; 403 para token válido sem vínculo com o
   tenant. Corpo em Problem Details (`type`, `title`, `status`, `detail`), sem vazar motivo interno.
9. As tabelas `tenants` e `memberships` têm RLS habilitado e nenhuma policy para os roles públicos.
10. O seed cria o tenant `suporte_ti` e pode ser rodado várias vezes sem duplicar nem falhar.
11. No front, o token vai no header `Authorization` por um cliente HTTP gerado do `openapi.json`
    (orval). Nenhuma chamada à API é escrita à mão.

## Critérios de aceitação

- CA-01 · [back] `GET /v1/me` sem `Authorization` responde 401 em Problem Details.
- CA-02 · [back] Token com assinatura errada, expirado ou de outro emissor responde 401 e nenhuma
  rota de domínio é executada.
- CA-03 · [back] Token válido de pessoa com vínculo responde 200 com `id`, `email`, `nome`,
  `tenant.slug = "suporte_ti"` e `papel`.
- CA-04 · [back] Token válido sem a claim `app_metadata.tenant_id`, ou sem linha em `memberships`
  para esse tenant, responde 403 em Problem Details e não devolve dado algum.
- CA-05 · [back] Mandar `tenant_id` diferente por cabeçalho, query ou corpo não muda o tenant
  resolvido: a resposta continua sendo a do tenant do token.
- CA-06 · [back] Pessoa com vínculo apenas no tenant B e claim apontando o tenant A responde 403.
- CA-07 · [back] Dentro de um request autenticado, um service lê `tenant_id`, `user_id` e `papel` do
  `AsyncLocalStorage`; dois requests simultâneos de tenants diferentes não misturam contexto.
- CA-08 · [back] `tenants` e `memberships` têm RLS habilitado; um role sem bypass lê zero linhas.
- CA-09 · [back] Rodar o seed duas vezes deixa exatamente um tenant `suporte_ti`.
- CA-10 · [back] `GET /v1/health` continua público e com a mesma resposta de antes.
- CA-11 · [back] O log de cada request autenticado traz `request_id` e `tenant_id`.
- CA-12 · [front] Depois do login, o front chama `GET /v1/me` com o token e guarda papel, nome e
  tenant em memória; a tela mostra o nome da pessoa.
- CA-13 · [front] Se `/v1/me` responde 403, a tela mostra "Sua conta ainda não está vinculada a
  uma área. Fale com Operações." e o botão Sair.
- CA-14 · [front] Se qualquer chamada responde 401, a sessão é encerrada e a pessoa volta ao Login.
- CA-15 · [front] O cliente da API é gerado do `openapi.json` publicado pela API; o CI do front falha
  se o cliente gerado divergir dele.

## Fora de escopo / não decidido

- Tela ou endpoint para convidar usuário e atribuir papel (P2): na v1 é manual, documentado.
- Troca de tenant na interface (uma pessoa em mais de um tenant).
- Regras por recurso (quem pode o quê em cada endpoint): cada spec seguinte declara as suas.
- Rate limit e auditoria: entram nas specs que criam rotas de escrita.

## Contrato afetado

- Novo: `GET /v1/me`.
- Mudam: todas as rotas sob `/v1` passam a exigir token (exceto `/v1/health`).
- Novas variáveis da API: URL da JWKS e emissor do Supabase, validadas com Zod na subida.
- `openapi.json` passa a ser publicado como artefato do CI da API.
