// Note: toast only works on client side, use conditional import

import { Project } from '@/types/project';
import { databaseService } from '@/lib/database/prisma';
import { supabaseMCPService } from '@/lib/services/supabase-mcp';
import { cacheService } from '@/lib/cache/cache-service';
import { trelloApi } from '@/lib/trello';
import { convertPrismaToLegacyProject } from '@/lib/utils/transformers';
import { testTrelloDirectly } from '@/lib/test-trello-direct';

/**
 * SyncOrchestrator - Orquestrador central de sincronização
 * Versão simplificada e funcional para Fase 5
 *
 * Responsabilidades:
 * - Coordenar sincronização entre Trello, Prisma e Supabase MCP
 * - Gerenciar cache e métricas básicas
 * - Garantir consistência de dados
 */
export class SyncOrchestrator {
  private static instance: SyncOrchestrator;
  private isInitialized = false;
  private syncInProgress = false;
  private subscribers: Set<(projects: Project[]) => void> = new Set();

  // Metrics
  private metrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncDuration: 0,
    avgSyncDuration: 0,
  };

  private constructor() {
    // Constructor privado para singleton
  }

  static getInstance(): SyncOrchestrator {
    if (!SyncOrchestrator.instance) {
      SyncOrchestrator.instance = new SyncOrchestrator();
    }

    return SyncOrchestrator.instance;
  }

  /**
   * Inicializa os serviços necessários
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Inicializando SyncOrchestrator...');

      // Initialize services
      await databaseService.initialize();
      await supabaseMCPService.initialize();

      this.isInitialized = true;
      console.log('✅ SyncOrchestrator inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar SyncOrchestrator:', error);
      // Continue with degraded functionality
      this.isInitialized = true;
    }
  }

  /**
   * Sincronização completa usando a arquitetura existente
   */
  async performFullSync(): Promise<{
    projects: Project[];
    metrics: {
      totalSyncs: number;
      successfulSyncs: number;
      failedSyncs: number;
      lastSyncDuration: number;
      avgSyncDuration: number;
    };
  }> {
    if (this.syncInProgress) {
      throw new Error('Sincronização já em andamento');
    }

    const startTime = Date.now();

    this.syncInProgress = true;
    this.metrics.totalSyncs++;

    try {
      await this.initialize();

      // Use toast only on client side
      const toast =
        typeof window !== 'undefined' ? await import('react-hot-toast') : null;

      toast?.default.loading('Iniciando sincronização completa...', {
        id: 'full-sync',
      });

      // 1. Check cache first (but always force sync for debugging)
      const cachedProjects = await cacheService.getCachedProjects();

      console.log(
        '💾 Cache check:',
        cachedProjects
          ? `Found ${cachedProjects.length} cached projects`
          : 'No cache found'
      );

      // Always force sync for now to debug the issue
      if (cachedProjects && !this.shouldForceSync()) {
        console.log('💾 Using cached projects');
        toast?.default.success('Projetos carregados do cache!', {
          id: 'full-sync',
        });

        return {
          projects: cachedProjects,
          metrics: this.metrics,
        };
      }

      console.log('🔄 Forcing fresh sync from Trello...');

      // 2. Fetch from Trello
      toast?.default.loading('Buscando dados do Trello...', {
        id: 'full-sync',
      });

      // Run direct test first
      console.log('🧪 Running direct Trello test...');
      const testResult = await testTrelloDirectly();

      console.log('🧪 Test result:', testResult);

      const trelloCards = await trelloApi.getBoardCards();

      console.log(`🔍 Fetched ${trelloCards.length} cards from Trello`);
      console.log('Sample card:', trelloCards[0]);

      // 3. Transform to Project format
      const projects = trelloApi.transformCardsToProjects(trelloCards);

      console.log(`🔄 Transformed to ${projects.length} projects`);
      console.log('Sample project:', projects[0]);

      // 4. Filter valid projects
      const validProjects = projects.filter(
        project =>
          project.title &&
          project.title.trim() !== '' &&
          !project.title.toLowerCase().includes('template') &&
          !project.title.toLowerCase().includes('exemplo')
      );

      console.log(`✅ Filtered to ${validProjects.length} valid projects`);

      // Check if database is connected before trying to sync
      const dbStatus = databaseService.getMCPStatus();

      console.log('📊 Database status:', dbStatus);

      if (dbStatus.connected) {
        // 5. Sync with database if available and connected
        try {
          toast?.default.loading('Sincronizando com banco de dados...', {
            id: 'full-sync',
          });

          // Transform to Prisma format and sync
          const transformedProjects = validProjects;

          console.log('🔄 Syncing projects with database...');
          console.log(
            'Projects to sync:',
            transformedProjects.map(p => ({
              id: p.id,
              title: p.title,
              status: p.status,
            }))
          );

          const syncResults =
            await databaseService.syncFromTrelloWithMCP(transformedProjects);

          // Get fresh data from database
          const dbProjects = await databaseService.getProjects();
          const legacyProjects = dbProjects.map(convertPrismaToLegacyProject);

          // Update cache
          await cacheService.setCachedProjects(legacyProjects);

          console.log(`💾 Cached ${legacyProjects.length} projects`);
          console.log(
            'Final projects:',
            legacyProjects.map(p => ({
              id: p.id,
              title: p.title,
              status: p.status,
            }))
          );

          // Notify subscribers
          this.notifySubscribers(legacyProjects);

          const duration = Date.now() - startTime;

          this.updateMetrics(duration, true);

          toast?.default.success(
            `✅ Sincronização concluída! ${syncResults.success} projetos sincronizados`,
            { id: 'full-sync' }
          );

          if (syncResults.errors.length > 0) {
            toast?.default.error(
              `⚠️ ${syncResults.errors.length} erros durante a sincronização`,
              { duration: 5000 }
            );
          }

          console.log(
            '✅ SyncOrchestrator: Returning database projects:',
            legacyProjects.length
          );
          console.log(
            '✅ SyncOrchestrator: Sample database project:',
            legacyProjects[0]
          );

          return {
            projects: legacyProjects,
            metrics: this.metrics,
          };
        } catch (dbError) {
          console.warn(
            'Database sync failed, falling back to Trello-only mode:',
            dbError
          );
        }
      } else {
        console.log('⚠️ Database not connected, using Trello-only mode');
      }

      // Fallback: Use Trello data directly (no database)
      console.log('📋 Using Trello data directly without database');

      // Update cache with Trello data
      await cacheService.setCachedProjects(validProjects);

      console.log(`💾 Cached ${validProjects.length} projects (Trello direct)`);
      console.log(
        'Direct projects:',
        validProjects.map(p => ({ id: p.id, title: p.title, status: p.status }))
      );

      // Notify subscribers
      this.notifySubscribers(validProjects);

      const duration = Date.now() - startTime;

      this.updateMetrics(duration, true);

      toast?.default.success(
        `✅ ${validProjects.length} projetos carregados do Trello!`,
        { id: 'full-sync' }
      );

      console.log(
        '✅ SyncOrchestrator: Returning direct projects:',
        validProjects.length
      );
      console.log(
        '✅ SyncOrchestrator: Sample direct project:',
        validProjects[0]
      );

      return {
        projects: validProjects,
        metrics: this.metrics,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.updateMetrics(duration, false);

      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      // Use toast only on client side
      if (typeof window !== 'undefined') {
        const toast = await import('react-hot-toast');

        toast.default.error(`❌ Erro na sincronização: ${errorMessage}`, {
          id: 'full-sync',
        });
      }

      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincronização incremental (apenas mudanças)
   */
  async performIncrementalSync(): Promise<Project[]> {
    try {
      await this.initialize();

      // For now, perform a lightweight full sync
      // In the future, this could check for specific changes
      const result = await this.performFullSync();

      return result.projects;
    } catch (error) {
      console.error('Erro na sincronização incremental:', error);
      throw error;
    }
  }

  /**
   * Notifica subscribers sobre mudanças
   */
  private notifySubscribers(projects: Project[]): void {
    console.log(
      '📢 SyncOrchestrator: Notifying',
      this.subscribers.size,
      'subscribers with',
      projects.length,
      'projects'
    );
    console.log(
      '📢 SyncOrchestrator: Sample project for notification:',
      projects[0]
    );

    let index = 0;

    this.subscribers.forEach(callback => {
      try {
        index++;
        console.log(`📢 SyncOrchestrator: Calling subscriber ${index}`);
        callback(projects);
        console.log(
          `✅ SyncOrchestrator: Subscriber ${index} notified successfully`
        );
      } catch (error) {
        console.error(
          `❌ SyncOrchestrator: Erro ao notificar subscriber ${index}:`,
          error
        );
      }
    });
  }

  /**
   * Adiciona subscriber para updates
   */
  subscribe(callback: (projects: Project[]) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Verifica se deve forçar sincronização
   */
  private shouldForceSync(): boolean {
    // For development, force sync to ensure we see data
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.log(
      '🔄 shouldForceSync:',
      isDevelopment ? 'true (development mode)' : 'false (production mode)'
    );

    return isDevelopment;
  }

  /**
   * Atualiza métricas de performance
   */
  private updateMetrics(duration: number, success: boolean): void {
    this.metrics.lastSyncDuration = duration;
    this.metrics.avgSyncDuration =
      (this.metrics.avgSyncDuration + duration) / 2;

    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }
  }

  /**
   * Obtém métricas de performance
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalSyncs > 0
          ? this.metrics.successfulSyncs / this.metrics.totalSyncs
          : 0,
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      servicesStatus: {
        database: databaseService.getMCPStatus(),
        mcp: supabaseMCPService.getConnectionStatus(),
        cache: cacheService.getStats(),
      },
    };
  }

  /**
   * Força limpeza de cache
   */
  async clearCache(): Promise<void> {
    await cacheService.invalidateAll();

    // Use toast only on client side
    if (typeof window !== 'undefined') {
      const toast = await import('react-hot-toast');

      toast.default.success('Cache limpo com sucesso!');
    }
  }

  /**
   * Obtém status geral do sistema
   */
  getSystemStatus() {
    return {
      orchestrator: {
        initialized: this.isInitialized,
        syncInProgress: this.syncInProgress,
        subscribersCount: this.subscribers.size,
      },
      services: {
        database: databaseService.getMCPStatus(),
        mcp: supabaseMCPService.getConnectionStatus(),
        cache: cacheService.getStats(),
      },
      metrics: this.metrics,
    };
  }

  /**
   * Cleanup de recursos
   */
  async cleanup(): Promise<void> {
    try {
      this.subscribers.clear();
      await Promise.all([
        databaseService.disconnect(),
        supabaseMCPService.disconnect(),
      ]);

      this.isInitialized = false;
      console.log('✅ SyncOrchestrator cleanup concluído');
    } catch (error) {
      console.error('Erro durante cleanup:', error);
    }
  }
}

// Singleton instance
export const syncOrchestrator = SyncOrchestrator.getInstance();
