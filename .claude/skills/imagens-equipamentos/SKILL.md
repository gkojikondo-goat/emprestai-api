---
name: imagens-equipamentos
description: Prepara as fotos dos equipamentos do catálogo a partir da API do Pixabay — busca, filtra direito de imagem, padroniza em 800×600, evita repetição e registra créditos — e deixa o envio ao Supabase Storage pronto para a pessoa executar. Use quando precisar de foto para equipamento novo, trocar uma foto reprovada ou conferir as fotos existentes. Não use para enviar ao Storage de produção (só a pessoa envia) nem para imagens que não sejam de equipamento (landing, logo).
---

# Imagens dos equipamentos

Contrato completo e como cada requisito é garantido: `references/contrato.md`.
Regras da API do Pixabay (cache, hotlink, campos): `references/pixabay.md`.

## O que é do agente e o que é da pessoa

| Passo | Quem | Por quê |
|---|---|---|
| Buscar, filtrar, baixar, padronizar, registrar créditos | agente (`preparar.mjs`) | determinístico, conferido por código |
| Revisão visual de cada foto | agente olha **e** a pessoa confirma | filtro por tag não enxerga pessoa ao fundo, logo pequeno ou texto na tela |
| Conferir o conjunto | agente (`verificar.mjs`) | mesma conferência que o envio usa |
| Enviar ao Storage de produção | **só a pessoa** (`enviar.mjs`) | exige a chave `service_role`, que o agente nunca tem; o hook `producao-guarda` bloqueia |

## Passo a passo

1. Fonte dos itens: `prisma/dados/equipamentos.json` (não edite à mão para "achar foto melhor").
2. A chave do Pixabay fica em `PIXABAY_API_KEY` no `.env` (gitignored). Nunca em código.
3. Preparar o que falta (só itens sem crédito; `--refazer TI-0005` força um item):
   `node .claude/skills/imagens-equipamentos/scripts/preparar.mjs`
4. Revisão visual: abra cada `imagens/equipamentos/<patrimônio>.jpg`. Reprove o que tiver pessoa,
   marca/logo legível, texto ou tela com conteúdo:
   `node .claude/skills/imagens-equipamentos/scripts/reprovar.mjs TI-0005 "logo legível na tampa"`
   e rode o passo 3 de novo. Toda reprovação fica em `imagens/equipamentos/revisao.json`.
   Item difícil: `preparar.mjs --candidatos TI-0012 [--desde 9]` monta uma folha com 9 candidatas
   aceitas pelas regras; escolha com `preparar.mjs --escolher TI-0012=<id>` (mesmas regras).
   Critério de texto: marca/logo legível e texto de conteúdo reprovam; marcação técnica mínima do
   próprio produto (letras de tecla, "720p", rótulos de botão) é aceita.
5. Conferir: `node .claude/skills/imagens-equipamentos/scripts/verificar.mjs` — precisa sair 0.
6. Commitar fotos, `creditos.json` e `revisao.json`.
7. A pessoa envia (fora do agente): ver `docs/operacao-dados-iniciais.md`.

## Nunca

- Usar imagem de outra origem que não a API do Pixabay (nem "só para testar").
- Apontar o banco ou o Storage para URL do Pixabay (hotlink permanente é proibido pela API).
- Colocar `SUPABASE_SERVICE_ROLE_KEY` em arquivo do repositório ou rodar `enviar.mjs`.
- Instalar outra biblioteca de imagem (ADR-008 escolheu `sharp`).
