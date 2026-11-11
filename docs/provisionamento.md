# Provisionamento manual de pessoas (spec 002, P2)

Na v1 não há tela de convite. Quem tem acesso ao painel do Supabase cria a
pessoa e a vincula a um tenant. **Isto é operação de produção: quem executa é
a pessoa responsável, nunca o agente.**

## 1. Criar a conta

Painel do Supabase → Authentication → Users → **Add user**, com e-mail e senha
(ou convite por e-mail). A senha é digitada só no painel; nunca vai para o
repositório.

## 2. Gravar o tenant no token

No SQL Editor do Supabase. O tenant fica em `app_metadata`, que a própria pessoa
não consegue alterar (P3):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('tenant_id', (select id from public.tenants where slug = 'suporte_ti'))
where email = 'pessoa@exemplo.com';
```

A claim entra no próximo token: a pessoa precisa sair e entrar de novo.

## 3. Vincular com papel e nome

```sql
insert into public.memberships (user_id, tenant_id, papel, nome)
select u.id, t.id, 'colaborador', 'Nome da Pessoa'
from auth.users u, public.tenants t
where u.email = 'pessoa@exemplo.com' and t.slug = 'suporte_ti'
on conflict (user_id, tenant_id) do update set papel = excluded.papel, nome = excluded.nome;
```

`papel` é `colaborador` ou `operacoes`.

## Sem o passo 2 ou 3

A API responde 403 e o front mostra "Sua conta ainda não está vinculada a uma
área. Fale com Operações." (spec 002, CA-04 e CA-13).
