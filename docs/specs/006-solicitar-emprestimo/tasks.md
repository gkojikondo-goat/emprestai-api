# Tarefas — 006 Solicitar empréstimo

Uma tarefa por vez, um commit por tarefa. T1 a T5 API; T6 a T9 front.

- [ ] T1 · Helper de datas (hoje em São Paulo, mais 14 dias)
      atende: CA-02
      verifico assim: teste unitário com relógio fixo, incluindo virada de dia perto da meia-noite

- [ ] T2 · Service de criação: itens indisponíveis e manutenção
      atende: CA-01, CA-03, CA-07 (parte sequencial), CA-08, CA-09
      verifico assim: Testcontainers: item disponível, emprestado, em manutenção e inexistente

- [ ] T3 · Limite de 3 e bloqueio por atraso, com trava por pessoa
      atende: CA-04, CA-05, CA-06
      verifico assim: teste com requisições paralelas: nunca 4 em aberto; prazo igual a hoje não bloqueia

- [ ] T4 · Concorrência no mesmo item
      atende: CA-07
      verifico assim: dois pedidos simultâneos dão um 201 e um 409

- [ ] T5 · Controller, `GET /v1/emprestimos/meus`, auditoria e testes de API
      atende: CA-10, CA-11, CA-12, CA-13
      verifico assim: supertest: 401, corpo com `userId` ignorado, isolamento, linha de auditoria criada

- [ ] T6 · Regenerar cliente e hook `useMeusEmprestimos`
      atende: base do front
      verifico assim: `npm run gen:api` sem diff pendente

- [ ] T7 · Rótulos de botão por limite e atraso, e banner
      atende: CA-16, CA-17, CA-18
      verifico assim: teste com 3 itens, com item em atraso e sem restrição

- [ ] T8 · Modal de solicitação
      atende: CA-14, CA-20
      verifico assim: data do modal é hoje mais 14; clique fora fecha, clique dentro não

- [ ] T9 · Confirmar, toast, atualização das telas e erros da API
      atende: CA-15, CA-19
      verifico assim: pedir um item o torna "Está com você"; forçar 409 mostra o toast e atualiza
