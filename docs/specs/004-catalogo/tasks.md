# Tarefas — 004 Catálogo

Uma tarefa por vez, um commit por tarefa. T1 a T4 API; T5 a T9 front.

- [ ] T1 · Migration `equipamentos` e `emprestimos` com índices, unique parcial e RLS
      atende: base de CA-02, CA-05
      verifico assim: teste de integração: dois empréstimos abertos do mesmo item falham

- [ ] T2 · Repository de equipamentos com situação derivada e filtros
      atende: CA-01, CA-02, CA-03, CA-04, CA-06, CA-07
      verifico assim: Testcontainers com itens em cada situação

- [ ] T3 · Paginação por cursor
      atende: CA-05
      verifico assim: 120 itens em 3 páginas, com inserção entre as páginas, sem repetir nem pular

- [ ] T4 · Controller `GET /v1/equipamentos`, validação de parâmetros e papéis
      atende: CA-08, CA-09, CA-10
      verifico assim: supertest: 401, 400, isolamento entre tenants, mesma lista para os dois papéis

- [ ] T5 · Regenerar cliente orval e hook `useEquipamentos`
      atende: base do front
      verifico assim: `npm run gen:api` sem diff pendente; build passa

- [ ] T6 · Card com pill, detalhe e rótulos de botão
      atende: CA-12, CA-15, CA-16, CA-19
      verifico assim: teste por situação; no navegador, bate com o layout 5.2

- [ ] T7 · Cabeçalho, busca e chips de filtro
      atende: CA-11, CA-13, CA-14
      verifico assim: digitar filtra na hora; chips são exclusivos; contagem bate com `totais`

- [ ] T8 · Estados de carregando, erro e "Carregar mais"
      atende: CA-17, CA-18
      verifico assim: API derrubada mostra o erro e "Tentar novamente" funciona

- [ ] T9 · Dados de exemplo do layout 9 no seed (somente desenvolvimento)
      atende: dado para verificar CA-11 a CA-16 na tela
      verifico assim: o catálogo mostra 4 disponíveis, 2 em manutenção e os emprestados do layout
