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
| `npm test` | Testes (Vitest, rodando no Node do Electron por causa do better-sqlite3) |
| `npm run db:generate` | Gera migration após alterar `src/main/db/schema.ts` |
| `npm run build:win` / `npm run build:mac` | Gera instalador |

Os instaladores de Windows e macOS também são gerados pelo GitHub Actions ([.github/workflows/build.yml](.github/workflows/build.yml)) ao criar uma tag `v*` ou manualmente pela aba Actions. O instalador Windows precisa ser gerado numa máquina Windows por causa dos módulos nativos (SQLite, sharp).

As migrations em `drizzle/` rodam automaticamente ao abrir o app.
O banco fica em `userData/sptoys.db` (macOS: `~/Library/Application Support/SpToys 1977/`).

## Estrutura

```
src/main       processo principal: banco, serviços (regras de negócio), handlers IPC
src/preload    ponte segura (window.api.invoke)
src/shared     tipos da API IPC e utilitários compartilhados
src/renderer   interface React
drizzle/       migrations SQL
```

## Suporte: senha de administrador esquecida

A senha protege os dados restritos dos produtos (preço de compra, preço máximo de negociação, observações internas). Se ela for esquecida, feche o app, faça uma cópia do `sptoys.db` e remova a senha:

```bash
sqlite3 sptoys.db "delete from settings where key = 'admin_password'"
```

Ao abrir o app de novo, cadastre uma nova senha em Configurações. Os dados restritos são mantidos.
