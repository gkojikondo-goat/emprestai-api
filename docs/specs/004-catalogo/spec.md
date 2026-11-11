# Spec — Catálogo de equipamentos

**Status:** aprovada
**Implementada:** não

## Objetivo

Qualquer pessoa logada vê os equipamentos do tenant com a situação de cada um (disponível,
emprestado ou em manutenção), pode buscar e filtrar.

## Vínculo

- PRD: item 2 (Catálogo com a situação de cada um); regra "Equipamento em manutenção não aparece
  como disponível".
- ADR-001: REST sob `/v1`, lista por cursor, Problem Details, `tenant_id` em toda tabela, teste de
  isolamento por endpoint, TanStack Query.
- Visual: docs/layout.md, seções 5.2 e 7 (itens 6 a 9).
- Specs: 002 (identidade) e 003 (rota e barra).

## Regras

1. `GET /v1/equipamentos` lista os equipamentos do tenant do token. Colaborador e Operações podem ler.
2. Parâmetros: `q` (busca), `situacao` (`disponivel` | `emprestado` | `manutencao`), `cursor`,
   `limite` (padrão 50, máximo 100).
3. A situação não é uma coluna que alguém digita: é derivada. Com empréstimo em aberto é
   `emprestado`; senão, o valor guardado (`disponivel` ou `manutencao`).
4. `q` procura no nome e no patrimônio, sem diferenciar maiúsculas de minúsculas (P9).
5. Ordem: do mais recente para o mais antigo, desempatando por `id`. A paginação por cursor não
   repete nem pula item quando um equipamento novo é cadastrado entre duas páginas.
6. A resposta traz `totais: { total, disponiveis }` do tenant inteiro, sem aplicar `q` nem `situacao`.
7. Equipamento emprestado traz `emprestimo: { pessoaNome, devolverAte, comigo }`; `comigo` é
   verdadeiro quando o empréstimo é da pessoa que chama.
8. Item em manutenção traz a `observacao` quando houver.
9. Patrimônio ausente é `null` na API e aparece como `TI-—` nas telas (P7).
10. Layout (5.2): cabeçalho com o título "Catálogo" e "X de Y equipamentos disponíveis agora"; busca de
    260px à direita; chips Todos · Disponíveis · Emprestados · Em manutenção (exclusivos); grade
    `repeat(auto-fill, minmax(292px, 1fr))`; card com categoria (uppercase), nome, patrimônio, pill
    de situação, linha de detalhe e botão de largura total.
11. Linha de detalhe do card: disponível → "Pronto para retirada no balcão"; emprestado → "Com {pessoa} ·
    devolver até {DD/MM/AAAA}"; manutenção → a observação.
12. Rótulo do botão sem ação possível: manutenção → "Indisponível"; emprestado a outra pessoa →
    "Emprestado"; emprestado à própria pessoa → "Está com você". Em item disponível o botão
    "Solicitar" é desenhado mas só ganha ação na spec 006.
13. Busca e filtros atuam a cada tecla/clique, sem botão. Estado vazio: "Nenhum equipamento encontrado."
14. Atualização sem tempo real: os dados são refeitos ao voltar para a aba e após cada ação.
15. **Foto (emenda da prática, 2026-11-10).** Cada equipamento pode ter uma foto, guardada no bucket
    público `equipamentos` do Supabase Storage e preparada pela skill `imagens-equipamentos`. A API
    devolve `imagemUrl` (URL pública completa) ou `null`. O card mostra a foto no topo, em proporção
    4:3 (as fotos são 800×600), com `alt` igual ao nome; sem foto, um quadro neutro do mesmo tamanho.
16. **Crédito (emenda da prática).** O catálogo mostra "Fotos: Pixabay" com link para
    `https://pixabay.com`, em texto discreto (40%) abaixo da grade. Conflita com o briefing de
    solicitar empréstimo ("catálogo sem texto de crédito"); decidido manter: é exigência do contrato
    da skill e da fonte das imagens (ver docs/decisoes-pratica.md, C7).

## Critérios de aceitação

- CA-01 · [back] `GET /v1/equipamentos` devolve só equipamentos do tenant do token, do mais novo ao
  mais antigo.
- CA-02 · [back] A situação é `emprestado` quando há empréstimo em aberto, `manutencao` quando o
  equipamento está em manutenção, e `disponivel` nos demais; nunca `disponivel` para item em manutenção.
- CA-03 · [back] `q` filtra por trecho do nome ou do patrimônio, sem diferenciar maiúsculas.
- CA-04 · [back] `situacao=emprestado` devolve só itens com empréstimo em aberto; idem para os outros valores.
- CA-05 · [back] Com 120 itens e `limite=50`, três páginas via `proximoCursor` cobrem todos sem
  repetir; cadastrar um item entre a primeira e a segunda página não duplica nem pula nenhum.
- CA-06 · [back] `totais.total` e `totais.disponiveis` ignoram `q` e `situacao`.
- CA-07 · [back] Item emprestado traz `pessoaNome`, `devolverAte` e `comigo` correto para quem chama.
- CA-08 · [back] Sem token responde 401; com token de tenant A, itens do tenant B nunca aparecem.
- CA-09 · [back] `limite` fora de 1–100, ou `situacao` inválida, responde 400 em Problem Details.
- CA-10 · [back] Colaborador e Operações recebem a mesma lista.
- CA-11 · [front] O cabeçalho mostra "Catálogo" e "X de Y equipamentos disponíveis agora", com X e Y
  vindos de `totais`.
- CA-12 · [front] Cada card mostra categoria, nome, patrimônio (ou `TI-—`), pill de situação com as
  cores do layout 1 e a linha de detalhe da regra 11.
- CA-13 · [front] Os chips filtram de forma exclusiva; o ativo tem borda e texto no acento e fundo
  `rgba(47,184,172,0.10)`.
- CA-14 · [front] A busca filtra enquanto se digita; sem resultado, mostra "Nenhum equipamento
  encontrado.".
- CA-15 · [front] Os rótulos dos botões seguem a regra 12.
- CA-16 · [front] Item em manutenção tem pill cinza, mostra a observação e nunca aparece sob o chip
  "Disponíveis".
- CA-17 · [front] Enquanto carrega mostra "Carregando catálogo…"; se falhar mostra "Não foi possível
  carregar o catálogo." e o botão "Tentar novamente".
- CA-18 · [front] Quando há `proximoCursor`, aparece "Carregar mais" que acrescenta a próxima página.
- CA-19 · [front] Datas aparecem em `DD/MM/AAAA`.
- CA-20 · [back] Cada item traz `imagemUrl`: a URL pública da foto no Storage, ou `null` sem foto.
- CA-21 · [front] O card mostra a foto em 4:3 com `alt` igual ao nome; sem `imagemUrl`, um quadro
  neutro do mesmo tamanho.
- CA-22 · [front] O catálogo mostra "Fotos: Pixabay" com link para `https://pixabay.com`.

## Fora de escopo / não decidido

- Solicitar empréstimo (spec 006) e o banner de atraso (spec 006).
- Cadastrar ou editar equipamento (spec 005 cadastra; edição não existe na v1).
- Ordenação escolhida pela pessoa, busca ignorando acento (P9).
- Enviar ou trocar foto pela interface (as fotos vêm da skill `imagens-equipamentos`).
- Tempo real (fora de escopo no ADR-001).

## Contrato afetado

- Novo: `GET /v1/equipamentos` → `{ itens: [{ id, nome, categoria, patrimonio, situacao,
  observacao, imagemUrl, emprestimo }], proximoCursor, totais: { total, disponiveis } }`.
  `proximoCursor` vem **ausente** na última página (não `null`): o nestjs-zod 5 publica um campo
  `string | null` do primeiro nível do DTO como array no OpenAPI 3.1, o que quebraria o cliente gerado.
- Nova variável da API: `STORAGE_PUBLIC_URL` (base pública do bucket `equipamentos`).
- Novas tabelas `equipamentos` e `emprestimos` (esta só lida aqui; escrita na spec 006); ver plano.
- Cliente do front regenerado a partir do `openapi.json`.
