# ADR-003 — Região do Supabase

**Status:** aceito
**Substitui:** a linha "Região do Supabase: `sa-east-1` (São Paulo)" do ADR-001

## Contexto

O ADR-001 decidiu `sa-east-1` (São Paulo) para o projeto Supabase. O projeto foi
criado numa região dos EUA (`us-east-1`), e a região de um projeto Supabase não
muda depois de criado. O ADR-001 também registra que as functions da Vercel no
plano Hobby rodam nos Estados Unidos.

## Decisão

| Item | Escolha |
|---|---|
| Região do projeto Supabase | `us-east-1` |

## Justificativa

- Região do projeto: o projeto já existe nessa região, e mudar exigiria criar
  outro projeto e refazer a configuração.
- Efeito no ADR-001: ele listava, em "Fica mais difícil", a latência de cada
  query atravessar dos EUA a São Paulo. Com o banco nos EUA, essa travessia
  deixa de existir. A região exata das functions da Vercel precisa ser
  confirmada nas configurações do projeto na Vercel.

## Alternativas descartadas

- Recriar o projeto em `sa-east-1` — descartada porque cada query das functions
  nos EUA continuaria atravessando o continente, que é justamente o custo que
  o ADR-001 já listava. Se o sistema passar a ser usado de fato pela empresa e a
  hospedagem das functions migrar para o Brasil (plano Pro), este ADR deve ser
  revisto.

## Consequências

- O que fica mais fácil: latência baixa entre as functions e o banco.
- O que fica mais difícil: latência maior para quem acessa do Brasil, em
  qualquer consulta que o navegador faça à API.
- O que isso impede de fazer depois sem custo: mudar a região do banco sem
  recriar o projeto e migrar os dados.

## O que este ADR NÃO decide

- A região das functions da Vercel.
- Backup, retenção e plano de recuperação.
- LGPD: onde dado pessoal pode residir. O sistema guarda nome e e-mail de
  colaboradores; se a política da empresa exigir dados no Brasil, este ADR
  precisa ser revisto.
