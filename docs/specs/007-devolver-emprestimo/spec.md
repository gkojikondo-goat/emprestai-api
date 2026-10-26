# Spec — Devolver empréstimo

**Status:** aprovada
**Implementada:** não

## Objetivo

A pessoa devolve um item que está com ela e acompanha seus empréstimos; Operações também registra a
devolução no balcão (a tela de Operações que usa isso é a spec 008).

## Vínculo

- PRD: item 4 (Devolver um item que está comigo); "cada pessoa vê os próprios empréstimos".
- ADR-001: REST sob `/v1`, Problem Details, Guards + CASL, auditoria, TanStack Query.
- Visual: docs/layout.md, seções 5.3, 5.6 e 7 (itens 2 e 3).
- Specs: 006 (empréstimos e `GET /v1/emprestimos/meus`), 003 (rota e Toast).

## Regras

1. `POST /v1/emprestimos/:id/devolucao` marca o empréstimo como devolvido hoje (`devolvido_em`,
   data civil em `America/Sao_Paulo`, P4). Sem corpo.
2. Colaborador só devolve empréstimo seu. Operações devolve qualquer empréstimo em aberto do tenant.
3. Efeitos: o equipamento volta a `disponivel`, a pessoa ganha o slot de volta e, se o item
   devolvido era o único em atraso, o bloqueio por atraso cai.
4. Devolver o que já foi devolvido responde 409 `emprestimo-ja-devolvido`. Empréstimo inexistente ou
   de outro tenant responde 404. Colaborador tentando devolver empréstimo de outra pessoa recebe 403.
5. Cada devolução grava auditoria `emprestimo.devolvido` com o ator e a pessoa dona do empréstimo
   (quando o ator é Operações, são pessoas diferentes).
6. `GET /v1/emprestimos/meus` (spec 006) passa a trazer, em cada item, `estado`: `em_dia`, `a_vencer`
   (faltam de 0 a 2 dias, P5) ou `em_atraso`.
7. Tela `/meus-emprestimos` (layout 5.3):
   - H1 "Meus empréstimos" e "N de 3 itens em seu nome · prazo padrão de 14 dias".
   - Barra de 3 traços: ocupados no acento, em atraso em vermelho, vazios a 12% do texto.
   - Uma linha por empréstimo, com borda esquerda de 3px na cor do estado e 5 colunas: item (nome e
     patrimônio), Retirada, Devolver até (na cor do estado), pill de estado, botão "Devolver".
   - Rodapé com as 3 regras (3 itens por pessoa, 14 dias de prazo, atraso bloqueia novo empréstimo).
   - Estado vazio: caixa tracejada com "Você não tem itens emprestados." e o botão "Ir ao catálogo".
8. "Devolver" abre o modal de 420px "Devolver equipamento", com resumo "Equipamento" e "Devolução em"
   (hoje, no acento). Confirmar mostra o toast "Devolução registrada." e a linha some.

## Critérios de aceitação

- CA-01 · [back] A pessoa devolve um empréstimo seu em aberto e recebe 200 com `devolvidoEm = hoje`.
- CA-02 · [back] Depois da devolução o equipamento aparece como `disponivel` e a pessoa pode pedi-lo de novo.
- CA-03 · [back] Colaborador devolvendo empréstimo de outra pessoa recebe 403 e nada muda.
- CA-04 · [back] Operações devolve empréstimo de qualquer pessoa do tenant.
- CA-05 · [back] Devolver duas vezes responde 409 `emprestimo-ja-devolvido` na segunda.
- CA-06 · [back] Empréstimo inexistente ou de outro tenant responde 404.
- CA-07 · [back] Devolver o único item em atraso remove o bloqueio: um novo pedido da pessoa passa a ser aceito.
- CA-08 · [back] A auditoria registra ator, tenant, ação `emprestimo.devolvido` e o recurso; quando Operações
  devolve, também registra a pessoa dona do empréstimo.
- CA-09 · [back] Sem token responde 401; empréstimo do tenant A nunca é alcançável por token do tenant B.
- CA-10 · [back] `GET /v1/emprestimos/meus` traz `estado` correto em cada item (`em_dia`, `a_vencer`, `em_atraso`).
- CA-11 · [front] `/meus-emprestimos` mostra o cabeçalho "N de 3 itens em seu nome · prazo padrão de 14
  dias" com N real, e só os empréstimos da pessoa logada.
- CA-12 · [front] A barra de 3 traços pinta ocupados no acento, atrasados em vermelho e vazios a 12%.
- CA-13 · [front] Cada linha mostra item, patrimônio, Retirada, Devolver até e pill, com borda esquerda e
  cor do estado (layout 1).
- CA-14 · [front] "Devolver" abre o modal com "Devolução em" igual à data de hoje; confirmar mostra
  "Devolução registrada." e a linha some sem recarregar a página.
- CA-15 · [front] Sem empréstimos aparece o estado vazio com "Ir ao catálogo", que leva a `/catalogo`.
- CA-16 · [front] O rodapé mostra as 3 regras.
- CA-17 · [front] Carregando mostra "Carregando empréstimos…"; erro mostra "Não foi possível carregar
  seus empréstimos." com "Tentar novamente".
- CA-18 · [front] Erro da API ao devolver mostra toast com o motivo e atualiza a lista.

## Fora de escopo / não decidido

- Devolução parcial, devolução com defeito ou condição do equipamento.
- Histórico de empréstimos já devolvidos.
- Multa, advertência ou qualquer penalidade por atraso além do bloqueio.
- Prorrogar prazo.

## Contrato afetado

- Novo: `POST /v1/emprestimos/:id/devolucao`.
- Muda: `GET /v1/emprestimos/meus` ganha `estado` por item (campo novo, compatível).
- Cliente do front regenerado do `openapi.json`.
