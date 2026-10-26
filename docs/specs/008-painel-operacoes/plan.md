# Plano — 008 Painel de Operações

Deriva de docs/specs/008-painel-operacoes/spec.md.

## Restrições que este plano obedece

- docs/adr/001-stack.md — Controller → Service → Repository, CASL, cursor, TanStack Query.
- docs/layout.md — seções 1, 5.4 e 7.
- rules/restrictions.md.

## Bibliotecas novas

Nenhuma.

## Modelo de dados

Sem tabelas novas. Índice sugerido (aguardando aprovação, P13):
`emprestimos (tenant_id, devolver_ate, id) where devolvido_em is null`.

## Organização de pastas proposta

API: `GET /v1/emprestimos` entra em `src/modules/emprestimos/`; `GET /v1/equipamentos/resumo` em
`src/modules/equipamentos/`.
Front: `src/features/operacoes/{OperacoesPage,KpiCard,TabelaEmprestimos,Avatar}.tsx`; reaproveita
`DevolverModal` e o mapa de estados da spec 007.

## Como cada parte será feita

- Ordenação em atraso primeiro: chave composta `(devolver_ate < hoje) desc, devolver_ate asc, id`.
  O cursor guarda os três valores; como o hoje muda à meia-noite, o cursor também guarda o `hoje` da
  primeira página para a paginação não se reordenar no meio (CA-04, CA-06).
- `q` com `ILIKE` em `memberships.nome`, `equipamentos.nome` e `equipamentos.patrimonio` (CA-05).
- Resumo com uma consulta agregada por tenant (CA-07).
- CASL: `operacoes` pode `ler` empréstimos do tenant e o resumo (CA-01, CA-07).
- Front: KPIs do resumo; tabela da lista; `useInfiniteQuery`; sucesso da devolução invalida lista,
  resumo, catálogo e meus empréstimos (CA-13).
- Iniciais do avatar com a mesma função da barra (spec 003).

## Testes

Testcontainers para ordenação, cursor e resumo; supertest para 401/403/400 e isolamento; Vitest da
tabela e dos KPIs; Playwright de ponta a ponta: Colaborador pede, Operações vê e devolve.
