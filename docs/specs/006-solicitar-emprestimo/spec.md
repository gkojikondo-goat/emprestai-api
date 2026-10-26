# Spec — Solicitar empréstimo

**Status:** aprovada
**Implementada:** não

## Objetivo

Uma pessoa logada pede emprestado um equipamento disponível, respeitando as regras que Operações
decidiu: no máximo 3 itens, prazo de 14 dias, bloqueio por atraso e manutenção indisponível.

## Vínculo

- PRD: item 3 (Solicitar empréstimo de um item disponível) e as quatro regras de Operações.
- ADR-001: REST sob `/v1`, Problem Details, auditoria, Guards + CASL, transações no Postgres.
- Visual: docs/layout.md, seções 5.2, 5.6 e 7 (itens 1, 4, 5, 6).
- Specs: 004 (catálogo e tabela `emprestimos`), 005 (tabela `auditoria`).

## Regras

1. `POST /v1/emprestimos` com `{ equipamentoId }` cria um empréstimo em nome de quem chama. A pessoa
   é sempre a do token, nunca vem do corpo (P10). Colaborador e Operações podem.
2. `retiradaEm` é hoje e `devolverAte` é hoje mais 14 dias (data civil em `America/Sao_Paulo`, P4).
3. Um empréstimo está em aberto enquanto `devolvido_em` é nulo.
4. Recusas, todas em Problem Details com um `type` fixo:
   - 422 `limite-de-itens`: a pessoa já tem 3 empréstimos em aberto.
   - 422 `bloqueado-por-atraso`: a pessoa tem algum empréstimo em aberto com `devolverAte` menor que hoje.
   - 409 `equipamento-indisponivel`: o equipamento já tem empréstimo em aberto.
   - 409 `equipamento-em-manutencao`: o equipamento está em manutenção.
   - 404: o equipamento não existe no tenant.
5. As verificações e a criação acontecem numa transação. Dois pedidos simultâneos para o mesmo item:
   um cria, o outro recebe 409. Dois pedidos simultâneos da mesma pessoa que passariam de 3: o terceiro
   item entra e o quarto é recusado.
6. `GET /v1/emprestimos/meus` devolve os empréstimos em aberto de quem chama, no máximo 3 (por isso
   sem cursor): `{ itens: [{ id, equipamento: { id, nome, patrimonio }, retiradaEm, devolverAte,
   emAtraso }], limite: 3, bloqueado }`. `bloqueado` é verdadeiro quando algum item está em atraso.
7. Cada pedido aceito grava auditoria `emprestimo.criado`.
8. No catálogo, o botão "Solicitar" de um item disponível abre um modal de 420px: título
   "Solicitar empréstimo", corpo curto, resumo com "Equipamento" e "Devolver até" (valor no acento),
   ações "Cancelar" e "Confirmar". Clique fora fecha; clique dentro não fecha.
9. Com 3 empréstimos em aberto, todo "Solicitar" fica desabilitado com o rótulo "Limite de 3 itens" e
   estilo secundário. Com algum item em atraso, fica desabilitado com "Bloqueado por atraso" e aparece
   no topo do catálogo o banner vermelho (layout 1) com atalho para `/meus-emprestimos`.
10. Confirmar mostra o toast "Empréstimo solicitado." e atualiza catálogo e Meus empréstimos.

## Critérios de aceitação

- CA-01 · [back] Pedido de item disponível responde 201 com o empréstimo em nome da pessoa do token.
- CA-02 · [back] `devolverAte` é igual a `retiradaEm` mais 14 dias.
- CA-03 · [back] Depois do pedido, o item aparece como `emprestado` em `GET /v1/equipamentos`.
- CA-04 · [back] Com 3 empréstimos em aberto, o pedido responde 422 `limite-de-itens` e nada é criado.
- CA-05 · [back] Duas requisições simultâneas da mesma pessoa com 2 em aberto: uma cria e a outra
  responde 422; a pessoa nunca fica com 4.
- CA-06 · [back] Com um empréstimo em atraso, o pedido responde 422 `bloqueado-por-atraso`, mesmo
  com menos de 3 itens; um empréstimo com prazo igual a hoje não bloqueia.
- CA-07 · [back] Item já emprestado responde 409 `equipamento-indisponivel`; duas pessoas pedindo o
  mesmo item ao mesmo tempo resultam em um 201 e um 409.
- CA-08 · [back] Item em manutenção responde 409 `equipamento-em-manutencao`.
- CA-09 · [back] `equipamentoId` inexistente ou de outro tenant responde 404; corpo inválido responde 400.
- CA-10 · [back] `GET /v1/emprestimos/meus` devolve só os empréstimos em aberto de quem chama, com
  `emAtraso` e `bloqueado` corretos; empréstimos de outra pessoa ou de outro tenant não aparecem.
- CA-11 · [back] `userId` ou `tenant_id` no corpo são ignorados.
- CA-12 · [back] Sem token responde 401.
- CA-13 · [back] Cada pedido aceito grava auditoria com ator, tenant, ação e recurso.
- CA-14 · [front] O modal mostra o equipamento e "Devolver até" igual a hoje mais 14 dias, em `DD/MM/AAAA`.
- CA-15 · [front] Confirmar chama a API, fecha o modal, mostra "Empréstimo solicitado." e o card passa a
  "Está com você" sem recarregar a página.
- CA-16 · [front] Com 3 itens em aberto, todo botão de solicitar mostra "Limite de 3 itens", desabilitado
  e em estilo secundário.
- CA-17 · [front] Com item em atraso, os botões mostram "Bloqueado por atraso", desabilitados.
- CA-18 · [front] Com item em atraso aparece o banner de bloqueio no topo do catálogo com atalho
  para `/meus-emprestimos`.
- CA-19 · [front] Erro 409 ou 422 da API fecha o modal, mostra a mensagem do erro em toast e atualiza o catálogo.
- CA-20 · [front] "Cancelar" e clique fora fecham o modal sem chamar a API; clique dentro não fecha.

## Fora de escopo / não decidido

- Reserva com data futura (fora da v1 no PRD).
- Notificação por e-mail (fora da v1 no PRD).
- Operações registrar empréstimo para outra pessoa (P10).
- Prorrogar prazo, escolher prazo diferente de 14 dias.
- Fila de espera para item emprestado.

## Contrato afetado

- Novos: `POST /v1/emprestimos`, `GET /v1/emprestimos/meus`.
- Escreve em `emprestimos` (tabela criada na spec 004) e em `auditoria` (spec 005).
- Cliente do front regenerado do `openapi.json`.
