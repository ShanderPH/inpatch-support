/**
 * Tipos mock do Prisma Client até a geração correta
 * Arquivo temporário para resolver dependências durante a migração
 */

export class PrismaClient {
  constructor(_options?: { log?: string[] }) {
    // Mock constructor aceita opções mas não faz nada
  }

  project = {
    findMany: async (_args?: any): Promise<any[]> => [],
    findUnique: async (_args: any): Promise<any | null> => null,
    create: async (_args: any): Promise<any> => ({}),
    update: async (_args: any): Promise<any> => ({}),
    upsert: async (_args: any): Promise<any> => ({}),
    delete: async (_args: any): Promise<void> => {},
    count: async (_args?: any): Promise<number> => 0,
    aggregate: async (_args: any): Promise<any> => ({}),
  };

  syncHistory = {
    findMany: async (_args?: any): Promise<any[]> => [],
    create: async (_args: any): Promise<any> => ({}),
    deleteMany: async (_args: any): Promise<{ count: number }> => ({
      count: 0,
    }),
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
