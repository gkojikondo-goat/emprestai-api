# Contrato da skill e como cada requisito é garantido

Origem: enunciado da prática (Entrega 2), com a troca Pexels → Pixabay combinada pela turma.
Os critérios testáveis estão na spec 009 (CA-07 a CA-11).

| Requisito | Garantia | Tipo | Onde |
|---|---|---|---|
| Fonte: só a API do Pixabay | URL da API fixa; download recusado fora de `pixabay.com`/`*.pixabay.com` | código | `lib.mjs` `baseApi`, `origemPermitida` |
| Direito de imagem (sem pessoa, marca/logo, texto, tela com conteúdo) | `image_type=photo`, `safesearch=true`, descarte por tags proibidas; depois revisão visual registrada | código + revisão humana | `lib.mjs` `tagsProibidas`; `reprovar.mjs`; `revisao.json` |
| Mesmo tamanho 800×600 | `sharp` recorta 4:3 (`attention`) e redimensiona; o script relê o cabeçalho JPEG; o envio recusa outro tamanho | código | `padronizar`, `dimensoesJpeg`, `conferirConjunto` |
| Sem repetição | id do Pixabay já usado é pulado; conferência de id e de SHA-256 únicos | código | `preparar.mjs`, `conferirConjunto` |
| Créditos | `creditos.json` com id, página, autor, link do autor, licença e data; conferido campo a campo | código | `conferirConjunto` |
| Armazenamento: bucket público, sem duplicar | caminho fixo `<patrimônio>.jpg`, `x-upsert: true`, bucket criado público se faltar | código | `enviar.mjs` |
| Produção: agente prepara, não envia | envio exige `SUPABASE_SERVICE_ROLE_KEY` no ambiente da pessoa (o script não lê `.env`); hook bloqueia o agente | código + harness | `enviar.mjs`; `.claude/hooks/producao-guarda.cjs` |
| Segredos e dependências | chave do Pixabay só no `.env`; varredura de segredos no histórico; só `sharp` (ADR-008) | código + ADR | spec 009 CA-06; ADR-008 |
| Crédito na tela | "Fotos: Pixabay" com link no catálogo | código (front) | spec 004 CA-22 |

## Por que essa divisão

- Tudo que pode ser conferido olhando bytes, URLs e JSON virou código e teste: não depende de o
  agente lembrar.
- O que depende de olhar a foto (pessoa ao fundo, logo pequeno, texto numa tela) não é confiável
  por tag; fica com revisão visual, e a decisão fica registrada para não voltar.
- Enviar a produção é irreversível para quem está avaliando: fica com a pessoa, e o harness impede o
  agente de fazer por engano.
