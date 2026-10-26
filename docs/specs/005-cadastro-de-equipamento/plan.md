# Plano — 005 Cadastro de equipamento

Deriva de docs/specs/005-cadastro-de-equipamento/spec.md.

## Restrições que este plano obedece

- docs/adr/001-stack.md — Zod via `nestjs-zod`, CASL, auditoria append-only, React Hook Form + `zodResolver`.
- docs/layout.md — seção 5.5.
- rules/restrictions.md.

## Bibliotecas novas (previstas no ADR-001)

`react-hook-form` e `@hookform/resolvers` no front. Nenhuma na API.

## Modelo de dados proposto (P13 — aguardando aprovação)

```
auditoria (id uuid pk, tenant_id uuid fk, ator_user_id uuid, acao text, recurso_tipo text,
           recurso_id uuid, detalhe jsonb null, criado_em timestamptz)
```

Append-only: a migration revoga `UPDATE` e `DELETE` do role da aplicação e cria trigger que bloqueia
os dois. RLS ligado, sem policy. As specs 006 e 007 reaproveitam a tabela.

## Organização de pastas proposta

API: `src/modules/equipamentos/` (acrescenta `POST`), `src/modules/auditoria/{service,repository}.ts`,
`src/common/casl/ability.factory.ts` (regra: `operacoes` pode `create` em `Equipamento`).
Front: `src/features/equipamentos/{EquipamentosPage,EquipamentoForm,RegrasPanel}.tsx`.

## Como cada parte será feita

- Schema Zod do corpo com `nestjs-zod`; o mesmo vira OpenAPI e o front usa o schema gerado (CA-03,
  CA-04, CA-07, CA-13).
- `unique (tenant_id, patrimonio)` trata o 409 (CA-06); string vazia é normalizada para `null` no
  service antes de gravar (CA-05).
- CASL decide o 403 (CA-02); `tenant_id` só do contexto (CA-08).
- Auditoria gravada na mesma transação do insert (CA-09).
- Form com `useForm` + `zodResolver`; `onSuccess` invalida a lista do catálogo, navega e dispara o
  toast (CA-14). Erros 409 mapeados para `setError('patrimonio', …)` (CA-16).

## Testes

Jest do service e da regra CASL; Testcontainers para o unique e o append-only da auditoria;
supertest para papéis, 400/409 e isolamento; Vitest do formulário (CA-12 a CA-17).
