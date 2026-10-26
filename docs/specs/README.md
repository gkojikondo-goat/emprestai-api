# Specs — Empréstimo de Equipamentos Internos

Índice das specs da v1, derivadas de docs/PRD.md, docs/adr/001-stack.md e docs/layout.md.
Cada pasta tem `spec.md`, `plan.md` e `tasks.md`.

Os critérios de aceitação levam a marca do repositório onde a prova vive: `[back]` (emprestai-api)
ou `[front]` (emprestai-front). É a convenção que o `verificador-spec` usa (status OUTRO
REPOSITÓRIO). Cada spec vale nos dois repositórios; rode o verificador em cada um e junte as tabelas.

## Ordem e dependências

| # | Spec | Repositórios | Depende de | Cobre no PRD |
|---|---|---|---|---|
| 001 | [login](001-login/spec.md) | front | — | 1. Login (autenticação) |
| 002 | [identidade-e-tenant](002-identidade-e-tenant/spec.md) | back + front | 001 | 1. Login (cada pessoa vê o seu) |
| 003 | [navegacao-por-papel](003-navegacao-por-papel/spec.md) | front | 002 | Colaborador × Operações |
| 004 | [catalogo](004-catalogo/spec.md) | back + front | 002, 003 | 2. Catálogo com a situação |
| 005 | [cadastro-de-equipamento](005-cadastro-de-equipamento/spec.md) | back + front | 004 | Operações cadastra equipamentos |
| 006 | [solicitar-emprestimo](006-solicitar-emprestimo/spec.md) | back + front | 004 | 3. Solicitar; regras de 3 itens, atraso, manutenção |
| 007 | [devolver-emprestimo](007-devolver-emprestimo/spec.md) | back + front | 006 | 4. Devolver; prazo de 14 dias |
| 008 | [painel-operacoes](008-painel-operacoes/spec.md) | back + front | 005, 007 | 5. Tela de Operações |

Implementar na ordem da tabela. Uma tarefa por vez (rules/restrictions.md).

## Regras do PRD e onde cada uma é provada

| Regra do PRD | Specs e critérios |
|---|---|
| No máximo 3 itens ao mesmo tempo | 006 CA-04, CA-05, CA-16 |
| Prazo padrão de 14 dias | 006 CA-02, CA-14 |
| Item em atraso bloqueia novo empréstimo | 006 CA-06, CA-17, CA-18; 007 CA-07 |
| Manutenção não aparece como disponível | 004 CA-02, CA-16; 006 CA-08 |
| Cada pessoa vê os próprios empréstimos | 006 CA-10; 007 CA-03, CA-11 |
| Itens da v1 que NÃO entram (reserva, e-mail, importação) | nenhuma spec; ver "Fora de escopo" de cada uma |

## Perguntas em aberto

O AGENTS.md manda listar o que o PRD e os ADRs deixaram ambíguo e esperar. As specs foram
escritas com a **proposta** abaixo. **Todas as propostas P1 a P13 foram confirmadas** e as specs
002 a 008 estão com **Status: aprovada**. Resalva: a biblioteca `jose` (spec 002) não está no ADR-001 e
ainda precisa de aprovação própria.

| # | Pergunta | Proposta usada nas specs | Afeta |
|---|---|---|---|
| P1 | Quais papéis existem em `memberships.role`? | Dois: `colaborador` e `operacoes`. Operações também pega item emprestado e tem a aba "Meus empréstimos" (layout 6). | 002, 003 |
| P2 | Como a pessoa entra no tenant e ganha papel e nome? (o ADR deixa provisionamento fora) | Sem tela na v1. O administrador cria o usuário no painel do Supabase com `app_metadata.tenant_id` e insere a linha em `memberships` (com `nome`) por script SQL documentado. | 002 |
| P3 | De onde vem o `tenant_id` no JWT? O ADR diz "claim do JWT". | `app_metadata.tenant_id`, gravado pelo administrador (o usuário não consegue alterar). O guard confere que existe `memberships` para o par usuário+tenant e lê o papel dali. | 002 |
| P4 | Qual é o "hoje" para prazo e atraso? | Data civil em `America/Sao_Paulo`. Atraso = hoje maior que "devolver até" (no dia do prazo ainda está em dia). | 006, 007, 008 |
| P5 | O que é "a vencer" (cor âmbar do layout)? | Faltam de 0 a 2 dias para o prazo. Mais que 2 dias: "Em dia". Passou: "Em atraso". | 007, 008 |
| P6 | Como um item vai e volta de manutenção depois do cadastro? O PRD e o layout só mostram a situação inicial. | Fora da v1: a situação só é escolhida no cadastro. Se Operações precisar mexer depois, vira spec nova. | 005 |
| P7 | Patrimônio é único? E vazio? | Único por tenant quando informado (409 se repetir). Vazio fica `null` no banco e as telas mostram `TI-—`. | 005, 004 |
| P8 | Observação é obrigatória para item em manutenção? | Não. O card mostra a observação quando existir. | 005 |
| P9 | A busca ignora acento? | Não: só maiúsculas/minúsculas (layout 7.8). | 004, 008 |
| P10 | Operações pode registrar empréstimo para outra pessoa? | Não na v1; o PRD só prevê pedir para si. | 006 |
| P11 | A spec 003 troca a tela Início provisória da 001. O que acontece com o status da API nela? | O status da API sai da interface (o endpoint `/v1/health` continua). Muda 001 CA-02 (destino passa a ser `/catalogo`), CA-06, CA-07 e CA-08. A 001 precisa ser atualizada junto com a 003. | 001, 003 |
| P12 | Ordem da lista de Operações. | Em atraso primeiro; depois por prazo mais próximo. | 008 |
| P13 | Modelagem do domínio (tabelas e colunas) — o ADR-001 diz que não decide. | Proposta nos `plan.md` (tenants, memberships, equipamentos, emprestimos, auditoria). Precisa de aprovação antes do código. | 002 a 008 |

## Decisões que as specs tomam por conta do ADR-001 (sem pergunta)

- Rotas sob `/v1`, erro em Problem Details (RFC 9457), listas por cursor, `tenant_id` em toda tabela,
  RLS ligado e negado por padrão, guards do Nest + CASL, validação com Zod, auditoria append-only.
- Todo endpoint tem um teste de isolamento: tenant A não enxerga dado do tenant B.
- Sem tempo real: o front atualiza por refetch do TanStack Query ao voltar para a aba e após cada ação.
