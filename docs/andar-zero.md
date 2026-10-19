# Andar zero — API

Isto não é uma spec: não há comportamento de produto aqui.
É a verificação de que a stack decidida em docs/adr/001-stack.md e
docs/adr/002-banco-de-desenvolvimento.md funciona junta, de ponta a ponta,
até a API publicada na Vercel respondendo com o banco do Supabase.

O andar zero do front está no repositório emprestai-front.

## Critérios de aceitação

- AZ-01 · um comando sobe o Postgres de desenvolvimento e a API do zero,
  numa máquina limpa que tenha Docker
- AZ-02 · a API lê a configuração de variáveis de ambiente; sem variável
  obrigatória ou sem banco, ela falha na subida com mensagem clara
- AZ-03 · existe uma migration do Prisma, versionada e aplicável do zero,
  que cria uma tabela mínima e habilita RLS nela por SQL bruto
- AZ-04 · GET /v1/health devolve 200 com o status da conexão com o banco;
  com o banco fora do ar, devolve 503 no formato RFC 9457 (ADR-001)
- AZ-05 · a API aceita requisições do origem do front (allowlist de CORS) e
  recusa as de outra origem
- AZ-06 · um comando roda os testes, com pelo menos um teste de API sobre
  AZ-04 contra um Postgres real
- AZ-07 · existe .env.example versionado com todas as variáveis que a API usa
- AZ-08 · .env está no .gitignore e nenhum segredo está no repositório
- AZ-09 · a API publicada na Vercel responde 200 em /v1/health, com o banco
  do Supabase conectado
- AZ-10 · a migration é aplicada ao Supabase pelo job do GitHub Actions,
  antes do deploy

## Fora de escopo

Qualquer funcionalidade do PRD. Nada de login, catálogo, empréstimo ou
devolução. Nada de multi-tenancy (tenant_id, memberships), autenticação
(JWT, JWKS), autorização (CASL), rate limit, auditoria, Sentry, pino e
geração do cliente OpenAPI. Nenhuma tabela de domínio além da mínima de AZ-03.

## Não decidido ainda

- Nome dos módulos dentro de src/modules/. O ADR-001 já decide que é por
  domínio e que as camadas são Controller → Service → Repository.
