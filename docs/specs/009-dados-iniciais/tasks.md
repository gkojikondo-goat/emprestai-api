# Tarefas — 009 Dados iniciais

Uma tarefa por vez, um commit por tarefa. Tudo no emprestai-api.

- [ ] T1 · `prisma/dados/equipamentos.json` e seed de equipamentos e do professor
      atende: CA-01, CA-02, CA-03, CA-04 (lado do banco), CA-05
      verifico assim: seed três vezes contra Testcontainers com schema `auth` mínimo

- [ ] T2 · Varredura de segredos nos arquivos versionados
      atende: CA-06
      verifico assim: teste falha se a senha da turma ou um JWT `service_role` aparecer

- [ ] T3 · Skill: SKILL.md, references e `lib.mjs`
      atende: base de CA-07 a CA-10
      verifico assim: testes das regras puras (origem, tags, conferência de JPEG)

- [ ] T4 · `preparar.mjs` e `verificar.mjs`
      atende: CA-08, CA-09
      verifico assim: processo contra Pixabay falso: só origens do Pixabay, tags e reprovadas descartadas

- [ ] T5 · `enviar.mjs`
      atende: CA-10
      verifico assim: processo contra Storage falso: upsert, recusa fora de 800×600, exige a chave

- [ ] T6 · Hook `producao-guarda`
      atende: CA-11
      verifico assim: entradas simuladas de envio, seed com URL do Supabase e migrate deploy

- [ ] T7 · Rodar a skill de verdade (chave do Pixabay do Gabriel), revisão visual e fotos versionadas
      atende: CA-07, CA-04
      verifico assim: `verificar.mjs` passa; revisão registrada em `revisao.json`

- [ ] T8 · `docs/operacao-dados-iniciais.md`
      atende: operação em produção (passos do Gabriel)
      verifico assim: leitura; cada passo diz quem executa e como conferir
