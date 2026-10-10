# SpToys1977: Planejamento

App desktop para gerenciar uma loja de antiguidades: estoque, vendas e entregas. Roda offline, com banco local.

---

## 1. Escopo do MVP

### Produtos (estoque)
- Cadastrar produto: **nome**, descrição, categoria (opcional), **preço original**, **quantidade**, **várias fotos** (uma principal, reordenáveis)
- Editar, arquivar e buscar/filtrar (nome, categoria, disponível ou esgotado)
- Ver o histórico de vendas de cada produto

### Vendas (baixa no estoque)
- Registrar venda a partir de um produto: quantidade vendida, **preço de venda** (vem preenchido com o preço original e pode ser alterado), data
- Dados do comprador: **nome** (obrigatório), **endereço** e **telefone** (opcionais)
- **Frete** (opcional)
- A quantidade vendida é descontada do estoque automaticamente. Quando o estoque chega a 0, o produto fica marcado como **vendido/esgotado**
- Cancelar a venda devolve a quantidade ao estoque

### Entrega
- Método: **Presencial** ou **Correios**
- Status:
  - Presencial: `Aguardando retirada` → `Entregue` (com data)
  - Correios: `Aguardando envio` → `Enviado` (data + **código de rastreio**) → `Entregue` (data)
- Tela de pendências mostrando o que falta enviar e o que foi enviado mas ainda não chegou

### Extras que valem a pena no MVP
- Dashboard simples: itens em estoque, valor do estoque, vendas do mês, entregas pendentes
- Backup e restauração do banco e das fotos (exporta um `.zip`)

---

## 2. Stack técnica

| Camada | Escolha | Motivo |
|---|---|---|
| Shell | **Electron** | Pedido original, multiplataforma |
| Build/dev | **electron-vite** | Configura main/preload/renderer com Vite e HMR |
| UI | **React + TypeScript** | |
| Estilo/componentes | **Tailwind CSS + shadcn/ui** | Componentes prontos e bonitos, fáceis de customizar |
| Rotas | **React Router** | |
| Formulários | **react-hook-form + zod** | Validação tipada, e os schemas são reaproveitados no processo main |
| Estado do servidor | **TanStack Query** (sobre IPC) | Cache e invalidação após mutações |
| Banco | **SQLite via better-sqlite3** | Síncrono, rápido e estável no Electron |
| ORM / migrations | **Drizzle ORM + drizzle-kit** | Tipos gerados do schema, migrations versionadas |
| Empacotamento | **electron-builder** | Gera instaladores (.dmg / .exe) e recompila o módulo nativo |
| Testes | **Vitest** (lógica/repos) + **Playwright** (E2E, depois) | |

### Arquitetura

```
renderer (React)  ──window.api.*──▶  preload (contextBridge)  ──ipcRenderer.invoke──▶  main
                                                                                       ├─ services (regras de negócio)
                                                                                       ├─ repositories (Drizzle)
                                                                                       └─ SQLite + pasta de fotos
```

- `contextIsolation: true`, `nodeIntegration: false`. O renderer nunca acessa o banco diretamente.
- API tipada e compartilhada (`src/shared/api.ts`) entre preload e renderer
- Validação com zod também no main, porque o IPC não é confiável por padrão
- Operações que mexem em várias tabelas (venda + baixa de estoque) rodam em **transação**

### Armazenamento de arquivos
- Banco: `app.getPath('userData')/sptoys.db`
- Fotos: `userData/photos/<uuid>.jpg`. O banco guarda só o nome do arquivo.
- Ao importar, a foto é redimensionada (ex.: máx. 1600px) e é gerada uma miniatura (ex.: 300px) com **sharp**
- As fotos são servidas ao renderer por um protocolo customizado (`app-photo://`), sem precisar expor o `file://`

---

## 3. Modelo de dados

Valores monetários ficam em **centavos (INTEGER)** para evitar erros de ponto flutuante.

```sql
products
  id              INTEGER PK
  name            TEXT NOT NULL
  description     TEXT
  category        TEXT
  original_price  INTEGER NOT NULL      -- centavos
  quantity        INTEGER NOT NULL DEFAULT 0   -- quantidade atual em estoque
  archived        INTEGER NOT NULL DEFAULT 0
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL

product_photos
  id              INTEGER PK
  product_id      INTEGER FK → products
  file_name       TEXT NOT NULL
  position        INTEGER NOT NULL DEFAULT 0   -- 0 = foto principal

customers                                 -- permite reaproveitar compradores (autocomplete)
  id              INTEGER PK
  name            TEXT NOT NULL
  phone           TEXT
  address         TEXT
  created_at      TEXT NOT NULL

sales
  id              INTEGER PK
  product_id      INTEGER FK → products
  customer_id     INTEGER FK → customers
  quantity        INTEGER NOT NULL
  unit_price      INTEGER NOT NULL      -- centavos, preço efetivamente praticado
  sold_at         TEXT NOT NULL
  -- snapshot do comprador no momento da venda (histórico não muda se o cliente for editado)
  buyer_name      TEXT NOT NULL
  buyer_address   TEXT
  buyer_phone     TEXT
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_person','mail'))
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending','shipped','delivered'))
  shipping_cost   INTEGER               -- centavos, opcional
  tracking_code   TEXT
  shipped_at      TEXT
  delivered_at    TEXT
  canceled_at     TEXT
  notes           TEXT
```

**Status "vendido" do produto:** é derivado de `quantity = 0`. Para peças únicas (o caso mais comum em antiquário), a venda zera o estoque e o produto aparece como "Vendido".

**Regras de negócio (service de vendas):**
1. `quantity` da venda deve ser ≤ estoque atual
2. Em transação: inserir a venda, decrementar `products.quantity` e criar ou atualizar o cliente
3. `mail` → `pending` → `shipped` exige `tracking_code` → `delivered`
4. `in_person` → pode ir direto para `delivered` (atalho "entregue no ato")
5. Endereço e telefone são sempre opcionais. Só o nome do comprador é obrigatório.
6. Cancelar a venda devolve a quantidade ao estoque (em transação)

---

## 4. Telas

1. **Dashboard**: cards de resumo e lista de entregas pendentes
2. **Estoque**: grade/tabela com miniatura, nome, preço, quantidade e status; busca e filtros; botão "Novo produto"
3. **Produto (form)**: campos, upload/arrastar foto(s), preview
4. **Detalhe do produto**: fotos, dados, histórico de vendas, botão "Registrar venda"
5. **Registrar venda (modal)**: quantidade, preço, comprador (autocomplete de clientes), método de entrega
6. **Vendas**: lista com filtros (período, método, status de entrega)
7. **Detalhe da venda**: ações "Marcar como enviado" (pede o código de rastreio), "Marcar como entregue", link para rastrear nos Correios, "Cancelar venda"
8. **Configurações**: backup/restaurar, pasta de dados

---

## 5. Estrutura de pastas

```
src/
  main/
    index.ts              # cria janela, registra IPC e protocolo de fotos
    db/
      client.ts           # conexão better-sqlite3 + drizzle, função norm() p/ busca sem acento
      schema.ts           # tabelas drizzle
    services/             # regras de negócio + consultas (produtos, vendas, painel, fotos, backup)
    ipc/                  # handlers por domínio
  preload/
    index.ts              # expõe window.api
  shared/
    api.ts                # tipos da API IPC
    schemas.ts            # schemas zod (validados no main)
    money.ts              # formatação BRL <-> centavos
  renderer/src/
    components/           # ui.tsx (primitivos), domain.tsx, AppLayout
    features/             # dashboard | products | sales | settings
    lib/                  # ipc (hooks React Query), format, cx
drizzle/                  # migrations SQL (geradas por drizzle-kit)
```

---

## 6. Fases de desenvolvimento

| Fase | Entregas | Estimativa |
|---|---|---|
| **0. Setup** | electron-vite + React + TS, Tailwind/shadcn, ESLint/Prettier, better-sqlite3 + Drizzle funcionando no Electron, primeira migration, IPC tipado de exemplo, git | 1–2 dias |
| **1. Produtos** | CRUD de produtos, upload e miniatura de fotos, protocolo `app-photo://`, listagem com busca/filtros | 3–4 dias |
| **2. Vendas** | Modal de venda, clientes com autocomplete, transação de baixa no estoque, lista e detalhe de vendas, cancelamento | 3–4 dias |
| **3. Entregas** | Fluxo de status, código de rastreio, datas de envio/entrega, tela de pendências, link de rastreio | 2 dias |
| **4. Dashboard** | Métricas e resumo | 1–2 dias |
| **5. Robustez** | Backup/restore em zip, testes dos services, tratamento de erros, estados vazios | 2 dias |
| **6. Distribuição** | electron-builder (.dmg / .exe), ícone, nome do app, auto-update opcional | 1–2 dias |

Total estimado do MVP: **~2,5 a 3,5 semanas** de desenvolvimento focado.

### Status (29/09/2026)

Todas as fases do MVP foram implementadas:

- [x] **0. Setup**
- [x] **1. Produtos**: várias fotos com miniatura, busca sem acento, filtros, arquivar/excluir
- [x] **2. Vendas**: baixa em transação, clientes com autocomplete, frete, edição, cancelamento
- [x] **3. Entregas**: quadro de pendências com destaque de atraso, rastreio, desfazer status
- [x] **4. Painel**: KPIs do mês com comparação, faturamento de 12 meses, pendências, últimas vendas, categorias, produtos parados, recém-adicionados
- [x] **5. Robustez**: backup/restauração em zip, 24 testes dos serviços
- [x] **6. Distribuição**: `.dmg` gerado e testado localmente; `.exe` gerado pelo workflow `.github/workflows/build.yml` numa máquina Windows do GitHub

Mudanças em relação ao plano original:
- **shadcn/ui** foi trocado por um conjunto próprio e enxuto de componentes Tailwind (`components/ui.tsx`). Evita dependências do Radix para o que o app precisa hoje.
- A camada **repositories** foi unida aos **services**. As consultas são simples e ficam junto das regras.

Pendente:
- Ícone próprio do app. Hoje é o ícone padrão do Electron, em `build/icon.*`.
- Testar o instalador Windows numa máquina real.

### v1.1: senha de administrador e dados restritos (10/10/2026)

- **Senha de administrador** em Configurações: cadastrar e alterar. Alterar exige a senha atual. Mínimo de 4 caracteres, guardada como hash scrypt na tabela `settings`.
- **Dados restritos do produto:** preço de compra, preço máximo de negociação e observações internas, em colunas novas de `products`. A descrição pública continua igual.
- Os dados só são entregues à tela pelos canais `products:getPrivate`/`setPrivate`, que exigem desbloqueio. O desbloqueio vale 5 minutos, fica só na memória do processo principal e acaba ao clicar em "Bloquear" ou ao fechar o app. As consultas comuns (produto, lista, vendas, painel) nunca incluem esses campos.
- Migration `0001` é só aditiva (`CREATE TABLE settings` + 3× `ADD COLUMN` opcionais). Testada sobre banco v1.0 com dados e sobre uma cópia do banco real.
- **Limite conhecido:** os valores ficam no banco sem criptografia. A senha protege contra quem usa o app, não contra quem abre o arquivo `sptoys.db` com uma ferramenta de banco de dados.

---

## 7. Ideias pós-MVP
- Custo de aquisição do item e cálculo de margem/lucro
- Recibo de venda em PDF / impressão
- Etiqueta de envio com endereço
- Exportar relatórios em CSV/Excel
- Consulta automática de rastreio (API dos Correios)
- Etiquetas com código/QR por peça
- Sincronização em nuvem ou multiusuário

---

## 8. Decisões (29/09/2026)
1. **Endereço nunca é obrigatório**, nem para Correios.
2. **O preço de venda pode diferir do original.** Vem preenchido com o preço original e pode ser editado.
3. **Frete:** campo opcional na venda (`shipping_cost`).
4. **Várias fotos por produto** já no MVP, com uma foto principal e reordenação.
5. **Plataformas:** Windows e macOS. Não há restrição técnica no Mac. Sem assinatura Apple (US$ 99/ano), o macOS mostra um aviso na primeira abertura, que se contorna com "Abrir" no menu de contexto. O Windows sem assinatura mostra o aviso do SmartScreen.
6. **Sem login**, uma única loja.
