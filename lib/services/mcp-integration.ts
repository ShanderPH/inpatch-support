/**
 * MCP Integration - Integração real com ferramentas MCP do Supabase
 * Implementa conexão direta com MCP tools disponíveis no ambiente
 * Seguindo padrões de Vibe Coding e arquitetura Next.js 15
 */

// Tipos para integração MCP real
export interface MCPTools {
  mcp2_execute_sql?: (params: {
    project_id: string;
    query: string;
  }) => Promise<any>;
  mcp2_get_project?: (params: { id: string }) => Promise<any>;
  mcp2_get_project_url?: (params: { project_id: string }) => Promise<any>;
  mcp2_list_projects?: () => Promise<any>;
  mcp2_get_anon_key?: (params: { project_id: string }) => Promise<any>;
  mcp2_generate_typescript_types?: (params: {
    project_id: string;
  }) => Promise<any>;
  mcp2_apply_migration?: (params: {
    project_id: string;
    name: string;
    query: string;
  }) => Promise<any>;
  mcp2_get_logs?: (params: {
    project_id: string;
    service: string;
  }) => Promise<any>;
}

/**
 * Detector de ferramentas MCP disponíveis
 */
export class MCPToolsDetector {
  private availableTools: Partial<MCPTools> = {};
  private isDetected = false;

  /**
   * Detecta ferramentas MCP disponíveis no ambiente
   */
  async detectAvailableTools(): Promise<void> {
    if (this.isDetected) return;

    try {
      // Verifica se estamos no browser e se MCP tools estão disponíveis
      if (typeof window !== 'undefined') {
        const windowWithMCP = window as any;

        // Lista de ferramentas MCP para detectar
        const mcpToolNames: (keyof MCPTools)[] = [
          'mcp2_execute_sql',
          'mcp2_get_project',
          'mcp2_get_project_url',
          'mcp2_list_projects',
          'mcp2_get_anon_key',
          'mcp2_generate_typescript_types',
          'mcp2_apply_migration',
          'mcp2_get_logs',
        ];

        // Detecta cada ferramenta disponível
        for (const toolName of mcpToolNames) {
          if (typeof windowWithMCP[toolName] === 'function') {
            this.availableTools[toolName] = windowWithMCP[toolName];
          }
        }
      }

      this.isDetected = true;
    } catch {
      // Falha na detecção - modo fallback
      this.isDetected = true;
    }
  }

  /**
   * Verifica se uma ferramenta MCP específica está disponível
   */
  isToolAvailable(toolName: keyof MCPTools): boolean {
    return Boolean(this.availableTools[toolName]);
  }

  /**
   * Obtém ferramenta MCP se disponível
   */
  getTool<T extends keyof MCPTools>(toolName: T): MCPTools[T] | null {
    return this.availableTools[toolName] || null;
  }

  /**
   * Lista todas as ferramentas disponíveis
   */
  getAvailableTools(): (keyof MCPTools)[] {
    return Object.keys(this.availableTools) as (keyof MCPTools)[];
  }

  /**
   * Obtém estatísticas das ferramentas MCP
   */
  getToolsStats(): {
    detected: boolean;
    totalAvailable: number;
    availableTools: string[];
    mcpEnabled: boolean;
  } {
    const availableTools = this.getAvailableTools();

    return {
      detected: this.isDetected,
      totalAvailable: availableTools.length,
      availableTools: availableTools.map(String),
      mcpEnabled: availableTools.length > 0,
    };
  }
}

/**
 * Wrapper para execução segura de ferramentas MCP
 */
export class SafeMCPExecutor {
  constructor(private detector: MCPToolsDetector) {}

  /**
   * Executa SQL via MCP com fallback
   */
  async executeSQL(params: {
    project_id: string;
    query: string;
  }): Promise<{ data: any[]; error?: string }> {
    const tool = this.detector.getTool('mcp2_execute_sql');

    if (tool) {
      try {
        const result = await tool(params);

        return { data: result || [] };
      } catch (error) {
        return {
          data: [],
          error:
            error instanceof Error ? error.message : 'MCP execution failed',
        };
      }
    }

    // Fallback para dados vazios se MCP não disponível
    return { data: [] };
  }

  /**
   * Obtém informações do projeto via MCP
   */
  async getProject(params: { id: string }): Promise<{
    id: string;
    name: string;
    status: string;
  }> {
    const tool = this.detector.getTool('mcp2_get_project');

    if (tool) {
      try {
        const result = await tool(params);

        return (
          result || { id: params.id, name: 'Unknown Project', status: 'active' }
        );
      } catch {
        // Fallback silencioso
      }
    }

    return { id: params.id, name: 'Fallback Project', status: 'active' };
  }

  /**
   * Obtém URL do projeto via MCP
   */
  async getProjectUrl(params: {
    project_id: string;
  }): Promise<{ url: string }> {
    const tool = this.detector.getTool('mcp2_get_project_url');

    if (tool) {
      try {
        const result = await tool(params);

        return (
          result || {
            url: `https://supabase.com/dashboard/project/${params.project_id}`,
          }
        );
      } catch {
        // Fallback silencioso
      }
    }

    return {
      url: `https://supabase.com/dashboard/project/${params.project_id}`,
    };
  }

  /**
   * Lista projetos via MCP
   */
  async listProjects(): Promise<any[]> {
    const tool = this.detector.getTool('mcp2_list_projects');

    if (tool) {
      try {
        const result = await tool();

        return result || [];
      } catch {
        // Fallback silencioso
      }
    }

    return [];
  }

  /**
   * Obtém chave anônima via MCP
   */
  async getAnonKey(params: { project_id: string }): Promise<{ key?: string }> {
    const tool = this.detector.getTool('mcp2_get_anon_key');

    if (tool) {
      try {
        const result = await tool(params);

        return result || {};
      } catch {
        // Fallback silencioso
      }
    }

    return {};
  }

  /**
   * Gera tipos TypeScript via MCP
   */
  async generateTypes(params: {
    project_id: string;
  }): Promise<{ types?: string }> {
    const tool = this.detector.getTool('mcp2_generate_typescript_types');

    if (tool) {
      try {
        const result = await tool(params);

        return result || {};
      } catch {
        // Fallback silencioso
      }
    }

    return {};
  }

  /**
   * Aplica migração via MCP
   */
  async applyMigration(params: {
    project_id: string;
    name: string;
    query: string;
  }): Promise<{ success: boolean; error?: string }> {
    const tool = this.detector.getTool('mcp2_apply_migration');

    if (tool) {
      try {
        const result = await tool(params);

        return { success: Boolean(result), error: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Migration failed',
        };
      }
    }

    return { success: false, error: 'MCP migration tool not available' };
  }

  /**
   * Obtém logs via MCP
   */
  async getLogs(params: {
    project_id: string;
    service: string;
  }): Promise<any[]> {
    const tool = this.detector.getTool('mcp2_get_logs');

    if (tool) {
      try {
        const result = await tool(params);

        return result || [];
      } catch {
        // Fallback silencioso
      }
    }

    return [];
  }
}

/**
 * Instâncias singleton para uso global
 */
export const mcpToolsDetector = new MCPToolsDetector();
export const safeMCPExecutor = new SafeMCPExecutor(mcpToolsDetector);

/**
 * Hook para inicialização automática do MCP
 */
export async function initializeMCP(): Promise<{
  success: boolean;
  toolsAvailable: number;
  error?: string;
}> {
  try {
    await mcpToolsDetector.detectAvailableTools();
    const stats = mcpToolsDetector.getToolsStats();

    return {
      success: true,
      toolsAvailable: stats.totalAvailable,
    };
  } catch (error) {
    return {
      success: false,
      toolsAvailable: 0,
      error:
        error instanceof Error ? error.message : 'MCP initialization failed',
    };
  }
}
