# Plano — 007 Devolver empréstimo

Deriva de docs/specs/007-devolver-emprestimo/spec.md.

## Restrições que este plano obedece

- docs/adr/001-stack.md — Controller → Service → Repository, CASL, auditoria, TanStack Query.
- docs/layout.md — seções 1, 5.3, 5.6 e 7.
- rules/restrictions.md.

## Bibliotecas novas

Nenhuma.

## Modelo de dados

Sem tabelas novas: usa `emprestimos.devolvido_em` e `auditoria` (coluna `detalhe` guarda a pessoa
dona quando o ator é Operações).

## Organização de pastas proposta

API: acrescenta ao módulo `src/modules/emprestimos/` o método de devolução e a função pura
`estadoDoPrazo(devolverAte, hoje)` em `src/common/datas.ts`.
Front: `src/features/emprestimos/{MeusEmprestimosPage,EmprestimoLinha,BarraDeLimite,DevolverModal,useDevolver}.tsx`
e `src/features/emprestimos/estado.ts` (mapa `estado → cores e rótulo`, reaproveitado na spec 008).

## Como cada parte será feita

- CASL: `colaborador` pode `devolver` apenas quando `emprestimo.userId === usuario.id`; `operacoes` pode
  `devolver` qualquer empréstimo do tenant (CA-03, CA-04). Antes da regra, o empréstimo é buscado no tenant
  do contexto para distinguir 404 de 403 (CA-06).
- `UPDATE … SET devolvido_em = hoje WHERE id = ? AND devolvido_em IS NULL`; zero linhas afetadas vira 409
  (CA-05), o que também resolve devolução concorrente.
- Equipamento volta a disponível pelo próprio estado derivado: sem coluna a atualizar (CA-02, CA-07).
- `estadoDoPrazo`: diferença em dias civis; menor que 0 é `em_atraso`, de 0 a 2 é `a_vencer`, resto `em_dia` (P5).
- Front: modal de devolução comum, recebe `rotulo` ("Devolução em" ou "Pessoa") para a spec 008 reaproveitar.
  Sucesso invalida `emprestimos/meus`, `equipamentos` e, se existir, a lista de Operações (CA-14).

## Testes

Jest de `estadoDoPrazo` (bordas -1, 0, 2, 3) e das regras CASL; Testcontainers para devolução, 409 em
corrida e liberação do bloqueio; supertest para 401/403/404/409 e isolamento; Vitest da página
(vazio, estados, barra); Playwright para pedir e devolver.
