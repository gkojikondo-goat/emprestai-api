# Plano — andar zero da API

Atende docs/andar-zero.md. Obedece docs/adr/001-stack.md e
docs/adr/002-banco-de-desenvolvimento.md.
Só entram bibliotecas que estão no ADR-001 (NestJS, Prisma, Zod/nestjs-zod,
@vendia/serverless-express, Jest, supertest, Testcontainers). Qualquer outra
precisa ser proposta e aprovada antes.

## Organização de pastas proposta

```
docker-compose.yml        Postgres de desenvolvimento
.env.example
prisma/
  schema.prisma
  migrations/
src/
  main.ts                 sobe a API localmente
  app.module.ts
  config/                 leitura e validação das variáveis (Zod)
  prisma/                 PrismaService
  modules/
    health/               controller, service, repository
test/
```

Por que essa e não outra: `src/modules/<dominio>/` e Controller → Service →
Repository já estão decididos no ADR-001; o módulo `health` segue o mesmo
desenho que os módulos de domínio terão. `main.ts`, `app.module.ts` e `test/`
são a convenção do NestJS (herdada, não decisão nossa). `config/` e `prisma/`
são escolha nossa, e só precisam virar ADR se ficarem caros de mudar.

## Tarefas

- [ ] T1 · Postgres de desenvolvimento em container, com volume nomeado
      atende: AZ-01 (parcial), AZ-07 (parcial)
      verifico assim: `docker compose up -d` e `docker compose ps` mostra o
      banco saudável; `docker compose exec db pg_isready` responde "accepting
      connections"

- [ ] T2 · Projeto NestJS sem nenhuma rota, TypeScript strict. Antes de gerar
      qualquer coisa, listo os arquivos que o scaffold criaria e espero
      atende: pré-requisito de T3 a T8
      verifico assim: `npm run start` sobe o processo e `curl localhost:3000/`
      devolve 404

- [ ] T3 · Configuração por variável de ambiente, validada com Zod na subida
      atende: AZ-02 (parcial), AZ-07
      verifico assim: sem `DATABASE_URL` o processo termina com código
      diferente de zero e uma mensagem que cita a variável; com ela, sobe;
      `.env.example` lista todas as variáveis

- [ ] T4 · Prisma com schema mínimo e conexão com o banco na subida
      atende: AZ-02
      verifico assim: com o banco parado a API não sobe e a mensagem diz que
      não conseguiu conectar; com o banco de pé, sobe

- [ ] T5 · Primeira migration: uma tabela mínima, com RLS habilitada por SQL
      bruto na mesma migration. Antes de gerar, mostro o DDL e espero
      atende: AZ-03
      verifico assim: `prisma migrate reset` no banco local aplica do zero sem
      erro, e uma consulta a `pg_class` mostra `relrowsecurity = true` na
      tabela

- [ ] T6 · `GET /v1/health` (Controller → Service → Repository) com o status
      da conexão com o banco
      atende: AZ-04
      verifico assim: `curl localhost:3000/v1/health` devolve 200 e o corpo
      mostra o banco como ativo

- [ ] T7 · CORS com allowlist de origens vinda da configuração
      atende: AZ-05
      verifico assim: `curl -H "Origin: <origem permitida>" -i` devolve
      `Access-Control-Allow-Origin` com essa origem; com outra origem o
      cabeçalho não aparece

- [ ] T8 · Testes com Jest, supertest e Testcontainers (Postgres real)
      atende: AZ-06
      verifico assim: `npm test` passa, e existe pelo menos um teste que chama
      `/v1/health` e cujo nome cita AZ-04

- [ ] T9 · Conferência de segredos
      atende: AZ-07, AZ-08
      verifico assim: `git check-ignore .env` imprime `.env`; `git ls-files`
      mostra `.env.example` e nenhum outro arquivo `.env*`

- [x] T10 · Handler serverless para a Vercel — dispensado pelo ADR-005: a Vercel
      executa o `src/main.ts` diretamente, sem adapter e sem `vercel.json`
      atende: AZ-09 (parcial)
      verifico assim: `npm run build` passa; o empacotamento é provado no deploy
      (T12)

- [ ] T11 · Workflow do GitHub Actions: roda os testes e aplica
      `prisma migrate deploy` no Supabase antes do deploy
      atende: AZ-10
      verifico assim: o workflow termina verde e a tabela existe no Supabase
      (você confere no painel). Os segredos `DATABASE_URL` e `DIRECT_URL` você
      cadastra no GitHub; eu não vejo os valores

- [ ] T12 · Deploy na Vercel (você cria o projeto e preenche as variáveis; eu
      não toco na configuração da Vercel)
      atende: AZ-09
      verifico assim: `curl https://<url-da-api>/v1/health` devolve 200 com o
      banco do Supabase conectado

## Decisões tomadas

1. Variáveis de ambiente da API: `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN`.
2. Com o banco fora do ar, `/v1/health` devolve 503 no formato RFC 9457
   (incluído no AZ-04).
3. Região do Supabase: `us-east-1` (docs/adr/003-regiao-do-supabase.md).
