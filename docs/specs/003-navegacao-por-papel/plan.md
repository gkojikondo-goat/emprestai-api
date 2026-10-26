# Plano — 003 Navegação por papel

Deriva de docs/specs/003-navegacao-por-papel/spec.md.

## Restrições que este plano obedece

- docs/adr/001-stack.md — React Router (data APIs), Tailwind, Zustand, TanStack Query.
- docs/layout.md — seções 1, 2, 3, 5.6 e 6.
- rules/restrictions.md — nenhuma biblioteca fora do ADR-001.

## Bibliotecas novas (todas previstas no ADR-001)

- `react-router` (data APIs com `createBrowserRouter`), `zustand`.
- shadcn/ui continua adiado: a barra e o toast são componentes próprios simples.

## Organização de pastas proposta

```
src/
  app/
    router.tsx               createBrowserRouter; loaders de proteção
    RootLayout.tsx           barra + <Outlet/>
  components/
    NavBar.tsx
    Toast.tsx
  stores/
    toast.ts                 Zustand: mostrar(mensagem)
  features/
    auth/                    já existe (sessão, login); useMe vem da spec 002
  pages/
    CatalogoPage.tsx  MeusEmprestimosPage.tsx  OperacoesPage.tsx  EquipamentosPage.tsx
vercel.json                  rewrite de qualquer caminho para /index.html
```

## Como cada parte será feita

- Proteção por sessão no `loader` das rotas (CA-01, CA-02); proteção por papel num `loader` das
  rotas de Operações que lê o papel de `/v1/me` (CA-05).
- `NavBar` deriva as abas do papel (CA-03, CA-04); enquanto `useMe` carrega, mostra só a marca (CA-12).
- Iniciais: primeira letra do primeiro e do último nome (CA-07).
- `Toast` lê o store Zustand; temporizador de 2600ms (CA-11).
- `vercel.json` com rewrite (CA-09); verificar na URL de produção depois do deploy.
- Páginas provisórias com título e "Em construção." (CA-10).

## Testes

Vitest + Testing Library para abas por papel, redirecionamentos e toast (CA-01 a CA-08, CA-10 a
CA-12). CA-09 se prova no navegador contra o deploy.
