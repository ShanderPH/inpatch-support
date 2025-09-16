// Usando tipos mock temporários até o Prisma Client ser gerado
import type { Project, SyncHistory } from '@/lib/types/prisma-mock';
import type { Project as TrelloProject } from '@/types/project';

import {
  PrismaClient,
  ProjectStatus,
  ProjectPriority,
  Platform,
  TeamMember,
  SyncAction,
} from '@/lib/types/prisma-mock';
import {
  supabaseMCPService,
  type ProjectAnalytics,
} from '@/lib/services/supabase-mcp';

// Extend Prisma types for better type safety
export type ProjectWithHistory = Project & {
  syncHistory: SyncHistory[];
};

export type CreateProjectData = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProjectData = Partial<CreateProjectData>;

// Global Prisma instance following Next.js best practices
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * DatabaseService - Serviço principal para operações de banco de dados
 * Implementa padrões de Vibe Coding com type safety e error handling
 * Integrado com Supabase MCP para operações avançadas
 */
export class DatabaseService {
  private prisma: PrismaClient;
  private mcpService = supabaseMCPService;
  private isInitialized = false;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Inicializa serviços MCP
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.mcpService.initialize();
      this.isInitialized = true;
    } catch (error) {
      // MCP não disponível, usando modo fallback silentemente
      this.isInitialized = true; // Continue sem MCP
    }
  }

  /**
   * Busca todos os projetos com histórico de sincronização
   */
  async getProjects(): Promise<ProjectWithHistory[]> {
    await this.initialize();

    try {
      return await this.prisma.project.findMany({
        include: {
          syncHistory: {
            orderBy: { timestamp: 'desc' },
            take: 5, // Últimas 5 sincronizações
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      throw new Error('Falha ao carregar projetos do banco de dados');
    }
  }

  /**
   * Busca projetos com filtros avançados via MCP
   */
  async getProjectsWithFilters(filters: {
    status?: ProjectStatus[];
    priority?: ProjectPriority[];
    platforms?: Platform[];
    responsible?: TeamMember[];
    dateRange?: { start: string; end: string };
    searchTerm?: string;
  }): Promise<Project[]> {
    await this.initialize();

    try {
      if (this.mcpService.getConnectionStatus().connected) {
        return await this.mcpService.getProjectsWithAdvancedFilters(filters);
      }

      // Fallback para Prisma nativo
      const where: any = {};

      if (filters.status?.length) {
        where.status = { in: filters.status };
      }

      if (filters.priority?.length) {
        where.priority = { in: filters.priority };
      }

      if (filters.searchTerm) {
        where.OR = [
          { title: { contains: filters.searchTerm, mode: 'insensitive' } },
          {
            description: { contains: filters.searchTerm, mode: 'insensitive' },
          },
        ];
      }

      return await this.prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    } catch (error) {
      throw new Error('Falha ao buscar projetos filtrados');
    }
  }

  /**
   * Busca projeto por ID
   */
  async getProjectById(id: string): Promise<ProjectWithHistory | null> {
    try {
      return await this.prisma.project.findUnique({
        where: { id },
        include: {
          syncHistory: {
            orderBy: { timestamp: 'desc' },
          },
        },
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca projeto por Trello Card ID
   */
  async getProjectByTrelloId(trelloCardId: string): Promise<Project | null> {
    try {
      return await this.prisma.project.findUnique({
        where: { trelloCardId },
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Cria novo projeto
   */
  async createProject(
    data: CreateProjectData,
    source: string = 'manual'
  ): Promise<Project> {
    try {
      return await this.prisma.project.create({
        data: {
          ...data,
          syncHistory: {
            create: {
              action: 'CREATED',
              source,
              success: true,
              details: { message: 'Projeto criado com sucesso' },
            },
          },
        },
      });
    } catch (error) {
      throw new Error('Falha ao criar projeto no banco de dados');
    }
  }

  /**
   * Atualiza projeto existente
   */
  async updateProject(
    id: string,
    data: UpdateProjectData,
    source: string = 'manual'
  ): Promise<Project> {
    try {
      return await this.prisma.project.update({
        where: { id },
        data: {
          ...data,
          syncHistory: {
            create: {
              action: 'UPDATED',
              source,
              success: true,
              details: { changes: Object.keys(data) },
            },
          },
        },
      });
    } catch (error) {
      throw new Error('Falha ao atualizar projeto no banco de dados');
    }
  }

  /**
   * Upsert de projeto (create ou update baseado no trelloCardId)
   */
  async upsertProject(
    data: CreateProjectData,
    source: string = 'trello'
  ): Promise<Project> {
    try {
      const { trelloCardId, ...projectData } = data;

      if (!trelloCardId) {
        throw new Error('trelloCardId é obrigatório para upsert');
      }

      return await this.prisma.project.upsert({
        where: { trelloCardId },
        update: {
          ...projectData,
          syncHistory: {
            create: {
              action: 'UPDATED',
              source,
              success: true,
              details: { trelloCardId },
            },
          },
        },
        create: {
          ...data,
          syncHistory: {
            create: {
              action: 'CREATED',
              source,
              success: true,
              details: { trelloCardId },
            },
          },
        },
      });
    } catch (error) {
      throw new Error('Falha ao sincronizar projeto com banco de dados');
    }
  }

  /**
   * Sincronização em lote de projetos do Trello
   */
  async syncFromTrello(trelloProjects: CreateProjectData[]): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        for (const project of trelloProjects) {
          if (!project.trelloCardId) continue;

          await tx.project.upsert({
            where: { trelloCardId: project.trelloCardId },
            update: {
              ...project,
              syncHistory: {
                create: {
                  action: 'SYNCED',
                  source: 'trello',
                  success: true,
                  details: { batchSync: true },
                },
              },
            },
            create: {
              ...project,
              syncHistory: {
                create: {
                  action: 'CREATED',
                  source: 'trello',
                  success: true,
                  details: { batchSync: true },
                },
              },
            },
          });
        }
      });
    } catch (error) {
      throw new Error('Falha na sincronização em lote com Trello');
    }
  }

  /**
   * Remove projeto
   */
  async deleteProject(id: string): Promise<void> {
    try {
      await this.prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error('Falha ao deletar projeto do banco de dados');
    }
  }

  /**
   * Estatísticas dos projetos (com MCP analytics)
   */
  async getProjectStats() {
    await this.initialize();

    try {
      const [total, inProgress, completed, avgProgress] = await Promise.all([
        this.prisma.project.count(),
        this.prisma.project.count({ where: { status: 'EM_ANDAMENTO' } }),
        this.prisma.project.count({ where: { status: 'CONCLUIDO' } }),
        this.prisma.project.aggregate({
          _avg: { progress: true },
        }),
      ]);

      return {
        total,
        inProgress,
        completed,
        avgProgress: Math.round(avgProgress._avg.progress || 0),
      };
    } catch (error) {
      return { total: 0, inProgress: 0, completed: 0, avgProgress: 0 };
    }
  }

  /**
   * Analytics avançados via MCP
   */
  async getAdvancedAnalytics(
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<ProjectAnalytics | null> {
    await this.initialize();

    try {
      if (this.mcpService.getConnectionStatus().connected) {
        return await this.mcpService.getProjectAnalytics(period);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Histórico de sincronização
   */
  async getSyncHistory(limit: number = 50): Promise<SyncHistory[]> {
    try {
      return await this.prisma.syncHistory.findMany({
        include: {
          project: {
            select: { title: true, trelloCardId: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Registra erro de sincronização
   */
  async logSyncError(
    projectId: string | null,
    action: SyncAction,
    source: string,
    errorMessage: string,
    details?: any
  ): Promise<void> {
    try {
      await this.prisma.syncHistory.create({
        data: {
          projectId: projectId || 'unknown',
          action,
          source,
          success: false,
          errorMessage,
          details,
        },
      });
    } catch (error) {
      // Erro ao registrar erro de sincronização - falha silenciosa
    }
  }

  /**
   * Cleanup de histórico antigo
   */
  async cleanupOldHistory(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();

      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.syncHistory.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Transforma projeto do Trello para formato Prisma
   */
  transformTrelloToProject(trelloProject: TrelloProject): CreateProjectData {
    try {
      // Sanitização e validação de dados
      const title = this.sanitizeString(trelloProject.title);
      const description = this.sanitizeString(trelloProject.description || '');

      if (!title || title.length < 3) {
        throw new Error('Título do projeto inválido');
      }

      // Mapeamento de status
      const statusMapping: Record<string, ProjectStatus> = {
        'a-fazer': ProjectStatus.A_FAZER,
        'em-andamento': ProjectStatus.EM_ANDAMENTO,
        concluido: ProjectStatus.CONCLUIDO,
      };

      // Mapeamento de plataformas
      const platformMapping: Record<string, Platform> = {
        N8N: Platform.N8N,
        Jira: Platform.JIRA,
        Hubspot: Platform.HUBSPOT,
        Backoffice: Platform.BACKOFFICE,
        'Google Workspace': Platform.GOOGLE_WORKSPACE,
      };

      // Mapeamento de membros
      const memberMapping: Record<string, TeamMember> = {
        'Guilherme Souza': TeamMember.GUILHERME_SOUZA,
        'Felipe Braat': TeamMember.FELIPE_BRAAT,
        'Tiago Triani': TeamMember.TIAGO_TRIANI,
      };

      // Transformação de dados
      const platforms = trelloProject.platforms
        .map(p => platformMapping[p])
        .filter(Boolean) as Platform[];

      const responsible = trelloProject.responsible
        .map(r => memberMapping[r])
        .filter(Boolean) as TeamMember[];

      const transformedProject: CreateProjectData = {
        title,
        description,
        progress: Math.max(0, Math.min(100, trelloProject.progress)),
        platforms: platforms.length > 0 ? platforms : [Platform.BACKOFFICE],
        responsible:
          responsible.length > 0 ? responsible : [TeamMember.GUILHERME_SOUZA],
        imageUrl: trelloProject.imageUrl || null,
        startDate: new Date(trelloProject.startDate),
        estimatedEndDate: new Date(trelloProject.estimatedEndDate),
        status: statusMapping[trelloProject.status] || ProjectStatus.A_FAZER,
        priority:
          (trelloProject.priority?.toUpperCase() as ProjectPriority) ||
          ProjectPriority.MEDIUM,
        trelloCardId: trelloProject.trelloCardId || null,
        labels: trelloProject.labels || [],
      };

      return transformedProject;
    } catch (error) {
      console.error('Erro na transformação Trello → Prisma:', error);
      throw new Error(
        `Falha na transformação do projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Sincronização em lote com transformação e validação MCP
   */
  async syncFromTrelloWithMCP(trelloProjects: TrelloProject[]): Promise<{
    success: number;
    errors: { project: string; error: string }[];
  }> {
    await this.initialize();

    const results = {
      success: 0,
      errors: [] as { project: string; error: string }[],
    };

    try {
      await this.prisma.$transaction(async tx => {
        for (const trelloProject of trelloProjects) {
          try {
            const transformedProject =
              this.transformTrelloToProject(trelloProject);

            if (!transformedProject.trelloCardId) {
              throw new Error('trelloCardId é obrigatório');
            }

            await tx.project.upsert({
              where: { trelloCardId: transformedProject.trelloCardId },
              update: {
                ...transformedProject,
                syncHistory: {
                  create: {
                    action: 'SYNCED',
                    source: 'trello-mcp',
                    success: true,
                    details: {
                      batchSync: true,
                      mcpEnabled:
                        this.mcpService.getConnectionStatus().connected,
                    },
                  },
                },
              },
              create: {
                ...transformedProject,
                syncHistory: {
                  create: {
                    action: 'CREATED',
                    source: 'trello-mcp',
                    success: true,
                    details: {
                      batchSync: true,
                      mcpEnabled:
                        this.mcpService.getConnectionStatus().connected,
                    },
                  },
                },
              },
            });

            results.success++;
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : 'Erro desconhecido';

            results.errors.push({
              project: trelloProject.title || 'Projeto sem título',
              error: errorMsg,
            });

            // Log do erro no histórico
            await this.logSyncError(
              null,
              SyncAction.ERROR,
              'trello-mcp',
              errorMsg,
              { trelloCardId: trelloProject.trelloCardId }
            );
          }
        }
      });

      console.log(
        `✅ Sincronização MCP concluída: ${results.success} sucessos, ${results.errors.length} erros`
      );

      return results;
    } catch (error) {
      console.error('Erro na sincronização MCP em lote:', error);
      throw new Error('Falha na sincronização em lote com MCP');
    }
  }

  /**
   * Sanitiza strings para segurança
   */
  private sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JS protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 255); // Limita tamanho
  }

  /**
   * Obtém status da integração MCP
   */
  getMCPStatus() {
    return {
      initialized: this.isInitialized,
      ...this.mcpService.getConnectionStatus(),
    };
  }

  /**
   * Fecha conexão com o banco e MCP
   */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.prisma.$disconnect(),
      this.mcpService.disconnect(),
    ]);
  }
}

// Instância singleton do serviço de banco
export const databaseService = new DatabaseService();

// Export dos tipos para uso em outros arquivos
export type {
  Project,
  SyncHistory,
  ProjectStatus,
  ProjectPriority,
  Platform,
  TeamMember,
  SyncAction,
};
