# Tarefas — 007 Devolver empréstimo

Uma tarefa por vez, um commit por tarefa. T1 a T4 API; T5 a T8 front.

- [ ] T1 · `estadoDoPrazo` e `estado` em `GET /v1/emprestimos/meus`
      atende: CA-10
      verifico assim: testes unitários nas bordas -1, 0, 2 e 3 dias; supertest do campo

- [ ] T2 · Regras CASL de devolução
      atende: CA-03, CA-04
      verifico assim: teste unitário por papel e por dono do empréstimo

- [ ] T3 · Service e repository de devolução, 409 e 404
      atende: CA-01, CA-02, CA-05, CA-06, CA-07
      verifico assim: Testcontainers: devolver libera o item e o bloqueio; segunda devolução dá 409

- [ ] T4 · Controller `POST /v1/emprestimos/:id/devolucao` e auditoria
      atende: CA-08, CA-09
      verifico assim: supertest: 401, 403, 404, 409, isolamento; auditoria com a pessoa dona

- [ ] T5 · Regenerar cliente, mapa de estado/cores e página com cabeçalho e barra de limite
      atende: CA-11, CA-12
      verifico assim: com 0, 2 e 3 itens a barra e o texto mudam; um item em atraso pinta de vermelho

- [ ] T6 · Linhas de empréstimo, estado vazio, rodapé e estados de carregando/erro
      atende: CA-13, CA-15, CA-16, CA-17
      verifico assim: no navegador, a tela bate com o layout 5.3

- [ ] T7 · Modal de devolução comum e ação Devolver
      atende: CA-14
      verifico assim: confirmar remove a linha e mostra o toast; a data do modal é a de hoje

- [ ] T8 · Erros da API ao devolver
      atende: CA-18
      verifico assim: devolver um item já devolvido mostra o toast e atualiza a lista
