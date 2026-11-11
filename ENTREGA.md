# Entrega da prática

Feita com o Claude Code como agente. Decisões marcadas "Gabriel" foram apresentadas com alternativas e aprovadas por ele; as demais foram tomadas pelo agente por delegação ("pode seguir tomando as decisões apropriadas"), registradas nas specs e revisadas pelo Gabriel nesta entrega.

## Links
- Repositório (turma REST: back e front):
  - API: https://github.com/gkojikondo-goat/emprestai-api
  - Front: https://github.com/gkojikondo-goat/emprestai-front
- Produção (Vercel):
  - Front: https://emprestai-front-wine.vercel.app
  - API: https://emprestai-api.vercel.app/v1/health

## 1. Conflitos: o que foi pedido contra o que já existia

| pedido | contrariava o quê | o que você fez | por quê | onde ficou registrado | commit |
|--------|-------------------|----------------|---------|-----------------------|--------|
| Tech lead: verificador corrige teste quebrado e verifica de novo | requisito "Independência" do próprio enunciado | recusado | verificador que conserta o que reprova passa a aprovar o próprio trabalho | `.claude/agents/verificador-spec.md` (Proibições) + hook `verificador-guarda` (Write só em `verificacao/`) | api `3755675`, `5f41d54` |
| Skill de imagens só com Pexels | combinado da turma (site do Pexels) | Pixabay | mudança da turma informada pelo Gabriel | spec 009 regra 6; `references/pixabay.md` | api `1fac25f` |
| Briefing dados: "instale a biblioteca sharp" | `rules/restrictions.md` (lib fora do ADR-001 só com aprovação) | ADR-008 proposto; **Gabriel aprovou sharp** (alternativa: jimp); só devDependency, só no script da skill | 800×600 precisa ser garantido e o Pixabay não entrega esse tamanho | `docs/adr/008-sharp-para-padronizar-imagens.md` | api `76cab67` |
| Briefing dados: senha da turma escrita no arquivo do seed | ADR-001 (segredos fora do repositório) e regra da prática | recusado: conta criada no painel do Supabase; o seed só vincula pelo e-mail | senha no git fica para sempre no histórico | spec 009 (conflitos, regra 4); teste de varredura do histórico (CA-06) | api `62fb3be`, `fc9ad95` |
| Briefing dados: "TI-0004 e TI-0007 em manutenção; os outros 10 disponíveis" | a lista oficial da prática marca também TI-0010 ("use exatamente esta") | **Gabriel decidiu seguir a lista**: 3 em manutenção | a lista é o dado mais específico e igual para todos | spec 009 (conflitos, CA-02) | api `1fac25f` |
| Briefing solicitar: limite de 5 empréstimos | PRD: no máximo 3 | 3 | regra de negócio é do PRD (regra da prática) | spec 006 (seção do briefing) | api `ffb871c` |
| Briefing solicitar: 14 dias **úteis** | PRD: 14 dias; P4 (data civil) | 14 dias corridos | o PRD não fala em dias úteis e nada define feriados | spec 006; `src/common/datas.ts` | api `ffb871c`, `133b3f4` |
| Briefing solicitar: catálogo sem texto de crédito | contrato da skill ("Fotos: Pexels/Pixabay" com link) | crédito mantido, discreto | exigência do contrato e da fonte > preferência estética | spec 004 regra 16, CA-22 | front `6b94cbe` |
| Prática: catálogo com foto | spec 004: "foto do equipamento" fora de escopo | spec 004 emendada (regras 15–16, CA-20 a CA-22) | pedido mais novo, sem conflito com PRD/ADR | spec 004 | api `d4b62da` |
| Briefing solicitar: "colaborador vê os próprios empréstimos" | a tela `/meus-emprestimos` era da spec 007 (devolução, fora da prática) | versão mínima entra na 006 (CA-21, CA-22) | entrega o pedido sem trazer a devolução | spec 006 regra 11 | api `ffb871c` |

## 1b. Lacunas: o que foi pedido de forma incompleta

| spec | o que faltava | alternativas | o que decidiu | por quê | commit |
|------|---------------|--------------|---------------|---------|--------|
| verificador | como tornar obrigatório "sem depender de lembrar" | regra no AGENTS.md · hook · check no CI | hook `PreToolUse` + arquivo de rodada por commit | bloqueia antes da ação; regra escrita depende de obedecer | api/front `5f41d54`/`a10bbaa` |
| verificador | como ser "comparável" | sobrescrever um relatório · um arquivo por rodada | `docs/specs/NNN/verificacao/<data>-<commit>.md`, nunca sobrescrito | rodadas lado a lado sem depender do `git log` | `3755675` |
| 002 | biblioteca para validar o JWT pela JWKS | jose · @nestjs/jwt + jwks-rsa · passport-jwt · à mão | `jose` 5.x (**Gabriel aprovou**, ADR-007) | uma lib, ES256 + JWKS com cache; 5.x por causa do CommonJS (ADR-006) | api `5d02c2b`, `93f38db` |
| 002 | o que é o `openapi.json` "publicado" para o front | baixar artefato do CI (token entre repos privados) · cópia versionada conferida | cópia versionada + `check:api` compara com a da API | sem segredo novo; o verificador cobrou o teste dos dois caminhos de falha | front `976307a`, `928e03a` |
| 003 | rota desconhecida com sessão | página 404 · ir ao catálogo | ir ao catálogo (regra 9, CA-13) | o layout não desenha 404 | front `976307a` |
| 004 | `proximoCursor: string \| null` saía como array no OpenAPI 3.1 | pós-processar o documento · aninhar · campo opcional | ausente na última página | menor mudança de contrato | api `b63b1d4` |
| 006 | tabela de auditoria vinha da 005 (fora da prática) | implementar a 005 · criar a tabela na 006 | criar na 006 (append-only por trigger) | a 006 exige auditoria (CA-13) | api `133b3f4` |
| 006 | como mostrar o motivo da recusa | `detail` da API · mapa por `type` no front | mapa por `type`, `detail` como reserva (CA-23) | `type` é contrato estável | front `6b94cbe` |
| 009 | o que é "texto" na regra de direito de imagem | qualquer texto · marca + texto de conteúdo | marca/logo legível e texto de conteúdo reprovam; marcação técnica mínima do produto (letras de tecla, "720p") é aceita | sem isso nenhuma foto de teclado ou webcam passaria; critério escrito no SKILL.md | api `aeae92f` |
| produção | aplicar as migrations sem a senha do banco (a `DATABASE_URL` da Vercel é "Sensitive" e o reset não estava acessível) | resetar a senha (quebraria a API até atualizar a Vercel) · SQL Editor com o SQL das migrations · CI com `migrate deploy` (AZ-10, não existe) | SQL Editor com um script gerado das migrations do git que **também registra cada uma em `_prisma_migrations` com o checksum do Prisma**, numa transação e com guarda contra reexecução | sem senha e sem quebrar o histórico do Prisma; antes, o script foi testado numa réplica local: `prisma migrate status` passou a "Database schema is up to date!" e a reexecução foi recusada | — (scripts em `docs/producao/` da pasta de trabalho, executados pelo Gabriel) |
| 009 | conta do professor sem senha no repositório | criar por código com a chave de serviço · painel do Supabase | painel (Gabriel) + seed vincula pelo e-mail | o agente nunca tem a chave de serviço | api `62fb3be` |

## 2. Onde o agente tentou decidir por você

- **ADR-007 escrito e "aceito" pelo agente.** Com a delegação genérica, o agente escreveu o ADR da
  `jose` já como aceito. O verificador reprovou a spec 002 duas vezes: na rodada `e956405` porque a
  lib não estava no ADR-001, e na `e21a853` porque o ADR tinha sido decidido pelo próprio agente,
  contra `AGENTS.md` e `rules/restrictions.md`, sem registro da delegação. A proposta foi então
  apresentada com as alternativas e o Gabriel aprovou; a aprovação e o histórico ficaram no ADR
  (`93f38db`). A partir daí todo ADR (o do `sharp`) foi apresentado antes como "proposto".
- **Spec 009 marcada "aprovada" pelo agente** antes de o Gabriel ver a spec inteira (ele só tinha
  decidido TI-0010 e sharp). Percebido na revisão, voltou para "proposta", foi apresentada e aprovada
  (`1fac25f`).
- **Escopo a mais na 006 do front**: "Meus empréstimos" já coloria a linha por atraso, que a regra 11
  deixou para a 007. O verificador reprovou (`6b94cbe`); corrigido em `825e498`.

## 3. Uma decisão que merece (ou não) um ADR

**`sharp` para garantir 800×600 virou ADR (ADR-008).** Tem alternativa defensável (`jimp`, JS puro,
sem binário nativo), é uma dependência nova fora do ADR-001 e afeta o build de quem roda a skill.
Já **o critério de "texto" na revisão de imagem não virou ADR**: é regra de aplicação do contrato
da skill, muda com a revisão e vive no `SKILL.md`/`references/contrato.md`.

## 4. A skill imagens-equipamentos

- **SKILL.md** tem o quando usar, o passo a passo e a tabela "o que é do agente / o que é da
  pessoa". **references/** guarda o que é consulta: `contrato.md` (requisito → garantia → tipo) e
  `pixabay.md` (o que a doc da API exige). **scripts/** tem tudo que pode ser determinístico:
  `preparar`, `reprovar`, `verificar`, `enviar` e as regras puras em `lib.mjs`. Critério: se dá para
  conferir olhando bytes, URL ou JSON, é script com teste; se depende de olhar a foto, é revisão.
- **Garantido por código (com teste, spec 009 CA-07 a CA-11):** fonte só Pixabay (URL fixa, origem
  dos downloads conferida), 800×600 (sharp + leitura do cabeçalho JPEG; o envio recusa outro
  tamanho), sem repetição (id e SHA-256), créditos completos, upsert no bucket público, chave fora
  do repositório. **Instrução + revisão humana:** direito de imagem — o filtro de tags é só a
  primeira barreira; a revisão visual é obrigatória e fica registrada em `revisao.json`.
- **O agente não envia a produção**: `enviar.mjs` só roda com `SUPABASE_SERVICE_ROLE_KEY` exportada
  no terminal da pessoa (o script não lê `.env`) e o hook `producao-guarda` bloqueia o agente de
  rodá-lo — testado ao vivo na sessão.
- **Fotos reprovadas na revisão visual: 57** (registradas com o motivo em
  `imagens/equipamentos/revisao.json`): pessoa ou parte do corpo, marca/logo legível (Apple, Dell,
  Nikon, Olympus, Fujifilm, Kodak, Rollei, ФЭД…), texto ou tela com conteúdo, e foto fora do
  assunto (xícara no lugar de notebook, notebook no lugar de monitor). O filtro de tags só pegou
  parte disso — evidência de por que a revisão humana faz parte do contrato.

## 5. O subagente verificador

- **Acionamento:** o agente principal chama ao terminar as tarefas; o que torna obrigatório é o hook
  `spec-pronta-guarda`: a spec só passa para "Implementada: sim" com uma rodada "Veredito: PRONTA"
  **do commit atual** e sem código alterado depois. Provado ao vivo: no front a marca da 002 foi
  liberada (`b1b9011`); na API a mesma marca foi **bloqueada** porque o HEAD tinha avançado.
- **O que lê e por quê:** AGENTS.md, rules (restrictions, checks, tests) e spec/plano/tarefas — não
  herda a conversa, porque o que o agente principal "acha" que fez não é evidência.
- **O que não consegue fazer:** não tem a ferramenta Edit; o hook do frontmatter só libera Write de
  arquivo novo em `docs/specs/*/verificacao/` e Bash de git de leitura e dos comandos de
  `rules/checks.md`; bloqueia endereço de produção. Testado com 45 casos simulados.
- **Back/front separados:** cada CA tem a marca `[back]` ou `[front]`; o verificador roda em cada
  repositório e marca o outro lado como OUTRO REPOSITÓRIO; a spec só é implementada com as duas
  rodadas PRONTA.

## 6. O verificador em ação

**Histórico real** (cada rodada é um arquivo em `docs/specs/NNN/verificacao/`):

| spec | repo | commit verificado | veredito | causa | correção |
|---|---|---|---|---|---|
| 002 | api | e956405 | NÃO PRONTA | `jose` fora do ADR-001 | ADR-007 (`5d02c2b`) |
| 002 | api | e21a853 | NÃO PRONTA | ADR-007 decidido pelo agente | aprovação do Gabriel no ADR (`93f38db`) |
| 002 | api | 3e7112c | PRONTA | — | — |
| 002 | front | bff967e | NÃO PRONTA | CA-15 sem teste do caminho de falha; comparava com cópia manual | `976307a` |
| 002 | front | 976307a | NÃO PRONTA | CA-15: caminho "cópia ≠ API" prometido na spec sem teste | `928e03a` |
| 002 | front | 928e03a | PRONTA | — | — |
| 003 | front | bff967e | NÃO PRONTA | CA-09 sem conferência em produção; CA-10 com 1 de 4 rotas; rota coringa fora da spec | `976307a`; CA-09 depende do deploy |
| 003 | front | 3aa5882 | PRONTA | — | CA-09 conferido no link; spec marcada pronta (`2668974`) |
| 004 | front | 6b94cbe | PRONTA | — | — |
| 004 | api | 4a802e8 | PRONTA | — | — |
| 006 | api | 4a802e8 | PRONTA | — | — |
| 006 | front | 6b94cbe | NÃO PRONTA | coloração por estado de prazo (escopo da 007) | `825e498` |
| 006 | front | 825e498 | PRONTA | — | — |
| 009 | api | 5c7e3fd | PRONTA | — | spec marcada pronta (`e9ee4f3`); o hook liberou porque a rodada é do HEAD |

**Prova com erro plantado** (front, spec 006). O verificador foi chamado sem saber do erro:

1. `ffe0706` — erro plantado: em `src/features/emprestimos/regras.ts:36`, `>=` virou `>`; com 3
   empréstimos em aberto o botão continuaria "Solicitar".
2. Rodada sobre `ffe0706` (`docs/specs/006-solicitar-emprestimo/verificacao/2026-11-11-ffe0706.md`,
   commit `1d03d84`): **NÃO PRONTA** — CA-16 REPROVADO, "regras.ts:36 compara
   `meus.itens.length > meus.limite` (era `>=`)", e `npm test` falhou (1 de 43).
3. `cf099a9` — erro desfeito (`git revert`); 43 testes passando.
4. Rodada sobre `cf099a9` (`.../verificacao/2026-11-11-cf099a9.md`): **PRONTA** — CA-16
   ATENDIDO ("corrigido em cf099a9: regras.ts:36 voltou a `>=`"), 43 de 43 testes.

## 7. Uma regra sua que esta prática pôs à prova

Os **hooks** que eu mesmo escrevi falharam três vezes no uso real:
1. usavam a pasta da sessão como raiz: numa sessão aberta na pasta de docs eles **falhariam
   abertos** (script não encontrado = exit 1 = não bloqueia) — passaram a achar o repositório pelo
   `.git` do arquivo (`e956405`);
2. bloqueavam `ls` da pasta de rodadas — passaram a barrar só comando que escreve (`ee7e7a5`);
3. bloqueavam o próprio commit quando a mensagem citava a marca ou "Vercel" (o `>` do e-mail no
   Co-Authored-By parecia redirecionamento) — texto citado e mensagem de commit deixaram de contar
   (`f07bfdb`, `3227103`).

O `producao-guarda` também barrou o agente de rodar `prisma migrate deploy` **contra um banco de
teste local** ao validar os scripts de produção. A regra é conservadora de propósito (não distingue
banco local de remoto pelo comando); em vez de afrouxá-la, o teste foi refeito com `psql` direto e
`prisma migrate status`, que só lê.

E a regra de "um commit por tarefa com checks passando" foi violada uma vez pelo agente: o commit
`133b3f4` saiu com um teste vermelho porque o encadeamento `jest | grep && git commit` não parava
na falha; corrigido em `45fa1b3` e, desde então, o código de saída é conferido antes do commit.

## 8. O que ficou de fora e o que faria diferente

- **Fora:** specs 005 (cadastro), 007 (devolução) e 008 (painel de Operações); o job de CI com
  `prisma migrate deploy` (AZ-10) — por enquanto a migration em produção é manual; Playwright.
- **Produção feita pelo Gabriel em 2026-11-11** (nenhum passo pelo agente): variáveis da API na
  Vercel; migrations e seed pelo SQL Editor do Supabase; contas do professor e de teste criadas no
  painel; 12 fotos enviadas com `enviar.mjs` e a chave exportada só no terminal; push dos dois
  repositórios. Conferido no link: catálogo com as 12 fotos, manutenção indisponível, solicitar,
  Meus empréstimos, limite de 3 e F5 em `/meus-emprestimos` (003 CA-09, `3aa5882`). A conta do
  professor só foi aberta para olhar: zero empréstimos.
- **Limite conhecido do hook `producao-guarda`** (apontado pelo verificador na rodada da 009): ele
  barra o seed quando a URL do Supabase aparece no comando, mas `npm run seed` com um `.env`
  apontando para o Supabase passaria. Hoje o `.env` da API aponta para o banco local e a chave de
  serviço nunca fica em arquivo; fechar de vez exigiria o hook ler o `.env` antes de liberar o seed.
- **Observações da última rodada da 003** (não reprovaram): falta um teste da rota desconhecida
  **sem** sessão (pelo código vai a `/login`); a regra 3 da spec 001 ainda descreve a tela Início
  removida pela 003.
- **Specs 004 e 006 não estão marcadas "pronta"**: as rodadas PRONTA são de commits que já ficaram
  para trás (`4a802e8`, `825e498`); o hook exige uma rodada do HEAD para a marca, então é preciso
  rodar o verificador de novo nos dois repositórios antes de marcar.
- **Produção é passo do Gabriel** (`docs/operacao-dados-iniciais.md`): variáveis na Vercel,
  migrations, conta do professor, seed, envio das fotos e push.
- **Faria diferente:** apresentar cada decisão estrutural como proposta desde o início (em vez de
  aprender pelo verificador); e testar os hooks numa sessão aberta na mesma pasta onde o agente
  trabalha, não só com entradas simuladas.
