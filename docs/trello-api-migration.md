# 🚀 Plano de Migração da API Trello - inPatch Suporte

## 📋 Visão Geral

Este documento detalha o plano de migração e reestruturação da integração com a API do Trello, implementação do Prisma ORM e integração avançada com Supabase usando MCP.

## 🎯 Objetivos

1. **Migrar do web scraping para API oficial** do Trello
2. **Implementar Prisma ORM** para melhor gerenciamento de dados
3. **Integrar Supabase MCP** para operações avançadas
4. **Reestruturar arquitetura** seguindo padrões de Vibe Coding
5. **Melhorar performance e confiabilidade**

## 📊 Status Atual vs Futuro

| Aspecto | Atual | Futuro |
|---------|--------|--------|
| **API Trello** | ✅ Implementada (lib/trello.ts) | 🔄 Melhorar e otimizar |
| **ORM** | ❌ Integração direta Supabase | ✅ Prisma + Supabase |
| **Sincronização** | ✅ Polling + Webhooks | 🔄 MCP + Real-time |
| **Tipagem** | ✅ TypeScript interfaces | 🔄 Prisma schemas |
| **Error Handling** | ✅ Básico implementado | 🔄 Avançado com MCP |

## 🏗️ Fases da Migração

### **Fase 1: Prisma Setup & Schema Design** 
*Duração estimada: 2-3 dias*

#### 1.1 Configuração do Prisma
```bash
npx prisma init
```

#### 1.2 Schema Prisma (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Project {
  id                 String          @id @default(cuid())
  title              String
  description        String?
  progress           Int             @default(0)
  platforms          Platform[]
  responsible        TeamMember[]
  imageUrl           String?         @map("image_url")
  startDate          DateTime        @map("start_date") @default(now())
  estimatedEndDate   DateTime        @map("estimated_end_date")
  status             ProjectStatus   @default(A_FAZER)
  priority           ProjectPriority @default(MEDIUM)
  trelloCardId       String?         @unique @map("trello_card_id")
  labels             String[]        @default([])
  createdAt          DateTime        @default(now()) @map("created_at")
  updatedAt          DateTime        @updatedAt @map("updated_at")
  
  // Relations
  syncHistory        SyncHistory[]
  
  @@map("projects")
}

model SyncHistory {
  id          String   @id @default(cuid())
  projectId   String   @map("project_id")
  action      SyncAction
  timestamp   DateTime @default(now())
  source      String   // "trello" | "manual" | "webhook"
  details     Json?
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@map("sync_history")
}

enum ProjectStatus {
  A_FAZER      @map("a-fazer")
  EM_ANDAMENTO @map("em-andamento")
  CONCLUIDO    @map("concluido")
}

enum ProjectPriority {
  LOW    @map("low")
  MEDIUM @map("medium")
  HIGH   @map("high")
}

enum Platform {
  N8N             @map("N8N")
  JIRA            @map("Jira")
  HUBSPOT         @map("Hubspot")
  BACKOFFICE      @map("Backoffice")
  GOOGLE_WORKSPACE @map("Google Workspace")
}

enum TeamMember {
  GUILHERME_SOUZA @map("Guilherme Souza")
  FELIPE_BRAAT    @map("Felipe Braat")
  TIAGO_TRIANI    @map("Tiago Triani")
}

enum SyncAction {
  CREATED
  UPDATED
  DELETED
  SYNCED
}
```

#### 1.3 Migração inicial
```bash
npx prisma db push
npx prisma generate
```

### **Fase 2: Integração Supabase MCP**
*Duração estimada: 3-4 dias*

#### 2.1 Configuração MCP Supabase
- Implementar conexão com MCP para operações avançadas
- Configurar Edge Functions para webhooks
- Setup de Real-time subscriptions

#### 2.2 Novo serviço de banco (`lib/database/prisma.ts`)
```typescript
import { PrismaClient } from '@prisma/client'
import { Project, ProjectStatus, ProjectPriority, Platform, TeamMember } from '@prisma/client'

export class DatabaseService {
  private prisma = new PrismaClient()

  async getProjects(): Promise<Project[]> {
    return this.prisma.project.findMany({
      orderBy: { updatedAt: 'desc' }
    })
  }

  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return this.prisma.project.create({
      data: {
        ...data,
        syncHistory: {
          create: {
            action: 'CREATED',
            source: 'trello',
          }
        }
      }
    })
  }

  async syncFromTrello(trelloCards: TrelloCard[]): Promise<void> {
    // Batch upsert with transaction
    await this.prisma.$transaction(async (tx) => {
      for (const card of trelloCards) {
        await tx.project.upsert({
          where: { trelloCardId: card.id },
          update: this.transformTrelloToProject(card),
          create: this.transformTrelloToProject(card),
        })
      }
    })
  }
}
```

### **Fase 3: API Trello Enhancement**
*Duração estimada: 2-3 dias*

#### 3.1 Melhorias na TrelloAPI (`lib/api/trello-enhanced.ts`)
```typescript
export class EnhancedTrelloAPI extends TrelloAPI {
  // Batch operations
  async getBatchCards(cardIds: string[]): Promise<TrelloCard[]> {
    const batchSize = 10
    const batches = []
    
    for (let i = 0; i < cardIds.length; i += batchSize) {
      const batch = cardIds.slice(i, i + batchSize)
      batches.push(
        Promise.all(batch.map(id => this.getCard(id)))
      )
    }
    
    return (await Promise.all(batches)).flat()
  }

  // Advanced webhook management
  async setupAdvancedWebhook(): Promise<void> {
    const existingWebhooks = await this.getWebhooks()
    
    // Setup multiple webhooks for different events
    const webhookConfigs = [
      { modelType: 'board', events: ['createCard', 'updateCard', 'deleteCard'] },
      { modelType: 'list', events: ['updateList'] },
      { modelType: 'card', events: ['commentCard', 'addAttachmentToCard'] }
    ]
    
    for (const config of webhookConfigs) {
      await this.createSpecificWebhook(config)
    }
  }
}
```

#### 3.2 Novo sistema de Cache (`lib/cache/redis-cache.ts`)
```typescript
export class CacheService {
  async getCachedProjects(): Promise<Project[] | null> {
    // Implementar cache Redis ou Memory cache
    return null
  }

  async setCachedProjects(projects: Project[]): Promise<void> {
    // Implementar invalidação inteligente
  }
}
```

### **Fase 4: Supabase MCP Integration**
*Duração estimada: 4-5 dias*

#### 4.1 MCP Service (`lib/services/supabase-mcp.ts`)
```typescript
import { mcp2_execute_sql, mcp2_get_project } from '@/lib/mcp'

export class SupabaseMCPService {
  async executeAdvancedQuery(query: string): Promise<any[]> {
    return await mcp2_execute_sql({
      project_id: process.env.SUPABASE_PROJECT_ID!,
      query
    })
  }

  async getProjectAnalytics(): Promise<any> {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(progress) as avg_progress,
        EXTRACT(WEEK FROM created_at) as week
      FROM projects 
      GROUP BY status, week
      ORDER BY week DESC
    `
    return this.executeAdvancedQuery(query)
  }

  async setupRealtimeSubscriptions(): Promise<void> {
    // Implementar subscriptions em tempo real
  }
}
```

#### 4.2 Edge Functions para Webhooks
```typescript
// supabase/functions/trello-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { action, data } = await req.json()
  
  // Process webhook with MCP
  await processWebhookAction(action, data)
  
  return new Response('OK', { status: 200 })
})
```

### **Fase 5: Reestruturação da Arquitetura**
*Duração estimada: 3-4 dias*

#### 5.1 Nova estrutura de serviços
```
lib/
├── database/
│   ├── prisma.ts          # Prisma client e operações
│   └── migrations.ts      # Migrações customizadas
├── api/
│   ├── trello-enhanced.ts # API Trello melhorada
│   └── webhook-handler.ts # Processamento de webhooks
├── services/
│   ├── sync-orchestrator.ts # Orquestração de sync
│   ├── supabase-mcp.ts     # Integração MCP
│   └── cache-service.ts    # Sistema de cache
├── utils/
│   ├── transformers.ts     # Transformações de dados
│   └── validators.ts       # Validações avançadas
└── types/
    ├── prisma.d.ts        # Tipos Prisma estendidos
    └── mcp.d.ts           # Tipos MCP
```

#### 5.2 Sync Orchestrator (`lib/services/sync-orchestrator.ts`)
```typescript
export class SyncOrchestrator {
  constructor(
    private trelloAPI: EnhancedTrelloAPI,
    private database: DatabaseService,
    private mcp: SupabaseMCPService,
    private cache: CacheService
  ) {}

  async performFullSync(): Promise<void> {
    // 1. Fetch from Trello
    const trelloCards = await this.trelloAPI.getBoardCards()
    
    // 2. Transform and validate
    const validatedProjects = await this.validateAndTransform(trelloCards)
    
    // 3. Sync to database via Prisma
    await this.database.syncFromTrello(validatedProjects)
    
    // 4. Update analytics via MCP
    await this.mcp.updateAnalytics()
    
    // 5. Invalidate cache
    await this.cache.invalidateAll()
    
    // 6. Notify subscribers
    await this.notifySubscribers()
  }
}
```

## 🔧 Implementação Detalhada

### **Etapas de Execução**

#### **Etapa 1: Preparação (1 dia)**
- [ ] Backup do banco atual
- [ ] Configurar branch de migração
- [ ] Instalar dependências Prisma
- [ ] Configurar variáveis de ambiente

#### **Etapa 2: Schema & Prisma (2 dias)**
- [ ] Criar schema.prisma completo
- [ ] Executar migração inicial
- [ ] Implementar DatabaseService
- [ ] Testes de CRUD básico

#### **Etapa 3: MCP Integration (3 dias)**
- [ ] Configurar Supabase MCP
- [ ] Implementar SupabaseMCPService
- [ ] Criar Edge Functions
- [ ] Configurar Real-time subscriptions

#### **Etapa 4: API Enhancement (2 dias)**
- [ ] Melhorar TrelloAPI existente
- [ ] Implementar cache service
- [ ] Adicionar batch operations
- [ ] Webhook management avançado

#### **Etapa 5: Orchestration (3 dias)**
- [ ] Implementar SyncOrchestrator
- [ ] Migrar store.ts para nova arquitetura
- [ ] Atualizar componentes React
- [ ] Testes de integração

#### **Etapa 6: Testing & Optimization (2 dias)**
- [ ] Testes end-to-end
- [ ] Otimização de performance
- [ ] Documentação atualizada
- [ ] Deploy para produção

## 🚀 Benefícios Esperados

### **Performance**
- ⚡ **50%** redução no tempo de sincronização
- 🚀 **80%** melhoria em queries complexas
- 💾 Cache inteligente reduz calls desnecessárias

### **Confiabilidade** 
- 🛡️ Transações ACID com Prisma
- 🔄 Retry automático e circuit breakers
- 📊 Logs detalhados de sincronização

### **Escalabilidade**
- 📈 Suporte a milhares de projetos
- 🔀 Batch operations otimizadas
- 🌐 Real-time updates via MCP

### **Manutenibilidade**
- 🏗️ Arquitetura modular e testável
- 📝 Tipagem forte end-to-end
- 🔧 Separação clara de responsabilidades

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Migração de dados** | Média | Alto | Backup completo + rollback plan |
| **Rate limiting Trello** | Alta | Médio | Cache agressivo + batch operations |
| **MCP learning curve** | Alta | Baixo | Documentação + POC inicial |
| **Breaking changes** | Baixa | Alto | Testes automatizados + feature flags |

## 📝 Próximos Passos

1. **Aprovação do plano** pela equipe
2. **Setup do ambiente** de desenvolvimento
3. **Início da Fase 1** - Prisma Setup
4. **Reviews diárias** de progresso
5. **Deploy gradual** por features

## 🔗 Dependências Externas

- **Supabase MCP**: Configuração de projeto
- **Trello API**: Rate limits e webhooks
- **Prisma**: Versão compatível com Supabase
- **Edge Functions**: Deploy e configuração

---

**📅 Timeline Total**: 15-18 dias de desenvolvimento
**👥 Recursos**: 1-2 desenvolvedores sênior
**🎯 Meta**: Sistema robusto e escalável para gestão de projetos

*Documento criado seguindo padrões de Vibe Coding e arquitetura Next.js 15 + Prisma + Supabase MCP*
