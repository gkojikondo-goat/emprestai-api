# Tarefas — 005 Cadastro de equipamento

Uma tarefa por vez, um commit por tarefa. T1 a T4 API; T5 a T7 front.

- [ ] T1 · Migration `auditoria` append-only com RLS e módulo de auditoria
      atende: CA-09 (base)
      verifico assim: Testcontainers: `UPDATE` e `DELETE` na tabela falham

- [ ] T2 · Regra CASL para criar equipamento
      atende: CA-02
      verifico assim: teste unitário: `operacoes` pode, `colaborador` não

- [ ] T3 · Service e repository de criação com normalização de patrimônio
      atende: CA-05, CA-06, CA-07, CA-08, CA-09
      verifico assim: Testcontainers: duplicado no tenant falha, em outro tenant passa; auditoria gravada

- [ ] T4 · Controller `POST /v1/equipamentos` com validação Zod
      atende: CA-01, CA-03, CA-04, CA-10, CA-11
      verifico assim: supertest cobre 201, 400, 401, 403, isolamento e posição no topo da lista

- [ ] T5 · Regenerar cliente e montar o formulário com `zodResolver`
      atende: CA-12, CA-13, CA-17
      verifico assim: no navegador, a tela bate com o layout 5.5; nome vazio mostra o toast

- [ ] T6 · Sucesso, Cancelar e erro 409
      atende: CA-14, CA-15, CA-16
      verifico assim: cadastrar leva a `/operacoes` com toast; patrimônio repetido mostra o erro no campo

- [ ] T7 · Painéis "Regras em vigor" e "Fora desta versão"
      atende: CA-12
      verifico assim: textos conferem com a regra 7 da spec
