# 📋 PROJECT_CONTEXT.md

## 🎯 Visão Geral do Projeto

**inPatch Suporte** é uma aplicação web moderna desenvolvida para o time de Suporte da inChurch, funcionando como um dashboard dinâmico de acompanhamento de projetos e automações. A aplicação oferece visualização em tempo real do progresso de desenvolvimento, integração segura com Trello e interface moderna com efeitos visuais avançados, seguindo as melhores práticas de desenvolvimento web.

### ✨ Funcionalidades Implementadas (v1.0.0)

- **Sistema de Agrupamento por Status**: Organização visual dos projetos por status com ordenação por data
- **Exibição de Múltiplos Responsáveis**: Avatars coloridos e suporte completo a múltiplos membros por projeto
- **Gerenciamento Inteligente de Labels**: Limitação visual, controle de duplicatas e indicador de overflow
- **Integração Robusta com Trello**: Sincronização bidirecional com rate limiting e error recovery
- **Segurança Implementada**: Validação completa, sanitização e CSP headers
- **Design Liquid Glass**: Interface moderna com efeitos visuais avançados e responsividade
- **Real-time Sync**: Sistema de sincronização em tempo real com polling inteligente
- **Error Handling Robusto**: Fallbacks, error boundaries e recovery automático

---

## 🏗️ Arquitetura Tecnológica

### Stack Principal

| Tecnologia | Versão | Função |
|------------|--------|---------|
| **Next.js** | 15.5.0 | Framework React para produção com App Router |
| **React** | 19.1.0 | Biblioteca de interface de usuário |
| **TypeScript** | 5.9.2 | Tipagem estática e desenvolvimento seguro |
| **Tailwind CSS** | 4.1.11 | Framework CSS utility-first |
| **HeroUI** | 2.x | Sistema de componentes moderno (sucessor do NextUI) |
| **Supabase** | 2.40.7 | Backend-as-a-Service (PostgreSQL) |
| **Prisma ORM** | 6.16.1 | ORM tipado para PostgreSQL (Supabase) |
| **Zustand** | 4.4.7 | Gerenciamento de estado global |
| **Framer Motion** | 11.18.2 | Animações e transições |

### Dependências de UI e Experiência

- **@heroui/*** - Sistema completo de componentes (Button, Card, Modal, Navbar, Input, Select, Chip, Spinner, etc.)
- **react-icons** - Biblioteca de ícones (Feather Icons principalmente)
- **react-hot-toast** - Sistema de notificações toast
- **next-themes** - Gerenciamento de temas Dark/Light mode
- **clsx** - Utilitário para classes CSS condicionais
- **intl-messageformat** - Formatação de mensagens internacionalizadas

### Ferramentas de Desenvolvimento

- **ESLint** 9.35.0 - Linting e qualidade de código com config personalizada
- **Prettier** 3.5.3 - Formatação automática de código
- **PostCSS** 8.5.6 - Processamento de CSS avançado
- **Turbopack** - Bundler de desenvolvimento otimizado (Next.js)
- **TypeScript ESLint** - Linting específico para TypeScript
- **Tailwind Variants** - Utilitário para variantes de componentes
 - **Node.js** ^22.19.0 - Ambiente de execução (engines)
 - **Prisma CLI** 6.16.1 - Migrations e geração de client

---

## 🎨 Design System e Paleta de Cores

### Cores Primárias

```css
/* Paleta Principal - Verde inChurch */
primary: {
  50: 'hsl(96, 44%, 95%)',   /* #f7faf4 */
  100: 'hsl(96, 44%, 90%)',  /* #eef5e6 */
  200: 'hsl(96, 44%, 80%)',  /* #ddebc9 */
  300: 'hsl(96, 44%, 70%)',  /* #cce1ac */
  400: 'hsl(96, 44%, 60%)',  /* #bbd78f */
  500: 'hsl(96, 44%, 42%)',  /* #8bb854 */ /* Cor principal */
  600: 'hsl(96, 44%, 35%)',  /* #729647 */
  700: 'hsl(96, 44%, 28%)',  /* #59753a */
  800: 'hsl(96, 44%, 21%)',  /* #40542c */
  900: 'hsl(96, 44%, 14%)',  /* #27331e */
}
```

### Gradientes de Background

```css
/* Tema Claro */
background: linear-gradient(135deg, white 0%, hsl(120, 14%, 99%) 100%);

/* Tema Escuro */
background: linear-gradient(135deg, hsl(60, 2%, 8%) 0%, hsl(93, 19%, 11%) 100%);
```

### Cores das Plataformas

| Plataforma | Cor | Classe CSS |
|------------|-----|------------|
| **N8N** | Roxo | `bg-purple-500/80 text-white` |
| **Jira** | Azul | `bg-blue-500/80 text-white` |
| **Hubspot** | Laranja | `bg-orange-500/80 text-white` |
| **Backoffice** | Verde | `bg-green-500/80 text-white` |
| **Google Workspace** | Vermelho | `bg-red-500/80 text-white` |

### Cores de Status (Atualizado)

| Status | Cor | Ícone | Label |
|--------|-----|-------|-------|
| **a-fazer** | Azul (`text-blue-500`) | `FiClock` | A Fazer |
| **em-andamento** | Laranja (`text-orange-500`) | `FiTrendingUp` | Em Andamento |
| **concluido** | Verde (`text-green-500`) | `FiCheckCircle` | Concluído |

### Cores de Prioridade (Atualizado)

| Prioridade | Cor | Label |
|------------|-----|-------|
| **high** | Vermelho (`bg-red-500`) | Alta |
| **medium** | Amarelo (`bg-yellow-500`) | Média |
| **low** | Verde (`bg-green-500`) | Baixa |

---

## 🗄️ Banco de Dados (Prisma + Supabase)

O banco é modelado via Prisma ORM e provisionado em um PostgreSQL do Supabase. O schema completo encontra-se em `prisma/schema.prisma`. Resumo dos modelos e enums:

```prisma
// prisma/schema.prisma (resumo)
model Project {
  id               String          @id @default(cuid())
  title            String
  description      String?
  progress         Int             @default(0) @db.SmallInt
  platforms        Platform[]
  responsible      TeamMember[]
  imageUrl         String?         @map("image_url")
  startDate        DateTime        @map("start_date") @default(now())
  estimatedEndDate DateTime        @map("estimated_end_date")
  status           ProjectStatus   @default(A_FAZER)
  priority         ProjectPriority @default(MEDIUM)
  trelloCardId     String?         @unique @map("trello_card_id")
  labels           String[]        @default([])
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")

  syncHistory      SyncHistory[]

  @@map("projects")
  @@index([status])
  @@index([priority])
  @@index([trelloCardId])
  @@index([createdAt])
  @@index([updatedAt])
}

model SyncHistory {
  id           String     @id @default(cuid())
  projectId    String     @map("project_id")
  action       SyncAction
  timestamp    DateTime   @default(now())
  source       String
  details      Json?
  success      Boolean    @default(true)
  errorMessage String?    @map("error_message")

  project      Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("sync_history")
  @@index([projectId])
  @@index([timestamp])
  @@index([source])
  @@index([success])
}

enum ProjectStatus { A_FAZER @map("a-fazer") EM_ANDAMENTO @map("em-andamento") CONCLUIDO @map("concluido") }
enum ProjectPriority { LOW @map("low") MEDIUM @map("medium") HIGH @map("high") }
enum Platform { N8N @map("N8N") JIRA @map("Jira") HUBSPOT @map("Hubspot") BACKOFFICE @map("Backoffice") GOOGLE_WORKSPACE @map("Google Workspace") }
enum TeamMember { GUILHERME_SOUZA @map("Guilherme Souza") FELIPE_BRAAT @map("Felipe Braat") TIAGO_TRIANI @map("Tiago Triani") }
```

Camada de acesso e operações:
- `lib/database/prisma.ts` expõe `DatabaseService` com CRUD, upsert em lote, analytics e integração MCP.
- Integração real-time e webhooks detalhada nas seções abaixo.

---

## 🔧 Modelos de Dados TypeScript

### Interface Principal: Project

```typescript
export interface Project {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  platforms: Platform[];
  responsible: TeamMember[]; // Suporte completo a múltiplos responsáveis
  imageUrl?: string;
  startDate: string;
  estimatedEndDate: string;
  status: ProjectStatus; // Sistema unificado em português
  priority: ProjectPriority; // 'low' | 'medium' | 'high'
  trelloCardId?: string; // Integração com Trello
  labels?: string[]; // Labels do Trello (sem duplicatas)
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectStatus = 'a-fazer' | 'em-andamento' | 'concluido';
export type ProjectPriority = 'low' | 'medium' | 'high';
```

### Tipos Enumerados

```typescript
export type Platform = 'N8N' | 'Jira' | 'Hubspot' | 'Backoffice' | 'Google Workspace';

export type TeamMember = 'Guilherme Souza' | 'Felipe Braat' | 'Tiago Triani';
```

### Interface de Resposta

```typescript
export interface ProjectsResponse {
  projects: Project[];
  lastUpdated: string;
}
```

---

## 🔄 Integração com Trello

### Configuração da API

```typescript
// Variáveis de ambiente necessárias
NEXT_PUBLIC_TRELLO_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_TRELLO_API_TOKEN=seu_token_aqui
NEXT_PUBLIC_TRELLO_BOARD_ID=RVFcbKeF
```

### Mapeamento de Dados Trello → inPatch

| Elemento Trello | Propriedade inPatch | Lógica de Transformação |
|-----------------|---------------------|-------------------------|
| **Card Name** | `project.title` | Mapeamento direto |
| **Card Description** | `project.description` | Mapeamento direto |
| **Card Labels** | `project.platforms` | Nome do label → Platform enum |
| **Card Members** | `project.responsible` | Nome do membro → TeamMember enum |
| **Card List** | `project.status` | Nome da lista → Status enum |
| **Card Due Date** | `project.estimatedEndDate` | Conversão ISO date |
| **Card Checklists** | `project.progress` | Porcentagem (Concluídos/Total) |
| **Card Activity** | `project.startDate` | Timestamp da última atividade |

### Mapeamento de Status (Atualizado)

```typescript
export const STATUS_MAPPING = {
  'planning': 'a-fazer',
  'backlog': 'a-fazer',
  'to-do': 'a-fazer',
  'fazer': 'a-fazer',
  'development': 'em-andamento',
  'doing': 'em-andamento',
  'progress': 'em-andamento',
  'andamento': 'em-andamento',
  'desenvolvimento': 'em-andamento',
  'done': 'concluido',
  'completed': 'concluido',
  'concluido': 'concluido',
  'finalizado': 'concluido'
} as const;
```

### Sistema de Sincronização em Tempo Real

#### Estratégia de 3 Camadas

1. **Webhook Push** (Instantâneo - 0-2s)
   - Trello → Webhook → API Endpoint → Sync → UI Update
   - Endpoint: `/api/trello-webhook`

2. **Smart Polling** (Tempo real - 30s)
   - Timer → Check Actions → Detect Changes → Fetch Updates → UI Update
   - Intervalo configurável: 30 segundos

3. **Manual Refresh** (Sob demanda)
   - User Action → Force Sync → Full Board Fetch → UI Update

### Implementações Avançadas (Fases 3–5)

- **EnhancedTrelloAPI** (`lib/api/trello-enhanced.ts`)
  - Batch operations (get/update múltiplos cards)
  - Circuit breaker + retry com exponential backoff e métricas
  - Webhook management avançado (múltiplos eventos) e cache leve

- **SupabaseMCPService** (`lib/services/supabase-mcp.ts`)
  - Execução de SQL avançado via MCP, analytics e subscriptions mockáveis
  - Sanitização de queries e status/health de conexão

- **SyncOrchestrator v2** (`lib/services/sync-orchestrator-v2.ts`)
  - Orquestra sincronização Trello → Prisma/Supabase → Cache/Store
  - Subscribers para atualização em tempo real e métricas de sync

- **CacheService** (`lib/cache/cache-service.ts`)
  - TTL, LRU eviction, estatísticas e invalidação seletiva por webhook

- **RealtimeManager** (`lib/services/realtime-manager.ts`)
  - Gerencia subscriptions (browser + MCP) e fila de eventos

- **WebhookHandler** (`lib/services/webhook-handler.ts`)
  - Processa webhooks Trello (transformação + sync + notificação)

- **Edge Function** (`supabase/functions/trello-webhook/index.ts`)
  - Recebe webhooks do Trello e faz upsert em `projects` no Supabase

---

## 🏛️ Arquitetura de Componentes

### Estrutura de Diretórios Atual

```
├── app/                               # App Router do Next.js 15
│   ├── layout.tsx                     # Layout raiz + CSP meta
│   ├── page.tsx                       # Dashboard principal (agrupado)
│   ├── providers.tsx                  # HeroUI + NextThemes providers
│   └── api/
│       └── trello-webhook/route.ts    # Endpoint de webhook (Next.js)
├── components/
│   ├── project-card.tsx               # Card com badges e overdue
│   ├── project-group.tsx              # Agrupamento por status
│   ├── project-detail-modal.tsx       # Modal com link para Trello
│   ├── project-filters.tsx            # Filtros avançados
│   ├── real-time-sync-toggle.tsx      # Controle de sync
│   ├── error-boundary.tsx             # Error boundaries
│   └── ...
├── lib/
│   ├── api/
│   │   ├── trello-enhanced.ts         # Trello API avançada (batch, retry, webhooks)
│   │   └── webhook-handler.ts         # Processamento de eventos do Trello
│   ├── cache/
│   │   └── cache-service.ts           # Cache inteligente com TTL/LRU
│   ├── config/
│   │   └── api.ts                     # Configuração centralizada (env + rate limits)
│   ├── database/
│   │   └── prisma.ts                  # DatabaseService (Prisma + MCP)
│   ├── services/
│   │   ├── sync-orchestrator-v2.ts    # Orquestrador central de sync
│   │   ├── supabase-mcp.ts            # Integração MCP Supabase
│   │   ├── mcp-integration.ts         # Detector/Executor MCP (safe)
│   │   ├── realtime-manager.ts        # Subscriptions e fila de eventos
│   │   └── webhook-handler.ts         # Processing e notificação
│   ├── trello.ts                      # API Trello base (rate limit, transforms)
│   ├── store.ts                       # Zustand + integração com orquestrador
│   └── utils/                         # Utils (validation, transformers, ...)
├── prisma/
│   └── schema.prisma                  # Schema Prisma (Project/SyncHistory + enums)
├── supabase/
│   └── functions/trello-webhook/      # Edge Function para webhooks Trello
└── styles/
    └── globals.css                    # Estilos globais + liquid glass
```

### Componentes Principais

#### 1. ProjectCard (`components/project-card.tsx`)

**Funcionalidades Implementadas:**
- **Visual Avançado**: Gradientes dinâmicos e efeito liquid glass
- **Progresso Animado**: Barra de progresso com animação Framer Motion
- **Badges de Plataforma**: Cores específicas por plataforma (sem duplicatas)
- **Múltiplos Responsáveis**: Avatars coloridos com iniciais dos membros
- **Labels Inteligentes**: Limitação a 3 labels com indicador de overflow (+N)
- **Badge de Vencimento**: Indicador neomórfico para projetos vencidos com animação
- **Prioridade Visual**: Indicadores coloridos de prioridade
- **Acessibilidade**: ARIA labels, navegação por teclado, tooltips
- **Interatividade**: Hover effects e estados de loading

**Props:**
```typescript
interface ProjectCardProps {
  project: Project;
  index: number; // Para animações escalonadas
  onClick?: (project: Project) => void;
}
```

#### 2. ProjectGroup (`components/project-group.tsx`)

**Funcionalidades:**
- **Agrupamento por Status**: Organização automática por 'em-andamento', 'a-fazer', 'concluído'
- **Ordenação por Data**: Projetos ordenados por data descendente dentro de cada grupo
- **Headers Visuais**: Cabeçalhos coloridos por status com ícones e contadores
- **Grid Responsivo**: Layout que se adapta a diferentes tamanhos de tela
- **Animações de Entrada**: Transições suaves com Framer Motion

#### 3. Navbar (`components/navbar.tsx`)

**Funcionalidades:**
- **Branding**: Logo e nome inChurch
- **Navegação**: Links para About, Blog, Docs
- **Responsividade**: Layout adaptável para mobile
- **Theme Integration**: Integração com sistema de temas

#### 4. RealTimeSyncToggle (`components/real-time-sync-toggle.tsx`)

**Funcionalidades:**
- **Toggle de Sincronização**: Controle manual da sincronização em tempo real
- **Indicadores Visuais**: Status de sincronização ativa/inativa
- **Timestamp**: Última atualização dos dados
- **Feedback Visual**: Animações e transições de estado

#### 5. LoadingSkeleton (`components/loading-skeleton.tsx`)

**Funcionalidades:**
- **ProjectGridSkeleton**: Skeleton para grid de projetos
- **StatCardSkeleton**: Skeleton para cards de estatísticas
- **Animações**: Efeito shimmer para loading states
- **Responsividade**: Adaptação a diferentes layouts

---

## 🔄 Gerenciamento de Estado (Zustand)

### Store Principal (`lib/store.ts`)

```typescript
interface ProjectStore {
  // Estado
  projects: Project[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  searchQuery: string;
  statusFilter: string;
  platformFilter: string;
  responsibleFilter: string;
  
  // Ações de Estado
  setProjects: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (timestamp: string) => void;
  
  // Ações de Filtros
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setPlatformFilter: (platform: string) => void;
  setResponsibleFilter: (responsible: string) => void;
  clearFilters: () => void;
  
  // Getters Computados
  getFilteredProjects: () => Project[];
  getGroupedProjects: () => {
    'em-andamento': Project[];
    'a-fazer': Project[];
    'concluido': Project[];
  };
  getProjectById: (id: string) => Project | undefined;
  getProjectStats: () => {
    total: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  };
  
  // API e Sync
  fetchProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  startRealTimeSync: () => void;
  stopRealTimeSync: () => void;
  isRealTimeSyncActive: () => boolean;
}
```

### Persistência e Middleware

- **Storage:** localStorage para cache offline
- **Dados Persistidos:** projects, lastUpdated
- **Middleware:** 
  - `persist` - Persistência automática no localStorage
  - `devtools` - Redux DevTools para debug
- **Estratégia:** Partial persistence para otimização

---

## 🎭 Sistema de Temas

### Configuração

```typescript
// Tema padrão: dark
<Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
```

### Classes CSS Dinâmicas

- **Light Mode:** Gradientes claros, cores suaves
- **Dark Mode:** Gradientes escuros, contraste alto
- **Transições:** Suaves entre temas

### Liquid Glass Effect

```css
.liquid-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}
```

---

## 🚀 Regras de Negócio

### 1. Gestão de Projetos

**Estados do Sistema (Português):**
- `a-fazer` ← Planejamento e backlog
- `em-andamento` ← Desenvolvimento ativo
- `concluido` ← Finalizado

**Fluxo de Estados:**
- `a-fazer` → `em-andamento` → `concluido`
- Possível retrocesso entre estados

**Cálculo de Progresso:**
1. **Primário:** Checklists do Trello (concluídos/total * 100)
2. **Secundário:** Inferência por status da lista:
   - `a-fazer`: 5%
   - `em-andamento`: 45%
   - `concluido`: 100%

**Validações Implementadas:**
- Progresso: 0-100% com clamp automático
- Título: obrigatório, sanitizado, max 255 chars
- Responsável: múltiplos membros permitidos
- Plataformas: ao menos uma plataforma obrigatória
- Sanitização: remoção de HTML/JS malicioso

### 2. Sincronização com Trello

**Filtros de Cards Implementados:**
- Excluir cards com título vazio ou apenas espaços
- Filtrar cards com "template" ou "exemplo" no título
- Validação de conteúdo mínimo obrigatório
- Sanitização de dados de entrada

**Mapeamento Flexível de Membros:**
```typescript
// Múltiplos responsáveis suportados
const memberMapping = {
  'guilherme|gui': 'Guilherme Souza',
  'felipe|braat': 'Felipe Braat', 
  'tiago|triani': 'Tiago Triani'
};
```

**Detecção Inteligente de Prioridade:**
- Labels vermelhos ou "high/urgent" → `high`
- Labels amarelos ou "medium" → `medium`
- Labels verdes ou "low" → `low`
- Padrão: `medium`

**Mapeamento de Plataformas:**
- Detecção por labels do Trello
- Suporte a múltiplas plataformas por projeto
- Fallback para 'Backoffice' se nenhuma detectada

### 3. Time de Responsáveis

| Membro | Especialização | Plataformas Principais |
|--------|----------------|------------------------|
| **Guilherme Souza** | Desenvolvimento de Automações | N8N, Jira |
| **Felipe Braat** | Integrações e Dashboards | Hubspot, Backoffice |
| **Tiago Triani** | Sistemas e Monitoramento | Google Workspace, Backoffice |

### 4. Plataformas Suportadas

| Plataforma | Descrição | Uso Principal |
|------------|-----------|---------------|
| **N8N** | Automação de workflows | Integrações e automações |
| **Jira** | Gestão de tickets e projetos | Sistema de tickets |
| **Hubspot** | CRM e marketing automation | Gestão de leads e clientes |
| **Backoffice** | Sistemas internos | Ferramentas administrativas |
| **Google Workspace** | Ferramentas de produtividade | Email, Drive, Calendar |

---

## 🔧 Funcionalidades Implementadas

### ✅ Core Features

1. **Dashboard com Agrupamento**
   - **Organização por Status**: Projetos agrupados visualmente por status
   - **Ordenação Temporal**: Ordenação por data dentro de cada grupo
   - **Estatísticas Dinâmicas**: Cards com métricas em tempo real
   - **Grid Responsivo**: Layout adaptável com skeletons de loading
   - **Filtros Avançados**: Busca, status, plataforma, responsável

2. **Integração Trello Robusta**
   - **Rate Limiting**: 10 req/s, 300/min com controle de burst
   - **Transformação de Dados**: Mapeamento completo Trello → inPatch
   - **Webhook Support**: Endpoint `/api/trello-webhook` para sync instantâneo
   - **Polling Inteligente**: Verificação a cada 30s com detecção de mudanças
   - **Error Recovery**: Retry automático e fallbacks
   - **Sanitização**: Limpeza completa de dados maliciosos

3. **Interface Liquid Glass**
   - **Design Moderno**: Efeitos glassmorphism e gradientes dinâmicos
   - **Animações Fluidas**: Framer Motion com suporte a reduced motion
   - **Tema Dual**: Dark/Light mode com transições suaves
   - **Mobile First**: Responsividade completa para todos os dispositivos
   - **Loading States**: Skeletons animados e feedback visual

4. **Estado e Performance**
   - **Zustand Store**: Gerenciamento de estado com persistência
   - **Cache Inteligente**: localStorage com validação
   - **Computed Values**: Getters otimizados para filtros e agrupamentos
   - **Real-time Sync**: Sistema de sincronização controlável pelo usuário

### ✅ Funcionalidades Avançadas

1. **Real-time Sync Controlável**
   - **Toggle Manual**: Controle completo pelo usuário
   - **Indicadores Visuais**: Status da sincronização em tempo real
   - **Cleanup Automático**: Gestão adequada de recursos e timers
   - **Polling Inteligente**: Apenas sincroniza quando há mudanças

2. **Error Handling Robusto**
   - **Error Boundaries**: Fallbacks específicos por componente
   - **Mensagens Localizadas**: Erros em português com contexto
   - **Recovery Automático**: Retry com backoff exponencial
   - **Fallback Gracioso**: Degradação elegante quando APIs falham
   - **Logging Seguro**: Sem exposição de dados sensíveis

3. **Performance e UX**
   - **Lazy Loading**: Componentes carregados sob demanda
   - **Memoização**: Cálculos complexos otimizados
   - **Debounce**: Filtros e busca com delay inteligente
   - **Animações Otimizadas**: 60fps com GPU acceleration
   - **Bundle Splitting**: Código otimizado para carregamento

4. **Acessibilidade (WCAG 2.1)**
   - **ARIA Completo**: Labels e descrições em português
   - **Keyboard Navigation**: Navegação completa por teclado
   - **Contraste**: Suporte a high contrast mode
   - **Screen Readers**: Compatibilidade total
   - **Reduced Motion**: Respeita preferências do usuário
   - **Focus Management**: Gestão adequada do foco

5. **Segurança Enterprise**
   - **CSP Headers**: Content Security Policy implementado
   - **Input Sanitization**: Limpeza de XSS e injection
   - **Rate Limiting**: Proteção contra abuse de APIs
   - **Type Safety**: TypeScript em modo strict
   - **Secure Config**: Centralização de configurações sensíveis
   - **Error Boundaries**: Não exposição de stack traces

---

## 🔮 Funcionalidades Futuras Planejadas

### 📋 Roadmap

1. **Bi-directional Sync**
   - Criar/editar projetos na aplicação
   - Sincronizar mudanças para Trello
   - Resolução de conflitos

2. **Notificações Avançadas**
   - Push notifications
   - Email alerts
   - Slack integration

3. **Analytics e Relatórios**
   - Métricas de performance
   - Relatórios de progresso
   - Dashboards executivos

4. **Colaboração**
   - Comentários em projetos
   - Histórico de mudanças
   - Aprovações de milestone

---

## 🛡️ Segurança e Configuração

### Variáveis de Ambiente Obrigatórias

```env
# Trello (Obrigatório para integração)
NEXT_PUBLIC_TRELLO_API_KEY=...
NEXT_PUBLIC_TRELLO_API_TOKEN=...
NEXT_PUBLIC_TRELLO_BOARD_ID=...

# Supabase (App Web)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_PROJECT_ID=...

# Prisma / Banco (local/dev)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Edge Function (Ambiente Supabase)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
TRELLO_WEBHOOK_SECRET=...
```

### Arquitetura de Configuração

- **Validação Automática**: Verificação de credenciais na inicialização
- **Fallback Gracioso**: Funciona apenas com Trello se Supabase não configurado
- **Configuração Centralizada**: `lib/config/api.ts` centraliza todas as configs
- **Type Safety**: Validação de tipos para todas as configurações
 - **Security Headers**: `next.config.js` adiciona headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)

### Políticas de Segurança Implementadas

1. **Rate Limiting Avançado**
   ```typescript
   RATE_LIMITS = {
     trello: {
       requestsPerSecond: 10,
       requestsPerMinute: 300,
       burstLimit: 50
     }
   }
   ```
   - **Sliding Window**: Rate limiter com janela deslizante
   - **Burst Protection**: Limite de rajadas configurável
   - **Recovery Automático**: Retry com backoff exponencial

2. **Sanitização e Validação**
   ```typescript
   // Sanitização implementada
   sanitizeString(input: string): string {
     return input
       .trim()
       .replace(/[<>]/g, '') // Remove HTML tags
       .replace(/javascript:/gi, '') // Remove JS protocol
       .replace(/on\w+=/gi, ''); // Remove event handlers
   }
   ```
   - **XSS Prevention**: Remoção de scripts maliciosos
   - **Type Guards**: Validação de tipos em runtime
   - **Schema Validation**: Validação completa de esquemas

3. **Content Security Policy**
```html
  <meta httpEquiv="Content-Security-Policy" 
        content="default-src 'self'; 
                 script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
                 style-src 'self' 'unsafe-inline'; 
                 img-src 'self' data: https:; 
                 connect-src 'self' https://api.trello.com https://*.supabase.co; 
                 font-src 'self' data:;" />
```
   - **Domínios Permitidos**: Whitelist rigorosa
   - **Resource Control**: Controle de recursos externos
   - **Injection Prevention**: Proteção contra ataques

4. **Error Handling Seguro**
   - **Logs Sanitizados**: Sem exposição de dados sensíveis
   - **Mensagens Genéricas**: Errors sem detalhes técnicos
   - **Stack Trace Protection**: Não exposição em produção
   - **Graceful Degradation**: Fallbacks seguros

---

## 📊 Métricas e Monitoramento

### KPIs Principais

1. **Performance**
   - Time to First Contentful Paint
   - Largest Contentful Paint
   - Cumulative Layout Shift

2. **Funcionalidade**
   - Taxa de sincronização bem-sucedida
   - Tempo de resposta da API Trello
   - Uptime do sistema

3. **Usabilidade**
   - Tempo médio de carregamento
   - Taxa de erro de usuário
   - Frequência de uso de filtros

### Logging

```typescript
// Estrutura de logs
{
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: 'trello-sync' | 'ui' | 'api';
  message: string;
  metadata?: object;
}
```

---

## 🚀 Deploy e Infraestrutura

### Plataformas Suportadas

1. **Vercel** (Recomendado)
   - Deploy automático
   - Edge functions
   - Analytics integrado

2. **Netlify**
   - Build automático
   - Form handling
   - Split testing

3. **Railway/Heroku**
   - Container deployment
   - Database integrado
   - Scaling automático

### Build Configuration

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build", 
    "start": "next start",
    "lint": "eslint --fix"
  }
}
```

---

## 📞 Suporte e Manutenção

### Contatos

- **Time de Desenvolvimento:** inChurch - Time de Suporte
- **Repositório:** [URL do repositório]
- **Documentação:** Este arquivo + SETUP.md + TRELLO_INTEGRATION_PLAN.md

### Troubleshooting Comum

1. **Sync não funciona:** Verificar credenciais Trello
2. **Performance lenta:** Verificar rate limits da API
3. **UI quebrada:** Verificar compatibilidade do browser
4. **Dados não aparecem:** Verificar conexão Supabase

---

## ✅ Fases de Migração Concluídas (1–5)

- Fase 1: Prisma ORM + schema e `DatabaseService` completos
- Fase 2: Supabase MCP (analytics, filtros avançados e subscriptions mockáveis)
- Fase 3: Trello API aprimorada (batch, retry/backoff, circuit breaker, webhooks)
- Fase 4: Integração MCP real com auto-detecção e fallbacks
- Fase 5: Orquestrador de Sync v2 + RealtimeManager + CacheService

## 🔄 Changelog v1.1.0

### 🚀 Novas Funcionalidades
- Sistema de status unificado em português
- Suporte a múltiplos responsáveis por projeto
- Avatars coloridos para identificação de membros
- Loading skeletons animados
- Validação robusta de dados
- Rate limiting de APIs

### 🛠️ Melhorias
- Interface mais responsiva e acessível
- Tratamento de erros aprimorado
- Performance otimizada
- Segurança reforçada
- UX/UI aprimorada
- Suporte a high contrast e reduced motion

### 🐛 Correções
- Inconsistências no sistema de status
- Problemas de exibição de múltiplos membros
- Duplicação de labels
- Contadores de projetos incorretos
- Issues de responsividade mobile

### 🔒 Segurança
- Content Security Policy implementado
- Sanitização de inputs
- Rate limiting robusto
- Validação de entrada aprimorada
- Error handling seguro

---

**© 2024 inChurch - Time de Suporte**  
*Desenvolvido com ❤️ usando Next.js 15, HeroUI, Trello API e tecnologias modernas*  
**Versão 1.0.0** - Sistema completo de dashboard com agrupamento inteligente e sincronização robusta
