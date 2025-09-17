import toast from 'react-hot-toast';

import { trelloApi } from '@/lib/trello';
import { projectsApi } from '@/lib/supabase';
import { Project } from '@/types/project';

export class TrelloSyncService {
  private static instance: TrelloSyncService;
  private syncInProgress = false;
  private isPollingActive = false;

  static getInstance(): TrelloSyncService {
    if (!TrelloSyncService.instance) {
      TrelloSyncService.instance = new TrelloSyncService();
    }

    return TrelloSyncService.instance;
  }

  async syncFromTrello(): Promise<Project[]> {
    if (this.syncInProgress) {
      toast.error('Sincronização já em andamento');
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      toast.loading('Sincronizando com Trello...', { id: 'trello-sync' });

      // Fetch cards from Trello
      const trelloCards = await trelloApi.getBoardCards();

      // Transform to Project format
      const projects = trelloApi.transformCardsToProjects(trelloCards);

      // Filter out cards without proper content (empty or template cards)
      const validProjects = projects.filter(
        project =>
          project.title &&
          project.title.trim() !== '' &&
          !project.title.toLowerCase().includes('template') &&
          !project.title.toLowerCase().includes('exemplo')
      );

      // Try to sync with Supabase (if available) or return projects directly
      let syncedProjects: Project[];

      try {
        syncedProjects = await projectsApi.syncFromTrello(trelloCards);
        toast.success(
          `${syncedProjects.length} projetos sincronizados com Supabase!`,
          { id: 'trello-sync' }
        );
      } catch {
        // If Supabase is not available, return Trello data directly
        // Supabase not available, using Trello data directly
        syncedProjects = validProjects;
        toast.success(
          `${validProjects.length} projetos carregados do Trello!`,
          { id: 'trello-sync' }
        );
      }

      return syncedProjects;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';

      toast.error(`Erro ao sincronizar: ${message}`, { id: 'trello-sync' });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async createProjectInTrello(project: Omit<Project, 'id'>): Promise<void> {
    try {
      toast.loading('Criando projeto no Trello...', { id: 'create-trello' });

      // Get board lists to find appropriate list
      const lists = await trelloApi.getBoardLists();
      const planningList = lists.find(
        list =>
          list.name.toLowerCase().includes('planning') ||
          list.name.toLowerCase().includes('backlog')
      );

      if (!planningList) {
        throw new Error('Lista de planejamento não encontrada no Trello');
      }

      // Create card in Trello
      await trelloApi.createCard(planningList.id, project);

      toast.success('Projeto criado no Trello!', { id: 'create-trello' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';

      toast.error(`Erro ao criar projeto: ${message}`, { id: 'create-trello' });
      throw error;
    }
  }

  async updateProjectInTrello(
    projectId: string,
    updates: Partial<Project>
  ): Promise<void> {
    try {
      toast.loading('Atualizando projeto no Trello...', {
        id: 'update-trello',
      });

      await trelloApi.updateCard(projectId, updates);

      toast.success('Projeto atualizado no Trello!', { id: 'update-trello' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';

      toast.error(`Erro ao atualizar projeto: ${message}`, {
        id: 'update-trello',
      });
      throw error;
    }
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  startRealTimeSync(onUpdate: (projects: Project[]) => void): void {
    if (this.isPollingActive) {
      // Real-time sync already active

      return;
    }

    // Starting real-time sync with Trello
    this.isPollingActive = true;

    trelloApi.startPolling(30000, projects => {
      // Real-time sync update received
      onUpdate(projects);
    });
  }

  stopRealTimeSync(): void {
    if (!this.isPollingActive) {
      return;
    }

    // Stopping real-time sync
    this.isPollingActive = false;
    trelloApi.stopPolling();
  }

  isRealTimeSyncActive(): boolean {
    return this.isPollingActive;
  }

  async setupWebhook(callbackURL: string): Promise<void> {
    try {
      // Check existing webhooks
      const webhooks = await trelloApi.getWebhooks();
      const existingWebhook = webhooks.find(w => w.callbackURL === callbackURL);

      if (existingWebhook) {
        // Webhook already exists
        return;
      }

      // Create new webhook
      await trelloApi.createWebhook(callbackURL);

      // Sync completed successfully
      toast.success('Webhook configurado com sucesso!');
    } catch (error) {
      // Log errors only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to setup webhook:', error);
      }
      toast.error('Erro ao configurar webhook');
      throw error;
    }
  }
}

export const trelloSyncService = TrelloSyncService.getInstance();
