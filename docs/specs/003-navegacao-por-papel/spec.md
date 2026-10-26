# Spec — Navegação por papel

**Status:** aprovada
**Implementada:** não

## Objetivo

O front passa a ter rotas, uma barra de navegação e abas diferentes para Colaborador e
Operações. As telas de negócio entram nas specs seguintes; esta entrega o esqueleto delas.

## Vínculo

- PRD: "Quem usa" (Colaborador e Operações).
- ADR-001: React Router (data APIs) com proteção de rota por sessão; Tailwind; Zustand para estado
  de UI.
- Visual: docs/layout.md, seções 1, 2, 3, 6 (Navegação) e 5.6 (Toast).
- Specs: 001 (sessão) e 002 (papel vindo de `/v1/me`).

## Regras

1. Rotas: `/login`, `/catalogo`, `/meus-emprestimos`, `/operacoes`, `/equipamentos`. A raiz `/`
   redireciona para `/catalogo` (com sessão) ou `/login` (sem sessão).
2. Colaborador vê as abas `Catálogo` e `Meus empréstimos`. Operações vê `Catálogo`, `Operações`,
   `Equipamentos` e `Meus empréstimos`, nessa ordem.
3. `/operacoes` e `/equipamentos` são rotas de Operações. Colaborador que as abrir é levado para
   `/catalogo`. Isso é conforto de interface: quem barra de verdade é a API (guards + CASL).
4. Barra (layout 6): `position: sticky; top: 0`, 60px de altura, fundo `--color-bg`, marca à
   esquerda, abas ao lado, e à direita a etiqueta do papel, o avatar com iniciais, o nome e "Sair".
   Aba ativa com `border-bottom: 2px solid` no acento e texto a 100%; inativa com texto a 55%.
5. Telas ainda sem spec mostram só o título da página e o texto "Em construção." (sem dados falsos).
6. O Toast do layout 5.6 existe como componente global: fixo, centralizado, 2600ms, entrada
   `fadeUp .2s`. As specs seguintes o usam.
7. A tela Início provisória da spec 001 deixa de existir (P11): o destino pós-login passa a ser
   `/catalogo`, e o status da API sai da interface.
8. A Vercel precisa servir o `index.html` para qualquer rota (rewrite de SPA).

## Critérios de aceitação

- CA-01 · [front] Sem sessão, abrir qualquer rota que não seja `/login` leva a `/login`.
- CA-02 · [front] Com sessão, abrir `/login` ou `/` leva a `/catalogo`.
- CA-03 · [front] Colaborador vê exatamente as abas Catálogo e Meus empréstimos.
- CA-04 · [front] Operações vê Catálogo, Operações, Equipamentos e Meus empréstimos, nessa ordem.
- CA-05 · [front] Colaborador que abre `/operacoes` ou `/equipamentos` é redirecionado a `/catalogo`.
- CA-06 · [front] A aba da rota atual aparece com a borda de 2px no acento; as outras, a 55%.
- CA-07 · [front] A barra mostra etiqueta do papel ("Colaborador" ou "Operações"), avatar com as
  iniciais do nome, nome e "Sair".
- CA-08 · [front] Clicar em "Sair" encerra a sessão e leva a `/login`.
- CA-09 · [front] Recarregar a página em `/meus-emprestimos` (e nas demais rotas) com sessão ativa
  mantém a rota e não dá 404 na Vercel.
- CA-10 · [front] `/catalogo`, `/meus-emprestimos`, `/operacoes` e `/equipamentos` mostram o título
  da página e "Em construção." até a spec correspondente ser implementada.
- CA-11 · [front] O componente de Toast aparece centralizado, a 28px da base, e some sozinho em 2600ms.
- CA-12 · [front] Enquanto o papel ainda não foi carregado de `/v1/me`, a barra não mostra abas de
  Operações (nunca "pisca" Operações para Colaborador).

## Fora de escopo / não decidido

- Rotas aninhadas e modais empilhados (o layout 6 diz que não há).
- Troca de tenant, perfil e configurações da conta.
- Qualquer dado de negócio nas telas.
- Menu mobile: o layout só define larguras de 1360–1440px.

## Contrato afetado

- Nenhum endpoint muda. Usa `GET /v1/me` da spec 002.
- Muda a spec 001 (CA-02, CA-06, CA-07, CA-08), conforme P11: atualizar na mesma entrega.
- Novo arquivo `vercel.json` no front com o rewrite de SPA.
