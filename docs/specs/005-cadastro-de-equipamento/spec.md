# Spec — Cadastro de equipamento

**Status:** aprovada
**Implementada:** não

## Objetivo

Operações cadastra um equipamento novo, que passa a aparecer no catálogo.

## Vínculo

- PRD: "Quem usa" — Operações cadastra equipamentos.
- ADR-001: REST sob `/v1`, validação com Zod, Guards + CASL, auditoria append-only, React Hook Form
  com `zodResolver`.
- Visual: docs/layout.md, seção 5.5 (Equipamentos) e 7 (item 10).
- Specs: 002, 003 (rota `/equipamentos`, Toast) e 004 (tabela `equipamentos`).

## Regras

1. `POST /v1/equipamentos` cria um equipamento no tenant do token. Só o papel `operacoes` pode.
2. Corpo: `nome` (obrigatório, até 120 caracteres, sem espaços nas pontas), `categoria`
   (`notebook` | `monitor` | `cabo` | `camera` | `acessorio`), `patrimonio` (opcional),
   `observacao` (opcional), `situacaoInicial` (`disponivel` por padrão, ou `manutencao`).
3. Patrimônio vazio vira `null` e as telas mostram `TI-—` (P7). Informado, é único dentro do tenant.
4. Observação não é obrigatória, nem em manutenção (P8).
5. Depois de criado, a situação só muda por outra spec (P6); esta não edita nem exclui.
6. Cada cadastro grava um registro de auditoria com ator, tenant, ação `equipamento.criado` e o
   recurso criado.
7. Tela `/equipamentos` (layout 5.5), grade `1fr 300px` com `gap: 34px`:
   - Card do formulário: Nome (2 colunas), Categoria (select), Patrimônio, Observações (textarea,
     2 colunas), rádios "Disponível" e "Em manutenção" (padrão Disponível), rodapé com borda
     superior e as ações "Cadastrar equipamento" (primário) e "Cancelar" (ghost).
   - Coluna direita: painel "Regras em vigor" (3 itens por pessoa, 14 dias de prazo, atraso bloqueia
     novo empréstimo, manutenção não conta como disponível) e painel "Fora desta versão" (Reserva com
     data futura, Notificação por e-mail, Importação da planilha), em 42% de opacidade.
8. Validação de formato no front com o schema Zod gerado do OpenAPI (sem reescrever regra).

## Critérios de aceitação

- CA-01 · [back] Operações envia nome e categoria válidos e recebe 201 com o equipamento criado,
  `situacao = disponivel` quando `situacaoInicial` foi omitida.
- CA-02 · [back] Colaborador recebe 403 e nada é criado.
- CA-03 · [back] Nome vazio, só com espaços ou com mais de 120 caracteres responde 400 em Problem Details.
- CA-04 · [back] Categoria fora da lista responde 400.
- CA-05 · [back] Patrimônio omitido ou vazio é gravado como `null`.
- CA-06 · [back] Patrimônio repetido no mesmo tenant responde 409 (`patrimonio-ja-cadastrado`); o mesmo
  patrimônio em outro tenant é aceito.
- CA-07 · [back] `situacaoInicial = manutencao` cria o item em manutenção; qualquer outro valor além
  de `disponivel` e `manutencao` responde 400.
- CA-08 · [back] `tenant_id` enviado no corpo é ignorado; o item nasce no tenant do token.
- CA-09 · [back] Cada cadastro bem-sucedido grava uma linha de auditoria com ator, tenant, ação e recurso.
- CA-10 · [back] Sem token responde 401; item criado no tenant A não aparece no tenant B.
- CA-11 · [back] O item criado aparece em primeiro lugar em `GET /v1/equipamentos`.
- CA-12 · [front] A tela `/equipamentos` tem os campos, os rádios, as ações e os dois painéis da regra 7.
- CA-13 · [front] Enviar com o nome vazio mostra o toast "Informe o nome do equipamento." e não chama a API.
- CA-14 · [front] Cadastro bem-sucedido leva a `/operacoes` e mostra o toast "Equipamento cadastrado."
- CA-15 · [front] "Cancelar" volta a `/operacoes` sem chamar a API.
- CA-16 · [front] Resposta 409 mostra "Já existe um equipamento com este patrimônio." junto ao campo
  Patrimônio e mantém o formulário preenchido.
- CA-17 · [front] Durante o envio o botão fica desabilitado com o texto "Cadastrando…".

## Fora de escopo / não decidido

- Editar, excluir, desativar ou mudar a situação de um equipamento depois do cadastro (P6).
- Importação da planilha atual, foto, número de série, valor do equipamento.
- Cadastro em lote.

## Contrato afetado

- Novo: `POST /v1/equipamentos`.
- Nova tabela `auditoria` (append-only): ver plano.
- Cliente do front regenerado do `openapi.json`.
