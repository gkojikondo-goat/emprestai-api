# Operação em produção — dados iniciais (spec 009)

**Quem executa: o Gabriel, no terminal dele.** O agente nunca escreve no banco, no Storage nem no
deploy de produção; o hook `producao-guarda` o impede. Cada passo diz como conferir.

Valores que aparecem abaixo como `<...>` vêm do painel do Supabase (Project Settings). Nenhum deles
vai para arquivo do repositório.

## 0. Variáveis de ambiente na Vercel (projeto da API)

Além de `DATABASE_URL` e `CORS_ORIGIN`, que já existem:

| Variável | Valor |
|---|---|
| `SUPABASE_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_ISSUER` | `https://<ref>.supabase.co/auth/v1` |
| `STORAGE_PUBLIC_URL` | `https://<ref>.supabase.co/storage/v1/object/public/equipamentos` |

Conferir: depois do deploy, `GET https://emprestai-api.vercel.app/v1/health` responde 200. Sem uma
dessas variáveis a API não sobe e o log da Vercel cita o nome que falta.

## 1. Migrations no banco do Supabase

O job de CI com `prisma migrate deploy` (AZ-10) ainda não existe; por enquanto é manual. Use a
conexão **session pooler, porta 5432** (a direta é IPv6):

```bash
DATABASE_URL="<session pooler 5432>" DIRECT_URL="<session pooler 5432>" npx prisma migrate deploy
```

Conferir: a saída lista `20261110120000_tenants_memberships` e `20261110140000_equipamentos_emprestimos`
como aplicadas.

## 2. Conta do professor

Painel do Supabase → Authentication → Users → **Add user** → e-mail
`marcelo.grilo@institutojef.org.br`, a senha padrão da turma, **Auto Confirm User** marcado.
A senha é digitada só ali (spec 009: nunca no repositório).

## 3. A sua conta de teste

A conta do professor precisa chegar à correção com zero empréstimos. Para os seus testes, crie outra
conta pelo mesmo caminho e vincule-a seguindo `docs/provisionamento.md` (passos 2 e 3).

## 4. Seed

```bash
DATABASE_URL="<session pooler 5432>" npm run seed
```

Conferir: a saída termina com `12 equipamentos; professor vinculado (marcelo.grilo@...)`. Se disser
`AVISO: conta ... não existe`, faça o passo 2 e rode de novo — o seed pode rodar quantas vezes for
preciso sem duplicar nada.

## 5. Fotos no Storage

Exporte a chave **só neste terminal** e apague depois:

```bash
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role>"
node .claude/skills/imagens-equipamentos/scripts/enviar.mjs
unset SUPABASE_SERVICE_ROLE_KEY
```

Conferir: `bucket equipamentos: criado` (ou `existente`) e 12 linhas `enviado`. Abrir sem login
`https://<ref>.supabase.co/storage/v1/object/public/equipamentos/TI-0001.jpg` mostra a foto.

## 6. Deploy

`git push` nos dois repositórios (a Vercel publica sozinha). Conferir no link do front:

- entrar com a **sua** conta de teste; o catálogo mostra os 12 equipamentos com foto;
- recarregar a página em `/meus-emprestimos` não dá 404 (spec 003 CA-09 — anotar na spec quando conferir);
- a conta do professor entra, mas **não solicite nada com ela**.
