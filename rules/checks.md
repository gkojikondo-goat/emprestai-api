# Checks

Comandos que provam que uma tarefa ou spec está de pé neste repositório.
Uma tarefa só termina com todos passando. O verificador-spec roda estes
comandos exatamente como estão escritos (o hook dele só libera o que está
entre crases aqui).

- `npm run typecheck` — TypeScript strict sem erro
- `npm run build` — gera o Prisma Client e compila
- `npm test` — testes de unidade, de API (supertest) e de banco (Testcontainers)

## Pré-requisito

`npm test` precisa do Docker no ar: os testes de banco sobem um Postgres
descartável por arquivo. Docker parado faz os testes falharem — isso é falha,
não "não rodado".

## O que nunca é check

Nada que escreva fora de um container de teste: `prisma migrate deploy`
contra `DATABASE_URL`, seed, upload de imagem, deploy. Esses são passos de
operação executados pela pessoa, não pelo agente nem pelo verificador.
