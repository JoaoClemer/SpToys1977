# SpToys 1977

App desktop (Electron + React + SQLite) para gestão de estoque, vendas e entregas de uma loja de antiguidades.

Planejamento completo: [docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md)

## Desenvolvimento

```bash
npm install
npm run dev
```

| Script | O que faz |
|---|---|
| `npm run dev` | App em modo desenvolvimento (HMR) |
| `npm run typecheck` / `npm run lint` | Verificações |
| `npm test` | Testes unitários (Vitest) |
| `npm run db:generate` | Gera migration após alterar `src/main/db/schema.ts` |
| `npm run build:win` / `npm run build:mac` | Gera instalador |

As migrations em `drizzle/` rodam automaticamente ao abrir o app.
O banco fica em `userData/sptoys.db` (macOS: `~/Library/Application Support/SpToys 1977/`).

## Estrutura

```
src/main       processo principal: banco, repositórios, handlers IPC
src/preload    ponte segura (window.api.invoke)
src/shared     tipos da API IPC e utilitários compartilhados
src/renderer   interface React
drizzle/       migrations SQL
```
