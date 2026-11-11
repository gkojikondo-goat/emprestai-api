# Spec — Dados iniciais (prática)

**Status:** aprovada — Gabriel Kondo, 2026-11-10 (aprovou a spec escrita pelo agente)
**Implementada:** não

## Objetivo

O sistema em produção tem os 12 equipamentos da prática, cada um com foto, e a conta do
professor para testar — com zero empréstimos.

## Vínculo

- Briefing "dados iniciais" da prática (é pedido, não spec: ver conflitos abaixo).
- PRD: catálogo com a situação; "equipamento em manutenção não aparece como disponível".
- ADR-001: seed idempotente em `prisma/seed.ts`; segredos fora do repositório; Supabase Storage.
- ADR-008: `sharp` para garantir 800×600. Skill `imagens-equipamentos` (contrato da prática).
- Specs: 002 (tenant e `memberships`), 004 (tabela `equipamentos` e `imagemUrl`).

## Conflitos do briefing e o que foi decidido

| Briefing pede | Conflita com | Decisão |
|---|---|---|
| "TI-0004 e TI-0007 em manutenção; os outros 10 disponíveis" | lista oficial da prática marca também TI-0010 | Seguir a lista: TI-0004, TI-0007 e TI-0010 em manutenção (Gabriel, 2026-11-10) |
| Senha da turma escrita no arquivo que popula os dados | ADR-001 (segredos fora do repositório); regra da prática | Recusado. A conta é criada no painel do Supabase pelo Gabriel; o seed só vincula pelo e-mail |
| Imagens do Pexels (contrato original) | combinado da turma | Pixabay (mudança da turma, 2026-11-10) |
| Instalar `sharp` | rules/restrictions.md | ADR-008 aprovado; só devDependency, só no script da skill |

## Regras

1. Fonte única dos equipamentos: `prisma/dados/equipamentos.json`, cópia literal da lista da prática
   (patrimônio, nome, categoria, situação, termo de busca). Seed e skill leem o mesmo arquivo.
2. O seed faz upsert por (tenant `suporte_ti`, patrimônio): cria o que falta e atualiza nome,
   categoria, situação e foto do que existe. Nunca cria empréstimo, nunca apaga equipamento.
3. Cada equipamento aponta para a foto `<patrimônio>.jpg` do bucket `equipamentos` quando ela consta
   em `imagens/equipamentos/creditos.json`; sem foto aprovada, `imagem_path` fica nulo.
4. Conta do professor (`marcelo.grilo@institutojef.org.br`): criada no painel do Supabase com a
   senha da turma. Se a conta existir em `auth.users`, o seed grava `tenant_id` no
   `raw_app_meta_data` (preservando as demais chaves) e cria o vínculo `colaborador`, nome
   "Marcelo Grilo". Se não existir, o seed avisa e termina sem erro.
5. Nenhuma senha, token ou chave em código ou no histórico do git.
6. Skill `imagens-equipamentos` (contrato da prática):
   - **Fonte:** só a API do Pixabay (`https://pixabay.com/api/`), chave em `PIXABAY_API_KEY` no
     ambiente; download só de `pixabay.com` / `cdn.pixabay.com`. Respostas da busca ficam em cache
     local por 24h (exigência da API).
   - **Direito de imagem:** busca com `image_type=photo` e `safesearch=true`; descarta resultados com
     tags de pessoa, marca/logo, texto ou tela com conteúdo; depois, revisão visual. Fotos
     reprovadas ficam em `imagens/equipamentos/revisao.json` com o motivo e nunca são reusadas.
   - **Mesmo tamanho:** toda foto sai em 800×600 JPEG; o script relê e confere; o envio recusa
     qualquer arquivo fora disso.
   - **Sem repetição:** nenhum id do Pixabay e nenhum conteúdo (hash) se repete entre equipamentos.
   - **Créditos:** `creditos.json` registra, por patrimônio, id, página no Pixabay, autor, link do
     autor, licença (Pixabay Content License) e data.
   - **Armazenamento:** bucket público `equipamentos`, caminho `<patrimônio>.jpg`, envio com upsert —
     repetir não duplica.
   - **Produção:** o agente prepara as fotos, mas não envia. O envio exige
     `SUPABASE_SERVICE_ROLE_KEY` exportada no terminal da pessoa (nunca em arquivo do repositório) e
     o hook `producao-guarda` bloqueia o agente de rodar o envio, o seed e migrations contra produção.

## Critérios de aceitação

- CA-01 · [back] Depois do seed, o tenant `suporte_ti` tem exatamente os 12 patrimônios da lista, com
  nome, categoria e situação da lista.
- CA-02 · [back] TI-0004, TI-0007 e TI-0010 ficam em manutenção, os outros 9 disponíveis, e o seed
  não cria nenhum empréstimo.
- CA-03 · [back] Rodar o seed três vezes não duplica equipamento, tenant nem vínculo.
- CA-04 · [back] Equipamento com foto aprovada aponta para `<patrimônio>.jpg`, e `GET /v1/equipamentos`
  devolve a `imagemUrl` pública dela.
- CA-05 · [back] Com a conta do professor em `auth.users`, o seed grava o `tenant_id` no app_metadata
  (preservando as outras chaves) e cria o vínculo colaborador; a conta continua com zero empréstimos.
  Sem a conta, o seed termina com aviso e código 0.
- CA-06 · [back] Nenhum arquivo versionado contém a senha da turma ou uma chave `service_role`.
- CA-07 · [back] `imagens/equipamentos/` tem 12 JPEG 800×600, um por patrimônio, sem id do Pixabay nem
  conteúdo repetido, cada um com crédito completo em `creditos.json`.
- CA-08 · [back] O preparo só consulta `pixabay.com/api` e só baixa de domínios do Pixabay; qualquer
  outra origem é recusada.
- CA-09 · [back] Resultado com tag de pessoa, marca/logo ou texto é descartado; foto reprovada em
  `revisao.json` nunca é escolhida de novo.
- CA-10 · [back] O envio faz upsert no bucket (rodar duas vezes deixa 12 objetos), recusa arquivo fora
  de 800×600 e não roda sem `SUPABASE_SERVICE_ROLE_KEY`.
- CA-11 · [back] O hook `producao-guarda` bloqueia o agente de rodar o envio, o seed contra o
  Supabase e `prisma migrate deploy`.

## Fora de escopo

- Tela de catálogo (spec 004), cadastro pela interface (spec 005), importação da planilha (PRD).
- Criar a conta do professor por código (exigiria a senha no repositório ou a chave de serviço no agente).

## Operação em produção (executada pelo Gabriel, nunca pelo agente)

Passo a passo em `docs/operacao-dados-iniciais.md`.
