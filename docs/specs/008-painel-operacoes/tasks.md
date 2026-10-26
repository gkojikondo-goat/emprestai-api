# Tarefas — 008 Painel de Operações

Uma tarefa por vez, um commit por tarefa. T1 a T4 API; T5 a T8 front.

- [ ] T1 · Resumo `GET /v1/equipamentos/resumo`
      atende: CA-07, CA-08 (parte)
      verifico assim: Testcontainers com dados do layout 9: 6 em aberto, 1 em atraso, 4 disponíveis, 2 em manutenção

- [ ] T2 · Repository da lista de abertos com ordem e filtro `q`
      atende: CA-02, CA-03, CA-04, CA-05
      verifico assim: Testcontainers: atrasado vem primeiro; busca por pessoa, item e patrimônio

- [ ] T3 · Paginação por cursor da lista de abertos
      atende: CA-06
      verifico assim: devolver um item entre a página 1 e a 2 não repete nem pula

- [ ] T4 · Controller, CASL e testes de API
      atende: CA-01, CA-08, CA-09
      verifico assim: supertest: 403 para Colaborador, 401, 400, isolamento na lista e no resumo

- [ ] T5 · Regenerar cliente e KPIs
      atende: CA-10 (KPIs)
      verifico assim: os 4 números batem com o resumo; Em atraso em vermelho

- [ ] T6 · Tabela com avatar, prazo colorido e pill, mais busca
      atende: CA-10, CA-11, CA-12
      verifico assim: no navegador, a tela bate com o layout 5.4; busca filtra a cada tecla

- [ ] T7 · Registrar devolução pelo modal comum
      atende: CA-13
      verifico assim: confirmar tira a linha, atualiza os KPIs e mostra o toast

- [ ] T8 · Carregando, erro e "Carregar mais"
      atende: CA-14, CA-15
      verifico assim: API derrubada mostra o erro; mais de 50 abertos mostram "Carregar mais"
