/**
 * RealtimeManager - Gerenciamento de subscriptions em tempo real
 * Integração com Supabase MCP e webhooks Trello
 * Seguindo padrões de Vibe Coding e arquitetura Next.js 15
 */

import { supabaseMCPService } from '@/lib/services/supabase-mcp';
import { webhookHandler } from '@/lib/services/webhook-handler';
import { databaseService } from '@/lib/database/prisma';

/**
 * Tipos de eventos real-time
 */
export type RealtimeEventType =
  | 'project-created'
  | 'project-updated'
  | 'project-deleted'
  | 'sync-completed';

/**
 * Payload de evento real-time
 */
export interface RealtimeEvent {
  type: RealtimeEventType;
  data: any;
  timestamp: string;
  source: 'trello' | 'manual' | 'webhook' | 'mcp';
}

/**
 * Callback para eventos real-time
 */
export type RealtimeCallback = (event: RealtimeEvent) => void;

/**
 * Configuração de subscription
 */
export interface SubscriptionConfig {
  eventTypes: RealtimeEventType[];
  callback: RealtimeCallback;
  enabled: boolean;
}

export class RealtimeManager {
  private subscriptions = new Map<string, SubscriptionConfig>();
  private isInitialized = false;
  private eventQueue: RealtimeEvent[] = [];
  private processingQueue = false;

  /**
   * Inicializa o gerenciador de real-time
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Inicializa MCP se disponível
      await supabaseMCPService.initialize();

      // Configura listeners de eventos do browser
      this.setupBrowserEventListeners();

      // Configura subscription MCP para projetos
      await this.setupMCPSubscriptions();

      this.isInitialized = true;
    } catch {
      // RealtimeManager inicializado em modo fallback
      this.isInitialized = true;
    }
  }

  /**
   * Adiciona subscription para eventos real-time
   */
  subscribe(id: string, config: SubscriptionConfig): void {
    this.subscriptions.set(id, config);
  }

  /**
   * Remove subscription
   */
  unsubscribe(id: string): void {
    if (this.subscriptions.has(id)) {
      this.subscriptions.delete(id);
    }
  }

  /**
   * Emite evento para todas as subscriptions ativas
   */
  emit(event: RealtimeEvent): void {
    // Adiciona à fila se estiver processando
    if (this.processingQueue) {
      this.eventQueue.push(event);

      return;
    }

    this.processEvent(event);
  }

  /**
   * Processa evento individual
   */
  private async processEvent(event: RealtimeEvent): Promise<void> {
    this.processingQueue = true;

    try {
      // Notifica todas as subscriptions ativas
      Array.from(this.subscriptions.entries()).forEach(([_id, config]) => {
        if (config.enabled && config.eventTypes.includes(event.type)) {
          try {
            config.callback(event);
          } catch {
            // Erro na subscription - falha silenciosa
          }
        }
      });

      // Processa fila se houver eventos pendentes
      await this.processEventQueue();
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Processa fila de eventos
   */
  private async processEventQueue(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();

      if (event) {
        await this.processEvent(event);
      }
    }
  }

  /**
   * Configura listeners de eventos do browser
   */
  private setupBrowserEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listener para eventos customizados do webhook
    window.addEventListener('project-updated', (event: any) => {
      this.emit({
        type: 'project-updated',
        data: event.detail,
        timestamp: new Date().toISOString(),
        source: 'webhook',
      });
    });

    // Listener para visibilidade da página (para reativar subscriptions)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isInitialized) {
        this.refreshSubscriptions();
      }
    });

    // Event listeners configurados
  }

  /**
   * Configura subscriptions MCP
   */
  private async setupMCPSubscriptions(): Promise<void> {
    try {
      const mcpStatus = supabaseMCPService.getConnectionStatus();

      if (!mcpStatus.connected) {
        return;
      }

      // Subscription para mudanças na tabela projects
      await supabaseMCPService.setupRealtimeSubscription({
        table: 'projects',
        event: '*',
        callback: payload => {
          const eventType = this.mapSupabaseEventToRealtimeEvent(
            payload.eventType
          );

          if (eventType) {
            this.emit({
              type: eventType,
              data: payload,
              timestamp: new Date().toISOString(),
              source: 'mcp',
            });
          }
        },
      });

      // Subscription para histórico de sync
      await supabaseMCPService.setupRealtimeSubscription({
        table: 'sync_history',
        event: 'INSERT',
        callback: payload => {
          this.emit({
            type: 'sync-completed',
            data: payload,
            timestamp: new Date().toISOString(),
            source: 'mcp',
          });
        },
      });

      // MCP subscriptions configuradas
    } catch {
      // Erro ao configurar MCP subscriptions - falha silenciosa
    }
  }

  /**
   * Mapeia eventos do Supabase para eventos real-time
   */
  private mapSupabaseEventToRealtimeEvent(
    supabaseEvent: string
  ): RealtimeEventType | null {
    const mapping: Record<string, RealtimeEventType> = {
      INSERT: 'project-created',
      UPDATE: 'project-updated',
      DELETE: 'project-deleted',
    };

    return mapping[supabaseEvent] || null;
  }

  /**
   * Reativa subscriptions (útil após perda de conexão)
   */
  async refreshSubscriptions(): Promise<void> {
    try {
      // Reativando subscriptions

      // Reinicializa MCP se necessário
      const mcpStatus = supabaseMCPService.getConnectionStatus();

      if (!mcpStatus.connected) {
        await supabaseMCPService.initialize();
      }

      // Reconfigura subscriptions MCP
      await this.setupMCPSubscriptions();

      // Subscriptions reativadas
    } catch {
      // Erro ao reativar subscriptions - falha silenciosa
    }
  }

  /**
   * Processa webhook do Trello via real-time
   */
  async processWebhookRealtime(webhookPayload: any): Promise<void> {
    try {
      const result = await webhookHandler.processWebhook(webhookPayload);

      if (result.success) {
        this.emit({
          type:
            result.action === 'createCard'
              ? 'project-created'
              : 'project-updated',
          data: {
            projectId: result.projectId,
            action: result.action,
            details: result.details,
          },
          timestamp: new Date().toISOString(),
          source: 'webhook',
        });
      }
    } catch {
      console.error('Erro ao processar webhook real-time:');
    }
  }

  /**
   * Força sincronização completa com notificação real-time
   */
  async forceSyncWithRealtime(): Promise<void> {
    try {
      console.log('🔄 Iniciando sincronização forçada...');

      // Busca projetos atualizados
      await databaseService.initialize();
      const projects = await databaseService.getProjects();

      // Emite evento de sincronização completa
      this.emit({
        type: 'sync-completed',
        data: {
          projectCount: projects.length,
          timestamp: new Date().toISOString(),
          forced: true,
        },
        timestamp: new Date().toISOString(),
        source: 'manual',
      });

      console.log('✅ Sincronização forçada concluída');
    } catch {
      console.error('Erro na sincronização forçada:');
    }
  }

  /**
   * Obtém estatísticas do real-time manager
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      subscriptions: this.subscriptions.size,
      activeSubscriptions: Array.from(this.subscriptions.values()).filter(
        s => s.enabled
      ).length,
      eventQueue: this.eventQueue.length,
      processingQueue: this.processingQueue,
      mcpStatus: supabaseMCPService.getConnectionStatus(),
      webhookStats: webhookHandler.getQueueStats(),
    };
  }

  /**
   * Habilita/desabilita subscription específica
   */
  toggleSubscription(id: string, enabled: boolean): void {
    const subscription = this.subscriptions.get(id);

    if (subscription) {
      subscription.enabled = enabled;
      console.log(
        `📡 Subscription ${id} ${enabled ? 'habilitada' : 'desabilitada'}`
      );
    }
  }

  /**
   * Limpa recursos e desconecta
   */
  async disconnect(): Promise<void> {
    try {
      // Remove todos os listeners
      this.subscriptions.clear();
      this.eventQueue = [];

      // Desconecta MCP
      await supabaseMCPService.disconnect();

      this.isInitialized = false;
      console.log('✅ RealtimeManager desconectado');
    } catch {
      console.error('Erro ao desconectar RealtimeManager:');
    }
  }
}

// Instância singleton do gerenciador real-time
export const realtimeManager = new RealtimeManager();
