/**
 * Tipos mock do Prisma Client até a geração correta
 * Arquivo temporário para resolver dependências durante a migração
 */

export class PrismaClient {
  constructor(options?: { log?: string[] }) {
    // Mock constructor aceita opções mas não faz nada
  }

  project = {
    findMany: async (args?: any): Promise<any[]> => [],
    findUnique: async (args: any): Promise<any | null> => null,
    create: async (args: any): Promise<any> => ({}),
    update: async (args: any): Promise<any> => ({}),
    upsert: async (args: any): Promise<any> => ({}),
    delete: async (args: any): Promise<void> => {},
    count: async (args?: any): Promise<number> => 0,
    aggregate: async (args: any): Promise<any> => ({}),
  };

  syncHistory = {
    findMany: async (args?: any): Promise<any[]> => [],
    create: async (args: any): Promise<any> => ({}),
    deleteMany: async (args: any): Promise<{ count: number }> => ({ count: 0 }),
  };

  async $transaction(fn: (tx: any) => Promise<void>): Promise<void> {
    await fn(this);
  }

  async $disconnect(): Promise<void> {}
}

export enum ProjectStatus {
  A_FAZER = 'A_FAZER',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDO = 'CONCLUIDO',
}

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum Platform {
  N8N = 'N8N',
  JIRA = 'JIRA',
  HUBSPOT = 'HUBSPOT',
  BACKOFFICE = 'BACKOFFICE',
  GOOGLE_WORKSPACE = 'GOOGLE_WORKSPACE',
}

export enum TeamMember {
  GUILHERME_SOUZA = 'GUILHERME_SOUZA',
  FELIPE_BRAAT = 'FELIPE_BRAAT',
  TIAGO_TRIANI = 'TIAGO_TRIANI',
}

export enum SyncAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  SYNCED = 'SYNCED',
  ERROR = 'ERROR',
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  platforms: Platform[];
  responsible: TeamMember[];
  imageUrl: string | null;
  startDate: Date;
  estimatedEndDate: Date;
  status: ProjectStatus;
  priority: ProjectPriority;
  trelloCardId: string | null;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncHistory {
  id: string;
  projectId: string;
  action: SyncAction;
  timestamp: Date;
  source: string;
  details: any;
  success: boolean;
  errorMessage: string | null;
  project?: Project;
}
