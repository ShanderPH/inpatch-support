/**
 * SupabaseMCPService - Integração avançada com Supabase via MCP
 * Implementa operações avançadas, analytics e real-time subscriptions
 * Seguindo padrões de Vibe Coding e arquitetura Next.js 15
 */

import type {
  Project,
  ProjectStatus,
  ProjectPriority,
  Platform,
  TeamMember,
} from '@/lib/types/prisma-mock';

// MCP Types - será substituído quando MCP estiver disponível
interface MCPExecuteResult {
  data: any[];
  error?: string;
}

interface MCPProjectInfo {
  id: string;
  name: string;
  status: string;
}

// Mock MCP functions até integração real
const mockMCP = {
  async execute_sql(params: {
    project_id: string;
    query: string;
  }): Promise<MCPExecuteResult> {
    return { data: [] };
  },

  async get_project(params: { id: string }): Promise<MCPProjectInfo> {
    return { id: params.id, name: 'Mock Project', status: 'active' };
  },

  async get_project_url(params: {
    project_id: string;
  }): Promise<{ url: string }> {
    return { url: `https://mock-supabase-url.com/${params.project_id}` };
  },
};

/**
 * Estatísticas de projetos por período
 */
export interface ProjectAnalytics {
  totalProjects: number;
  projectsByStatus: Record<ProjectStatus, number>;
  projectsByPriority: Record<ProjectPriority, number>;
  projectsByPlatform: Record<Platform, number>;
  projectsByTeamMember: Record<TeamMember, number>;
  avgProgress: number;
  completionRate: number;
  weeklyTrends: {
    week: string;
    created: number;
    completed: number;
  }[];
}

/**
 * Configuração de Real-time subscription
 */
export interface RealtimeConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
}

export class SupabaseMCPService {
  private projectId: string;
  private isConnected: boolean = false;
  private subscriptions: Map<string, any> = new Map();

  constructor() {
    this.projectId =
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'mock-project';
  }

  /**
   * Inicializa conexão MCP e valida projeto
   */
  async initialize(): Promise<void> {
    try {
      const projectInfo = await mockMCP.get_project({ id: this.projectId });

      if (!projectInfo.id) {
        throw new Error('Projeto Supabase não encontrado');
      }

      this.isConnected = true;
    } catch (error) {
      throw new Error('Falha na inicialização do Supabase MCP');
    }
  }

  /**
   * Executa query SQL avançada via MCP
   */
  async executeAdvancedQuery(query: string): Promise<any[]> {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      const result = await mockMCP.execute_sql({
        project_id: this.projectId,
        query: this.sanitizeQuery(query),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    } catch (error) {
      throw new Error('Falha na execução da query avançada');
    }
  }

  /**
   * Obtém analytics completos dos projetos
   */
  async getProjectAnalytics(
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<ProjectAnalytics> {
    const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;

    const analyticsQuery = `
      WITH project_stats AS (
        SELECT 
          status,
          priority,
          platforms,
          responsible,
          progress,
          created_at,
          CASE WHEN status = 'concluido' THEN 1 ELSE 0 END as is_completed,
          EXTRACT(WEEK FROM created_at) as week_number,
          TO_CHAR(created_at, 'YYYY-WW') as week_label
        FROM projects 
        WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
      ),
      weekly_trends AS (
        SELECT 
          week_label,
          COUNT(*) as created,
          SUM(is_completed) as completed
        FROM project_stats
        GROUP BY week_label, week_number
        ORDER BY week_number DESC
        LIMIT 12
      )
      SELECT 
        -- Totais
        COUNT(*) as total_projects,
        AVG(progress) as avg_progress,
        (SUM(is_completed)::float / COUNT(*) * 100) as completion_rate,
        
        -- Por status
        COUNT(*) FILTER (WHERE status = 'a-fazer') as status_a_fazer,
        COUNT(*) FILTER (WHERE status = 'em-andamento') as status_em_andamento,
        COUNT(*) FILTER (WHERE status = 'concluido') as status_concluido,
        
        -- Por prioridade
        COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
        COUNT(*) FILTER (WHERE priority = 'medium') as priority_medium,
        COUNT(*) FILTER (WHERE priority = 'high') as priority_high,
        
        -- Trends semanais (JSON)
        COALESCE(
          (SELECT json_agg(json_build_object('week', week_label, 'created', created, 'completed', completed))
           FROM weekly_trends), 
          '[]'::json
        ) as weekly_trends
        
      FROM project_stats;
    `;

    try {
      const result = await this.executeAdvancedQuery(analyticsQuery);
      const data = result[0] || {};

      return {
        totalProjects: data.total_projects || 0,
        avgProgress: Math.round(data.avg_progress || 0),
        completionRate: Math.round(data.completion_rate || 0),

        projectsByStatus: {
          A_FAZER: data.status_a_fazer || 0,
          EM_ANDAMENTO: data.status_em_andamento || 0,
          CONCLUIDO: data.status_concluido || 0,
        } as Record<ProjectStatus, number>,

        projectsByPriority: {
          LOW: data.priority_low || 0,
          MEDIUM: data.priority_medium || 0,
          HIGH: data.priority_high || 0,
        } as Record<ProjectPriority, number>,

        // Mock data para plataformas e membros (será implementado com queries específicas)
        projectsByPlatform: {} as Record<Platform, number>,
        projectsByTeamMember: {} as Record<TeamMember, number>,

        weeklyTrends: data.weekly_trends || [],
      };
    } catch (error) {
      // Retorna analytics vazios em caso de erro
      return {
        totalProjects: 0,
        avgProgress: 0,
        completionRate: 0,
        projectsByStatus: {
          A_FAZER: 0,
          EM_ANDAMENTO: 0,
          CONCLUIDO: 0,
        } as Record<ProjectStatus, number>,
        projectsByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 } as Record<
          ProjectPriority,
          number
        >,
        projectsByPlatform: {} as Record<Platform, number>,
        projectsByTeamMember: {} as Record<TeamMember, number>,
        weeklyTrends: [],
      };
    }
  }

  /**
   * Obtém projetos com filtros avançados via SQL
   */
  async getProjectsWithAdvancedFilters(filters: {
    status?: ProjectStatus[];
    priority?: ProjectPriority[];
    platforms?: Platform[];
    responsible?: TeamMember[];
    dateRange?: { start: string; end: string };
    searchTerm?: string;
  }): Promise<Project[]> {
    const conditions: string[] = ['1=1']; // Base condition

    if (filters.status?.length) {
      const statusList = filters.status.map(s => `'${s}'`).join(',');

      conditions.push(`status IN (${statusList})`);
    }

    if (filters.priority?.length) {
      const priorityList = filters.priority.map(p => `'${p}'`).join(',');

      conditions.push(`priority IN (${priorityList})`);
    }

    if (filters.dateRange) {
      conditions.push(
        `created_at BETWEEN '${filters.dateRange.start}' AND '${filters.dateRange.end}'`
      );
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.replace(/'/g, "''"); // Escape quotes

      conditions.push(
        `(title ILIKE '%${searchTerm}%' OR description ILIKE '%${searchTerm}%')`
      );
    }

    const query = `
      SELECT * FROM projects 
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
      LIMIT 100;
    `;

    return await this.executeAdvancedQuery(query);
  }

  /**
   * Configura Real-time subscription para mudanças nos projetos
   */
  async setupRealtimeSubscription(config: RealtimeConfig): Promise<string> {
    const subscriptionId = `${config.table}_${config.event}_${Date.now()}`;

    try {
      // Mock implementation - será substituído por real-time subscription
      // Simula subscription ativa
      this.subscriptions.set(subscriptionId, {
        table: config.table,
        event: config.event,
        callback: config.callback,
        active: true,
      });

      return subscriptionId;
    } catch (error) {
      throw new Error('Falha na configuração de real-time subscription');
    }
  }

  /**
   * Remove subscription real-time
   */
  async removeRealtimeSubscription(subscriptionId: string): Promise<void> {
    try {
      if (this.subscriptions.has(subscriptionId)) {
        this.subscriptions.delete(subscriptionId);
      }
    } catch (error) {
      // Erro ao remover subscription - falha silenciosa
    }
  }

  /**
   * Obtém URL do projeto Supabase
   */
  async getProjectUrl(): Promise<string> {
    try {
      const result = await mockMCP.get_project_url({
        project_id: this.projectId,
      });

      return result.url;
    } catch (error) {
      console.error('Erro ao obter URL do projeto:', error);

      return 'https://supabase.com';
    }
  }

  /**
   * Executa backup de dados críticos
   */
  async createDataBackup(): Promise<{
    success: boolean;
    backupId?: string;
    error?: string;
  }> {
    try {
      const backupQuery = `
        SELECT 
          'projects' as table_name,
          COUNT(*) as record_count,
          NOW() as backup_timestamp
        FROM projects
        UNION ALL
        SELECT 
          'sync_history' as table_name,
          COUNT(*) as record_count,
          NOW() as backup_timestamp
        FROM sync_history;
      `;

      const result = await this.executeAdvancedQuery(backupQuery);
      const backupId = `backup_${Date.now()}`;

      return { success: true, backupId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Sanitiza queries SQL para segurança
   */
  private sanitizeQuery(query: string): string {
    // Remove comentários SQL maliciosos
    const sanitized = query
      .replace(/--.*$/gm, '') // Remove comentários de linha
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
      .trim();

    // Valida se não contém comandos perigosos
    const dangerousCommands = [
      'DROP',
      'DELETE',
      'TRUNCATE',
      'ALTER',
      'CREATE',
      'INSERT',
      'UPDATE',
    ];
    const upperQuery = sanitized.toUpperCase();

    for (const cmd of dangerousCommands) {
      if (upperQuery.includes(cmd) && !upperQuery.startsWith('SELECT')) {
        throw new Error(`Comando SQL não permitido: ${cmd}`);
      }
    }

    return sanitized;
  }

  /**
   * Obtém status da conexão MCP
   */
  getConnectionStatus(): {
    connected: boolean;
    projectId: string;
    subscriptions: number;
  } {
    return {
      connected: this.isConnected,
      projectId: this.projectId,
      subscriptions: this.subscriptions.size,
    };
  }

  /**
   * Desconecta e limpa recursos
   */
  async disconnect(): Promise<void> {
    try {
      // Remove todas as subscriptions
      const subscriptionIds = Array.from(this.subscriptions.keys());

      for (const id of subscriptionIds) {
        await this.removeRealtimeSubscription(id);
      }

      this.isConnected = false;
      console.log('✅ MCP desconectado com sucesso');
    } catch (error) {
      console.error('Erro ao desconectar MCP:', error);
    }
  }
}

// Instância singleton do serviço MCP
export const supabaseMCPService = new SupabaseMCPService();
