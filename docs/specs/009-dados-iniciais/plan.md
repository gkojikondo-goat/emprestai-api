# Plano — 009 Dados iniciais

Deriva de docs/specs/009-dados-iniciais/spec.md.

## Restrições que este plano obedece

- ADR-001 (seed idempotente, segredos fora do repositório), ADR-008 (`sharp` só no script da skill).
- rules/restrictions.md, rules/checks.md, rules/tests.md.
- Regra da prática: o agente nunca escreve em produção.

## Bibliotecas novas

Nenhuma além do `sharp` (ADR-008). HTTP com o `fetch` do Node 24.

## Organização

```
prisma/dados/equipamentos.json            fonte única dos 12 itens (lista da prática)
prisma/seed.ts                            + equipamentos e vínculo do professor
imagens/equipamentos/<patrimônio>.jpg     fotos 800×600 (versionadas: licença permite)
imagens/equipamentos/creditos.json        créditos por patrimônio
imagens/equipamentos/revisao.json         fotos reprovadas na revisão visual, com motivo
.claude/skills/imagens-equipamentos/
  SKILL.md                                quando usar, passo a passo, o que é do agente e da pessoa
  references/contrato.md                  os 9 requisitos e como cada um é garantido
  references/pixabay.md                   o que a doc da API exige (cache, hotlink, campos)
  scripts/lib.mjs                         regras puras: origem, filtro de tags, padronização, conferência
  scripts/preparar.mjs                    busca, escolhe, baixa, padroniza e grava créditos
  scripts/verificar.mjs                   confere os 12 arquivos contra o contrato
  scripts/enviar.mjs                      upsert no Storage (só a pessoa roda)
.claude/hooks/producao-guarda.cjs         bloqueia envio, seed e migrate contra produção
docs/operacao-dados-iniciais.md           passo a passo de produção para o Gabriel
```

## Como cada parte será feita

- Seed: `INSERT … ON CONFLICT (tenant_id, patrimonio) DO UPDATE` (CA-01 a CA-03). Professor: se
  `to_regclass('auth.users')` existir e a conta estiver lá, `UPDATE auth.users SET raw_app_meta_data =
  raw_app_meta_data || jsonb_build_object('tenant_id', …)` e upsert em `memberships` (CA-05).
- Preparar: para cada item, consulta o Pixabay (cache de 24h em `.cache/pixabay/`), descarta tags
  proibidas, ids já usados e reprovados; baixa `largeImageURL`; `sharp` → 800×600 `cover` +
  `attention`, JPEG 82, sem metadados; grava crédito.
- Verificar e enviar compartilham a conferência de `lib.mjs` (cabeçalho JPEG 800×600, ids e hashes
  únicos, crédito completo). Enviar faz `POST /storage/v1/object/equipamentos/<arquivo>` com
  `x-upsert: true` e cria o bucket público se faltar.
- Para testes, a base da API do Pixabay e a do Storage podem apontar para `http://127.0.0.1:<porta>`
  (servidor falso do teste); qualquer outro host é recusado.

## Testes

Jest: seed real contra Testcontainers (CA-01 a CA-05, com um schema `auth` mínimo criado no teste);
varredura dos arquivos versionados (CA-06); conferência das fotos versionadas (CA-07); scripts da
skill rodados como processo contra servidores HTTP falsos do Pixabay e do Storage (CA-08 a CA-10);
hook rodado com entradas simuladas (CA-11).
