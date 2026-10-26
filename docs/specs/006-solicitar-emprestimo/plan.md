# Plano — 006 Solicitar empréstimo

Deriva de docs/specs/006-solicitar-emprestimo/spec.md.

## Restrições que este plano obedece

- docs/adr/001-stack.md — Controller → Service → Repository, Prisma, Problem Details, CASL,
  TanStack Query, Zustand.
- docs/layout.md — seções 1, 5.2, 5.6 e 7.
- rules/restrictions.md.

## Bibliotecas novas

Nenhuma. Se o modal precisar de acessibilidade além do que um componente simples dá (foco preso,
Esc), a proposta é trazer o `Dialog` do shadcn/ui, que o ADR-001 já prevê; fica para aprovação.

## Modelo de dados

Sem tabelas novas: usa `emprestimos` (spec 004) e `auditoria` (spec 005).

## Organização de pastas proposta

API: `src/modules/emprestimos/{controller,service,repository,schemas}.ts`,
`src/common/datas.ts` (hoje em `America/Sao_Paulo`, soma de dias).
Front: `src/features/emprestimos/{SolicitarModal,useSolicitar,useMeusEmprestimos}.tsx`,
`src/features/catalogo/BannerAtraso.tsx`, ajuste em `EquipamentoCard`.

## Como cada parte será feita

- Service abre transação; `SELECT … FOR UPDATE` na linha do equipamento serializa pedidos do mesmo
  item, e o unique parcial `(equipamento_id) where devolvido_em is null` é a rede de segurança (CA-07).
- Limite por pessoa: trava por `pg_advisory_xact_lock(hash(tenant, user))` antes de contar os abertos,
  para que dois pedidos simultâneos não passem de 3 (CA-05).
- Atraso: existe aberto com `devolver_ate < hoje` (CA-06). Hoje vem de um único helper (P4).
- Ordem das checagens: 404, manutenção, indisponível, atraso, limite (as duas últimas são da pessoa).
- Erros mapeados em exceções de domínio e convertidos pelo filtro de Problem Details.
- Front: o catálogo cruza `useMeusEmprestimos` com cada card para decidir o rótulo (CA-16, CA-17) e
  mostra o banner (CA-18); sucesso invalida `equipamentos` e `emprestimos/meus` (CA-15, CA-19).
- Modal fecha em clique no backdrop e não propaga clique interno (CA-20).

## Testes

Jest do service (regras e ordem das checagens); Testcontainers com concorrência real para CA-05 e
CA-07 (várias conexões em paralelo); supertest para códigos, `type` e isolamento; Vitest para os
rótulos de botão e o modal; Playwright para o fluxo pedir-item-e-ver-na-tela.
