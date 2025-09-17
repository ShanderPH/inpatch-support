# InPatch Suporte - Fluxo de Sincronização (Visão Leve)

```mermaid
flowchart TD
  subgraph Trello
    TBoard[Trello Board]
  end

  subgraph NextApp[Next.js App]
    NextAPI[/app/api/trello-webhook/route.ts/]
    Orchestrator[SyncOrchestrator v2]
    EAPI[EnhancedTrelloAPI]
    DB[DatabaseService (Prisma)]
    Cache[CacheService]
    Store[Zustand Store]
    UI[UI Components]
  end

  subgraph Supabase
    PrismaClient[(PrismaClient -> Postgres)]
    MCP[Supabase MCP]
    EdgeFn[[Edge Function: trello-webhook]]
  end

  %% Entradas de dados
  TBoard -- Webhook --> NextAPI
  TBoard -- REST API --> EAPI

  %% Orquestração
  NextAPI --> Orchestrator
  EAPI --> Orchestrator
  Orchestrator --> Cache
  Orchestrator --> DB

  %% Banco de dados e MCP
  DB --> PrismaClient
  DB -- Advanced filters & analytics --> MCP

  %% Fluxo para UI
  Orchestrator --> Store
  Store --> UI

  %% Edge Function (opcional para push server-side)
  TBoard -- Webhook --> EdgeFn
  EdgeFn -- Upsert --> PrismaClient
```

## Notas
- Orquestração central via `lib/services/sync-orchestrator-v2.ts`.
- Acesso a banco via `lib/database/prisma.ts` (Prisma Client + tipos de input/output).
- Filtros e analytics avançados via `lib/services/supabase-mcp.ts`.
- Cache de projetos em `lib/cache/cache-service.ts`.
- UI consome dados do `Zustand Store` (`lib/store.ts`).
- Integração Trello via `lib/trello.ts` e `lib/api/trello-enhanced.ts`.
- Webhooks consumidos no Next (`app/api/trello-webhook/route.ts`) e/ou via Edge Function (`supabase/functions/trello-webhook/index.ts`).
