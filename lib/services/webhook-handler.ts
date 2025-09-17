/**
 * WebhookHandler - Processamento de webhooks Trello no lado cliente
 * Integração com MCP e real-time subscriptions
 * Seguindo padrões de Vibe Coding e arquitetura Next.js 15
 */

import type { Project as TrelloProject } from '@/types/project';

import { databaseService } from '@/lib/database/prisma';
import { supabaseMCPService } from '@/lib/services/supabase-mcp';

/**
 * Payload do webhook Trello processado
 */
export interface WebhookPayload {
  action: {
    type: string;
    data: {
      card?: {
        id: string;
        name: string;
        desc: string;
        due: string | null;
        list: { name: string };
        labels: Array<{ name: string; color: string }>;
        members: Array<{ fullName: string }>;
        checklists?: Array<{
          checkItems: Array<{ state: 'complete' | 'incomplete' }>;
        }>;
      };
    };
  };
}

/**
 * Resultado do processamento do webhook
 */
export interface WebhookProcessResult {
  success: boolean;
  projectId?: string;
  action?: string;
  error?: string;
  details?: any;
}

export class WebhookHandler {
  private isProcessing = false;
  private processingQueue: WebhookPayload[] = [];

  /**
   * Processa webhook do Trello
   */
  async processWebhook(payload: WebhookPayload): Promise<WebhookProcessResult> {
    try {
      // Adiciona à fila se já está processando
      if (this.isProcessing) {
        this.processingQueue.push(payload);

        return { success: true, action: 'queued' };
      }

      this.isProcessing = true;

      const result = await this.handleWebhookPayload(payload);

      // Processa fila se houver itens pendentes
      await this.processQueue();

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processa payload individual do webhook
   */
  private async handleWebhookPayload(
    payload: WebhookPayload
  ): Promise<WebhookProcessResult> {
    const { action } = payload;

    // Eventos relevantes para sincronização
    const relevantEvents = [
      'createCard',
      'updateCard',
      'deleteCard',
      'moveCardToBoard',
      'moveCardFromBoard',
    ];

    if (!relevantEvents.includes(action.type)) {
      return { success: true, action: 'ignored' };
    }

    if (!action.data.card) {
      return { success: true, action: 'no-card-data' };
    }

    try {
      // Transforma dados do Trello para formato do projeto
      const trelloProject = this.transformWebhookToProject(payload);

      if (!trelloProject) {
        return { success: false, error: 'Falha na transformação dos dados' };
      }

      // Sincroniza com banco via DatabaseService
      const syncResult = await databaseService.syncFromTrelloWithMCP([
        trelloProject,
      ]);

      if (syncResult.errors.length > 0) {
        // Erros na sincronização - log silencioso
      }

      // Notifica subscriptions em tempo real se MCP estiver ativo
      await this.notifyRealtimeSubscriptions(trelloProject, action.type);

      return {
        success: true,
        projectId: trelloProject.trelloCardId,
        action: action.type,
        details: {
          syncSuccess: syncResult.success,
          syncErrors: syncResult.errors.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no processamento',
      };
    }
  }

  /**
   * Transforma dados do webhook em projeto Trello
   */
  private transformWebhookToProject(
    payload: WebhookPayload
  ): TrelloProject | null {
    const card = payload.action.data.card;

    if (!card) return null;

    try {
      // Mapeamento de status
      const statusMapping: Record<string, string> = {
        planning: 'a-fazer',
        backlog: 'a-fazer',
        'to do': 'a-fazer',
        fazer: 'a-fazer',
        development: 'em-andamento',
        doing: 'em-andamento',
        progress: 'em-andamento',
        andamento: 'em-andamento',
        desenvolvimento: 'em-andamento',
        done: 'concluido',
        completed: 'concluido',
        concluido: 'concluido',
        finalizado: 'concluido',
      };

      // Mapeamento de plataformas
      const platformMapping: Record<string, string> = {
        n8n: 'N8N',
        jira: 'Jira',
        hubspot: 'Hubspot',
        backoffice: 'Backoffice',
        'google workspace': 'Google Workspace',
        google: 'Google Workspace',
      };

      // Mapeamento de membros
      const memberMapping: Record<string, string> = {
        'guilherme souza': 'Guilherme Souza',
        guilherme: 'Guilherme Souza',
        'felipe braat': 'Felipe Braat',
        felipe: 'Felipe Braat',
        'tiago triani': 'Tiago Triani',
        tiago: 'Tiago Triani',
      };

      // Extrai plataformas dos labels
      const platforms = card.labels
        .map(label => {
          const labelName = label.name.toLowerCase();

          return platformMapping[labelName] || null;
        })
        .filter(Boolean);

      // Extrai responsáveis dos membros
      const responsible = card.members.map(member => {
        const memberName = member.fullName.toLowerCase();

        return memberMapping[memberName] || member.fullName;
      });

      // Calcula progresso baseado em checklists
      let progress = 0;

      if (card.checklists && card.checklists.length > 0) {
        const allItems = card.checklists.flatMap(
          checklist => checklist.checkItems
        );
        const completedItems = allItems.filter(
          item => item.state === 'complete'
        );

        progress =
          allItems.length > 0
            ? Math.round((completedItems.length / allItems.length) * 100)
            : 0;
      } else {
        // Progresso baseado no status se não há checklists
        const listName = card.list.name.toLowerCase();

        if (statusMapping[listName] === 'a-fazer') progress = 5;
        else if (statusMapping[listName] === 'em-andamento') progress = 45;
        else if (statusMapping[listName] === 'concluido') progress = 100;
      }

      // Determina prioridade baseada em labels
      let priority = 'medium';
      const hasRedLabel = card.labels.some(label => label.color === 'red');
      const hasYellowLabel = card.labels.some(
        label => label.color === 'yellow'
      );
      const hasGreenLabel = card.labels.some(label => label.color === 'green');

      if (hasRedLabel) priority = 'high';
      else if (hasGreenLabel) priority = 'low';
      else if (hasYellowLabel) priority = 'medium';

      const trelloProject: TrelloProject = {
        id: card.id,
        title: this.sanitizeString(card.name),
        description: this.sanitizeString(card.desc || ''),
        progress,
        platforms: platforms.length > 0 ? (platforms as any[]) : ['Backoffice'],
        responsible:
          responsible.length > 0 ? (responsible as any[]) : ['Guilherme Souza'],
        status: (statusMapping[card.list.name.toLowerCase()] ||
          'a-fazer') as any,
        priority: priority as any,
        trelloCardId: card.id,
        labels: card.labels.map(label => label.name).filter(Boolean),
        startDate: new Date().toISOString(),
        estimatedEndDate:
          card.due ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        imageUrl: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return trelloProject;
    } catch {
      return null;
    }
  }

  /**
   * Notifica subscriptions em tempo real
   */
  private async notifyRealtimeSubscriptions(
    project: TrelloProject,
    actionType: string
  ): Promise<void> {
    try {
      const mcpStatus = supabaseMCPService.getConnectionStatus();

      if (!mcpStatus.connected) {
        return;
      }

      // Configura subscription se não existir
      if (mcpStatus.subscriptions === 0) {
        await supabaseMCPService.setupRealtimeSubscription({
          table: 'projects',
          event: '*',
          callback: payload => {
            // Aqui seria disparado evento para UI
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('project-updated', {
                  detail: { payload, actionType },
                })
              );
            }
          },
        });
      }

      console.log(
        `📡 Notificação real-time enviada: ${project.title} (${actionType})`
      );
    } catch (error) {
      console.error('Erro ao notificar subscriptions:', error);
    }
  }

  /**
   * Processa fila de webhooks pendentes
   */
  private async processQueue(): Promise<void> {
    while (this.processingQueue.length > 0) {
      const payload = this.processingQueue.shift();

      if (payload) {
        await this.handleWebhookPayload(payload);
      }
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
   * Obtém estatísticas da fila de processamento
   */
  getQueueStats() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
    };
  }

  /**
   * Limpa fila de processamento
   */
  clearQueue(): void {
    this.processingQueue = [];
  }
}

// Instância singleton do handler de webhooks
export const webhookHandler = new WebhookHandler();
