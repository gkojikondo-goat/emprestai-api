# Spec — Painel de Operações

**Status:** aprovada
**Implementada:** não

## Objetivo

Operações vê todos os empréstimos em aberto, quantos estão em atraso e o resumo do estoque, e
registra devoluções no balcão.

## Vínculo

- PRD: item 5 (Tela de Operações com todos os empréstimos em aberto); "Operações ... vê quem está com
  o quê e registra devolução no balcão"; "Como saberemos que deu certo" (abandonar a planilha).
- ADR-001: REST sob `/v1`, lista por cursor, Guards + CASL, Problem Details, teste de isolamento.
- Visual: docs/layout.md, seções 5.4 e 7 (itens 3 e 8).
- Specs: 003 (rota `/operacoes`), 005 (cadastro), 007 (devolução e modal comum).

## Regras

1. `GET /v1/emprestimos?situacao=abertos` lista os empréstimos em aberto do tenant. Só `operacoes`.
2. Parâmetros: `q` (pessoa, nome ou patrimônio do equipamento, sem diferenciar maiúsculas, P9), `cursor`,
   `limite` (padrão 50, máximo 100).
3. Cada item: `{ id, pessoa: { id, nome }, equipamento: { id, nome, patrimonio }, retiradaEm, devolverAte,
   estado }`, com `estado` igual ao da spec 007 (`em_dia`, `a_vencer`, `em_atraso`).
4. Ordem: em atraso primeiro; depois por `devolverAte` mais próximo; desempate por `id` (P12). O cursor
   respeita essa ordem sem repetir nem pular itens.
5. `GET /v1/equipamentos/resumo` devolve `{ emAberto, emAtraso, disponiveis, manutencao }` do tenant.
   Só `operacoes`. Uma pessoa em atraso com dois itens em atraso conta dois itens em `emAtraso`.
6. Tela `/operacoes` (layout 5.4):
   - H1 "Operações" com texto de apoio; busca de 230px; botão primário "Cadastrar equipamento" que leva
     a `/equipamentos`.
   - 4 KPIs: Em aberto · Em atraso (vermelho) · Disponíveis (acento) · Manutenção (cinza), cada um com
     rótulo uppercase, número de 30px e dica.
   - Tabela: Pessoa (avatar com iniciais e nome) · Equipamento · Patrimônio · Retirada · Prazo (na cor
     do estado) · Situação (pill) · ação "Registrar devolução" alinhada à direita.
   - Estado sem resultados: texto centralizado com padding de 40px.
7. "Registrar devolução" abre o modal comum da spec 007 com "Pessoa" no lugar da data; confirmar chama
   `POST /v1/emprestimos/:id/devolucao`, mostra "Devolução registrada." e a linha sai.
8. Atualização sem tempo real: refetch ao voltar para a aba e após cada ação.

## Critérios de aceitação

- CA-01 · [back] Operações recebe 200 com os empréstimos em aberto do tenant; Colaborador recebe 403.
- CA-02 · [back] Cada item traz pessoa, equipamento, datas e `estado` correto.
- CA-03 · [back] Empréstimos devolvidos nunca aparecem.
- CA-04 · [back] A ordem é: em atraso primeiro, depois prazo mais próximo.
- CA-05 · [back] `q` encontra por nome da pessoa, nome do equipamento ou patrimônio, sem diferenciar maiúsculas.
- CA-06 · [back] A paginação por cursor mantém a ordem e não repete nem pula itens quando uma devolução
  acontece entre duas páginas.
- CA-07 · [back] `GET /v1/equipamentos/resumo` devolve as quatro contagens corretas e é 403 para Colaborador.
- CA-08 · [back] Sem token responde 401; nada de tenant B aparece para token de tenant A, na lista e no resumo.
- CA-09 · [back] `limite` fora de 1–100 responde 400 em Problem Details.
- CA-10 · [front] A tela tem o título, a busca, o botão "Cadastrar equipamento" (leva a `/equipamentos`) e
  os 4 KPIs com os números do resumo, nas cores do layout.
- CA-11 · [front] A tabela mostra as 7 colunas, o avatar com as iniciais da pessoa, o prazo na cor do
  estado e a pill de situação.
- CA-12 · [front] A busca filtra enquanto se digita; sem resultado mostra "Nenhum empréstimo encontrado.".
- CA-13 · [front] "Registrar devolução" abre o modal com "Pessoa"; confirmar chama a API, mostra
  "Devolução registrada.", remove a linha e atualiza os KPIs sem recarregar a página.
- CA-14 · [front] Carregando mostra "Carregando empréstimos…"; erro mostra "Não foi possível carregar os
  empréstimos." com "Tentar novamente".
- CA-15 · [front] Com `proximoCursor` aparece "Carregar mais".

## Fora de escopo / não decidido

- Histórico de empréstimos devolvidos, relatórios, exportação.
- Mudar a situação de equipamento (P6) e registrar empréstimo para outra pessoa (P10).
- Cobrança ou aviso ao atrasado (notificação por e-mail está fora da v1).

## Contrato afetado

- Novos: `GET /v1/emprestimos` (com `situacao=abertos`) e `GET /v1/equipamentos/resumo`.
- Reaproveita `POST /v1/emprestimos/:id/devolucao` (spec 007).
- Cliente do front regenerado do `openapi.json`.
