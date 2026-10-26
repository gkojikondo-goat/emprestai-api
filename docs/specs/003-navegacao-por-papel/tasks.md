# Tarefas — 003 Navegação por papel

Uma tarefa por vez, um commit por tarefa. Todas no front.

- [ ] T1 · React Router com rotas, páginas provisórias e redirecionamento da raiz
      atende: CA-01, CA-02, CA-10
      verifico assim: sem sessão qualquer rota vai ao Login; com sessão `/` vai ao Catálogo

- [ ] T2 · `vercel.json` com rewrite de SPA
      atende: CA-09
      verifico assim: após o deploy, abrir `/meus-emprestimos` direto na URL não dá 404

- [ ] T3 · Barra de navegação com abas por papel, aba ativa e Sair
      atende: CA-03, CA-04, CA-06, CA-07, CA-08, CA-12
      verifico assim: testes por papel; no navegador, a barra bate com o layout 6

- [ ] T4 · Proteção das rotas de Operações
      atende: CA-05
      verifico assim: Colaborador digita `/operacoes` na URL e cai em `/catalogo`

- [ ] T5 · Componente Toast global
      atende: CA-11
      verifico assim: teste com timers falsos mostra e remove em 2600ms

- [ ] T6 · Atualizar a spec 001 (P11) e remover a tela Início provisória
      atende: consistência entre 001 e 003
      verifico assim: 001 diz `/catalogo` no CA-02; nenhum teste referencia a tela Início
