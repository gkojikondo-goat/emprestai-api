# Plano — 004 Catálogo

Deriva de docs/specs/004-catalogo/spec.md.

## Restrições que este plano obedece

- docs/adr/001-stack.md — Controller → Service → Repository, `src/modules/<dominio>/`, Zod via
  `nestjs-zod`, Prisma, cursor, Problem Details, TanStack Query, orval, Tailwind.
- docs/layout.md — seções 1, 2, 3, 5.2, 7.
- rules/restrictions.md.

## Bibliotecas novas

Nenhuma (tudo já previsto no ADR-001 ou introduzido pelas specs 002 e 003).

## Modelo de dados proposto (P13 — aguardando aprovação)

```
equipamentos (id uuid pk, tenant_id uuid fk, nome text, categoria text check in
              ('notebook','monitor','cabo','camera','acessorio'), patrimonio text null,
              situacao text check in ('disponivel','manutencao'), observacao text null,
              criado_em timestamptz, unique (tenant_id, patrimonio))   -- unique ignora null
emprestimos  (id uuid pk, tenant_id uuid fk, equipamento_id uuid fk, user_id uuid,
              retirada_em date, devolver_ate date, devolvido_em date null)
              unique parcial: (equipamento_id) where devolvido_em is null
              índice: (tenant_id, user_id) where devolvido_em is null
```

Índice em `(tenant_id, criado_em desc, id desc)` para o cursor. RLS ligado em ambas, sem policy.
O nome da pessoa vem de `memberships.nome` (spec 002).

## Organização de pastas proposta

API: `src/modules/equipamentos/{controller,service,repository,schemas}.ts`.
Front: `src/features/catalogo/{CatalogoPage,EquipamentoCard,FiltroChips,SituacaoPill,useEquipamentos}.tsx`.

## Como cada parte será feita

- Cursor: valor opaco (base64 de `criado_em` + `id`) e condição `(criado_em, id) < cursor`, o que
  atende CA-05 mesmo com inserções.
- Situação derivada no repository por `LEFT JOIN` com o empréstimo aberto (CA-02, CA-04).
- `totais` por duas contagens do tenant (CA-06).
- `useInfiniteQuery` do TanStack Query com `refetchOnWindowFocus` (regra 14; CA-18).
- Pill e cores saem de um mapa único `situacao → {fg,bg,bd}` do layout 1 (CA-12, CA-16).
- Busca no estado de UI (Zustand) e passada como `q`; mantém o resultado anterior enquanto carrega.

## Testes

Jest do service; Testcontainers para repository (cursor, derivação, unique parcial); supertest com
o caso de isolamento (CA-08); Vitest do card, chips e rótulos de botão (CA-12 a CA-16).
