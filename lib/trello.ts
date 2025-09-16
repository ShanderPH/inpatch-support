import { Project, Platform, TeamMember, STATUS_MAPPING } from '@/types/project';
import {
  getAPIConfig,
  isTrelloConfigured,
  RATE_LIMITS,
} from '@/lib/config/api';
import { RateLimiter, APIError, sanitizeString } from '@/lib/utils/validation';

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dateLastActivity: string;
  list: {
    id: string;
    name: string;
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  members: Array<{
    id: string;
    fullName: string;
    username: string;
  }>;
  badges: {
    checkItems: number;
    checkItemsChecked: number;
  };
}

interface TrelloList {
  id: string;
  name: string;
  pos: number;
}

export class TrelloAPI {
  private lastSync: Date | null = null;
  private syncInterval: ReturnType<typeof setTimeout> | null = null;
  private rateLimiter = new RateLimiter();
  private config = getAPIConfig();

  private async makeRequest(
    endpoint: string,
    options: Record<string, any> = {}
  ): Promise<any> {
    if (!isTrelloConfigured()) {
      throw new APIError(
        'Trello API credentials not configured. Please set NEXT_PUBLIC_TRELLO_API_KEY and NEXT_PUBLIC_TRELLO_API_TOKEN in your .env.local file.',
        401,
        endpoint
      );
    }

    // Rate limiting
    const rateLimitKey = 'trello-api';

    if (
      !this.rateLimiter.isAllowed(
        rateLimitKey,
        RATE_LIMITS.trello.requestsPerSecond,
        1000
      )
    ) {
      throw new APIError(
        'Rate limit exceeded. Please try again later.',
        429,
        endpoint
      );
    }

    const url = new URL(`${this.config.trello.baseUrl}${endpoint}`);

    url.searchParams.append('key', this.config.trello.apiKey!);
    url.searchParams.append('token', this.config.trello.apiToken!);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'inPatch-Suporte/1.0',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new APIError(
          `Trello API error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        endpoint
      );
    }
  }

  async getBoardLists(): Promise<TrelloList[]> {
    return this.makeRequest(`/boards/${this.config.trello.boardId}/lists`);
  }

  async getBoardCards(since?: string): Promise<TrelloCard[]> {
    let endpoint =
      `/boards/${this.config.trello.boardId}/cards?` +
      'members=true&' +
      'member_fields=fullName,username&' +
      'labels=true&' +
      'list=true&' +
      'badges=true';

    if (since) {
      endpoint += `&since=${encodeURIComponent(since)}`;
    }

    return this.makeRequest(endpoint);
  }

  async getCard(cardId: string): Promise<TrelloCard> {
    return this.makeRequest(
      `/cards/${cardId}?` +
        'members=true&' +
        'member_fields=fullName,username&' +
        'labels=true&' +
        'list=true&' +
        'badges=true'
    );
  }

  async createCard(
    listId: string,
    project: Omit<Project, 'id'>
  ): Promise<TrelloCard> {
    const cardData = {
      name: project.title,
      desc: project.description,
      idList: listId,
      due: project.estimatedEndDate
        ? new Date(project.estimatedEndDate).toISOString()
        : null,
    };

    return this.makeRequest('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  }

  async updateCard(
    cardId: string,
    updates: Partial<Project>
  ): Promise<TrelloCard> {
    const cardData: any = {};

    if (updates.title) cardData.name = updates.title;
    if (updates.description) cardData.desc = updates.description;
    if (updates.estimatedEndDate) {
      cardData.due = new Date(updates.estimatedEndDate).toISOString();
    }

    return this.makeRequest(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(cardData),
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.makeRequest(`/cards/${cardId}`, {
      method: 'DELETE',
    });
  }

  async getBoardActions(since?: string): Promise<any[]> {
    let endpoint =
      `/boards/${this.config.trello.boardId}/actions?` +
      'filter=createCard,updateCard,deleteCard,moveCard&' +
      'limit=1000';

    if (since) {
      endpoint += `&since=${encodeURIComponent(since)}`;
    }

    return this.makeRequest(endpoint);
  }

  async getWebhooks(): Promise<any[]> {
    return this.makeRequest(`/tokens/${this.config.trello.apiToken}/webhooks`);
  }

  async createWebhook(callbackURL: string): Promise<any> {
    // Validate callback URL
    try {
      new URL(callbackURL);
    } catch {
      throw new APIError('Invalid callback URL', 400, '/webhooks');
    }

    return this.makeRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        description: 'inPatch Suporte Webhook',
        callbackURL: sanitizeString(callbackURL),
        idModel: this.config.trello.boardId,
        active: true,
      }),
    });
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  startPolling(
    intervalMs: number = 30000,
    onUpdate?: (projects: Project[]) => void
  ): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        const since = this.lastSync?.toISOString();
        const actions = await this.getBoardActions(since);

        if (actions.length > 0) {
          const cards = await this.getBoardCards();
          const projects = this.transformCardsToProjects(cards);

          this.lastSync = new Date();
          onUpdate?.(projects);
        }
      } catch {
        // Silently handle polling errors to avoid console spam
      }
    }, intervalMs);

    this.lastSync = new Date();
  }

  stopPolling(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Convert Trello cards to Project format with validation
  transformCardsToProjects(cards: TrelloCard[]): Project[] {
    return cards
      .filter(card => {
        // Filter out invalid cards
        if (!card.id || !card.name || card.name.trim() === '') return false;
        if (card.name.toLowerCase().includes('template')) return false;
        if (card.name.toLowerCase().includes('exemplo')) return false;

        return true;
      })
      .map(card => ({
        id: card.id,
        title: sanitizeString(card.name || ''),
        description: sanitizeString(card.desc || ''),
        progress: this.calculateProgress(card),
        platforms: this.extractPlatforms(card),
        responsible: this.extractResponsible(card),
        startDate: card.dateLastActivity || new Date().toISOString(),
        estimatedEndDate:
          card.due ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: this.mapListToStatus(card.list?.name),
        priority: this.extractPriority(card),
        trelloCardId: card.id,
        labels: (card.labels || [])
          .map(label => sanitizeString(label.name || ''))
          .filter(name => name && name.trim() !== '')
          .filter((name, index, array) => array.indexOf(name) === index), // Remove duplicates
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
  }

  private calculateProgress(card: TrelloCard): number {
    // Primary: Use checklist progress if available
    if (card.badges?.checkItems && card.badges.checkItems > 0) {
      const checkedItems = card.badges.checkItemsChecked || 0;

      return Math.round((checkedItems / card.badges.checkItems) * 100);
    }

    // Secondary: Use card position in list as progress indicator
    const listName = card.list?.name?.toLowerCase() || '';

    if (
      listName.includes('planning') ||
      listName.includes('backlog') ||
      listName.includes('to do') ||
      listName.includes('fazer')
    )
      return 5;
    if (
      listName.includes('development') ||
      listName.includes('doing') ||
      listName.includes('progress') ||
      listName.includes('andamento') ||
      listName.includes('desenvolvimento')
    )
      return 45;
    if (
      listName.includes('done') ||
      listName.includes('completed') ||
      listName.includes('concluido') ||
      listName.includes('finalizado')
    )
      return 100;

    // Default for unknown lists
    return 10;
  }

  private extractPlatforms(card: TrelloCard): Platform[] {
    const labels = card.labels || [];
    const platforms: Set<Platform> = new Set();

    labels.forEach(label => {
      const name = (label.name?.toLowerCase() || '').trim();

      if (!name) return;

      if (name.includes('n8n')) platforms.add('N8N');
      if (name.includes('jira')) platforms.add('Jira');
      if (name.includes('hubspot')) platforms.add('Hubspot');
      if (name.includes('backoffice') || name.includes('back-office'))
        platforms.add('Backoffice');
      if (name.includes('google') || name.includes('workspace'))
        platforms.add('Google Workspace');
    });

    return platforms.size > 0 ? Array.from(platforms) : ['Backoffice'];
  }

  private extractResponsible(card: TrelloCard): TeamMember[] {
    const members = card.members || [];
    const responsibleMembers: TeamMember[] = [];

    members.forEach(member => {
      const fullName = (member.fullName || member.username || '').toLowerCase();

      // Map Trello users to team members with more flexible matching
      if (fullName.includes('guilherme') || fullName.includes('gui')) {
        if (!responsibleMembers.includes('Guilherme Souza')) {
          responsibleMembers.push('Guilherme Souza');
        }
      }
      if (fullName.includes('felipe') || fullName.includes('braat')) {
        if (!responsibleMembers.includes('Felipe Braat')) {
          responsibleMembers.push('Felipe Braat');
        }
      }
      if (fullName.includes('tiago') || fullName.includes('triani')) {
        if (!responsibleMembers.includes('Tiago Triani')) {
          responsibleMembers.push('Tiago Triani');
        }
      }
    });

    return responsibleMembers.length > 0
      ? responsibleMembers
      : ['Guilherme Souza']; // Default
  }

  private mapListToStatus(listName?: string): Project['status'] {
    if (!listName) return 'a-fazer';

    const name = listName.toLowerCase();

    // Use the STATUS_MAPPING for consistency
    for (const [key, value] of Object.entries(STATUS_MAPPING)) {
      if (name.includes(key)) {
        return value;
      }
    }

    return 'a-fazer';
  }

  private extractPriority(card: TrelloCard): Project['priority'] {
    const labels = card.labels || [];

    for (const label of labels) {
      const name = label.name?.toLowerCase() || '';
      const color = label.color?.toLowerCase() || '';

      if (name.includes('high') || name.includes('urgent') || color === 'red')
        return 'high';
      if (name.includes('medium') || color === 'yellow') return 'medium';
      if (name.includes('low') || color === 'green') return 'low';
    }

    return 'medium'; // Default
  }
}

export const trelloApi = new TrelloAPI();
