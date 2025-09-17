import { Project, Platform, TeamMember } from '@/types/project';
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
  // Additional fields that might be present in the real API response
  idList?: string;
  idBoard?: string;
  closed?: boolean;
  pos?: number;
  shortLink?: string;
  shortUrl?: string;
  url?: string;
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
  private listsCache: Map<string, string> = new Map(); // idList -> listName cache

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
    const lists = await this.makeRequest(
      `/boards/${this.config.trello.boardId}/lists`
    );

    // Update cache
    lists.forEach((list: any) => {
      this.listsCache.set(list.id, list.name);
    });

    return lists;
  }

  async getBoardCards(since?: string): Promise<TrelloCard[]> {
    let endpoint =
      `/boards/${this.config.trello.boardId}/cards?` +
      'members=true&' +
      'member_fields=fullName,username&' +
      'labels=true&' +
      'list=true&' +
      'badges=true&' +
      'lists=open';

    if (since) {
      endpoint += `&since=${encodeURIComponent(since)}`;
    }

    const cards = await this.makeRequest(endpoint);

    // If cards don't have list information, fetch lists separately and merge
    if (cards.length > 0 && !cards[0].list && cards[0].idList) {
      console.log(
        '⚠️ Cards missing list information, fetching lists separately...'
      );
      const lists = await this.getBoardLists();
      const listMap = new Map(lists.map(list => [list.id, list]));

      // Enhance cards with list information based on idList
      cards.forEach((card: any) => {
        if (card.idList && listMap.has(card.idList)) {
          card.list = listMap.get(card.idList);
        }
        // Ensure labels and members are always arrays, and badges is always an object
        if (!card.labels) {
          card.labels = [];
        }
        if (!card.members) {
          card.members = [];
        }
        if (!card.badges) {
          card.badges = { checkItems: 0, checkItemsChecked: 0 };
        }
      });
    } else {
      // Ensure labels and members are always arrays, and badges is always an object even when list info is present
      cards.forEach((card: any) => {
        if (!card.labels) {
          card.labels = [];
        }
        if (!card.members) {
          card.members = [];
        }
        if (!card.badges) {
          card.badges = { checkItems: 0, checkItemsChecked: 0 };
        }
      });
    }

    return cards;
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

    const newCard = await this.makeRequest('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });

    // Ensure list, labels, members and badges are included in the response
    if (
      !newCard.list ||
      !newCard.labels ||
      !newCard.members ||
      !newCard.badges
    ) {
      const fullCard = await this.makeRequest(
        `/cards/${newCard.id}?list=true&labels=all&members=true&badges=true`
      );

      if (!newCard.list) newCard.list = fullCard.list;
      if (!newCard.labels) newCard.labels = fullCard.labels || [];
      if (!newCard.members) newCard.members = fullCard.members || [];
      if (!newCard.badges)
        newCard.badges = fullCard.badges || {
          checkItems: 0,
          checkItemsChecked: 0,
        };
    }

    return newCard;
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

    const updatedCard = await this.makeRequest(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(cardData),
    });

    // Ensure list, labels, members and badges are included in the response
    if (
      !updatedCard.list ||
      !updatedCard.labels ||
      !updatedCard.members ||
      !updatedCard.badges
    ) {
      const fullCard = await this.makeRequest(
        `/cards/${cardId}?list=true&labels=all&members=true&badges=true`
      );

      if (!updatedCard.list) updatedCard.list = fullCard.list;
      if (!updatedCard.labels) updatedCard.labels = fullCard.labels || [];
      if (!updatedCard.members) updatedCard.members = fullCard.members || [];
      if (!updatedCard.badges)
        updatedCard.badges = fullCard.badges || {
          checkItems: 0,
          checkItemsChecked: 0,
        };
    }

    return updatedCard;
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

  /**
   * Get list name from ID using cache
   */
  private getListNameFromId(idList?: string): string | null {
    if (!idList) return null;

    return this.listsCache.get(idList) || null;
  }

  // Convert Trello cards to Project format with validation
  transformCardsToProjects(cards: TrelloCard[]): Project[] {
    console.log('🔄 Starting transformation of', cards.length, 'cards');

    const transformedProjects = cards
      .filter(card => {
        // Enhanced validation with detailed logging
        console.log('🔍 Checking card:', {
          id: card.id,
          name: card.name,
          hasName: !!(card.name && card.name.trim()),
          listName: card.list?.name,
          hasListName: !!card.list?.name,
          closed: card.closed,
        });

        // Filter out invalid cards with more permissive rules
        if (!card.id) {
          console.log('❌ Filtering out card with missing id');

          return false;
        }

        if (!card.name || card.name.trim() === '') {
          console.log(
            '❌ Filtering out card with missing/empty name:',
            card.id
          );

          return false;
        }

        // Only filter out closed cards if the field exists and is true
        if (card.closed === true) {
          console.log('❌ Filtering out closed card:', card.name);

          return false;
        }

        // More lenient template/example filtering
        const cardNameLower = card.name.toLowerCase();

        if (
          cardNameLower.includes('template') ||
          cardNameLower.includes('exemplo')
        ) {
          console.log('❌ Filtering out template/example card:', card.name);

          return false;
        }

        console.log('✅ Card passed filters:', card.name);

        return true;
      })
      .map(card => {
        // Handle potential missing list data more gracefully
        const listName =
          card.list?.name || this.getListNameFromId(card.idList) || 'A Fazer'; // Default list

        console.log(
          '🔄 Transforming card:',
          card.name,
          'List:',
          listName,
          'idList:',
          card.idList
        );

        const status = this.mapListToStatus(listName);
        const platforms = this.extractPlatforms(card);
        const responsible = this.extractResponsible(card);
        const priority = this.extractPriority(card);
        const progress = this.calculateProgress(card);

        const project = {
          id: card.id,
          title: sanitizeString(card.name || ''),
          description: sanitizeString(card.desc || ''),
          progress,
          platforms,
          responsible,
          startDate: card.dateLastActivity || new Date().toISOString(),
          estimatedEndDate:
            card.due ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status,
          priority,
          trelloCardId: card.id,
          labels: (card.labels || [])
            .map(label => sanitizeString(label?.name || ''))
            .filter(name => name && name.trim() !== '')
            .filter((name, index, array) => array.indexOf(name) === index), // Remove duplicates
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log('✅ Transformed project:', {
          id: project.id,
          title: project.title,
          status: project.status,
          platforms: project.platforms,
          responsible: project.responsible,
          listName,
          progress,
          priority,
        });

        return project;
      });

    console.log(
      '✅ Transformation complete:',
      transformedProjects.length,
      'projects created'
    );

    return transformedProjects;
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

    console.log(
      '🏷️ Extracting platforms from',
      labels.length,
      'labels:',
      labels.map(l => l?.name || 'unnamed')
    );

    labels.forEach(label => {
      if (!label) return;

      const name = (label.name || '').toLowerCase().trim();

      console.log('🔍 Checking label:', name);

      if (!name) return;

      if (name.includes('n8n')) {
        platforms.add('N8N');
        console.log('✅ Added N8N platform');
      }
      if (name.includes('jira')) {
        platforms.add('Jira');
        console.log('✅ Added Jira platform');
      }
      if (name.includes('hubspot')) {
        platforms.add('Hubspot');
        console.log('✅ Added Hubspot platform');
      }
      if (name.includes('backoffice') || name.includes('back-office')) {
        platforms.add('Backoffice');
        console.log('✅ Added Backoffice platform');
      }
      if (name.includes('google') || name.includes('workspace')) {
        platforms.add('Google Workspace');
        console.log('✅ Added Google Workspace platform');
      }
    });

    const result: Platform[] =
      platforms.size > 0 ? Array.from(platforms) : ['Backoffice'];

    console.log('🏷️ Final platforms:', result);

    return result;
  }

  private extractResponsible(card: TrelloCard): TeamMember[] {
    const members = card.members || [];
    const responsibleMembers: TeamMember[] = [];

    console.log(
      '👥 Extracting responsible from',
      members.length,
      'members:',
      members.map(m => m?.fullName || m?.username || 'unnamed')
    );

    members.forEach(member => {
      if (!member) return;

      const fullName = (member.fullName || member.username || '').toLowerCase();

      console.log('🔍 Checking member:', fullName);

      // Map Trello users to team members with more flexible matching
      if (fullName.includes('guilherme') || fullName.includes('gui')) {
        if (!responsibleMembers.includes('Guilherme Souza')) {
          responsibleMembers.push('Guilherme Souza');
          console.log('✅ Added Guilherme Souza');
        }
      }
      if (fullName.includes('felipe') || fullName.includes('braat')) {
        if (!responsibleMembers.includes('Felipe Braat')) {
          responsibleMembers.push('Felipe Braat');
          console.log('✅ Added Felipe Braat');
        }
      }
      if (fullName.includes('tiago') || fullName.includes('triani')) {
        if (!responsibleMembers.includes('Tiago Triani')) {
          responsibleMembers.push('Tiago Triani');
          console.log('✅ Added Tiago Triani');
        }
      }
    });

    const result: TeamMember[] =
      responsibleMembers.length > 0 ? responsibleMembers : ['Guilherme Souza'];

    console.log('👥 Final responsible:', result);

    return result;
  }

  private mapListToStatus(listName?: string): Project['status'] {
    if (!listName) {
      console.log('⚠️ No list name provided, defaulting to a-fazer');

      return 'a-fazer';
    }

    const name = listName.toLowerCase().trim();

    console.log('🔄 Mapping list name to status:', name);

    // Enhanced mapping with more Portuguese variations
    const statusMappings: Record<string, Project['status']> = {
      // A fazer variations
      planning: 'a-fazer',
      backlog: 'a-fazer',
      'to-do': 'a-fazer',
      todo: 'a-fazer',
      fazer: 'a-fazer',
      'a fazer': 'a-fazer',
      pendente: 'a-fazer',
      novo: 'a-fazer',

      // Em andamento variations
      development: 'em-andamento',
      doing: 'em-andamento',
      progress: 'em-andamento',
      andamento: 'em-andamento',
      'em andamento': 'em-andamento',
      desenvolvimento: 'em-andamento',
      trabalhando: 'em-andamento',
      ativo: 'em-andamento',

      // Concluído variations
      done: 'concluido',
      completed: 'concluido',
      concluido: 'concluido',
      concluído: 'concluido',
      finalizado: 'concluido',
      pronto: 'concluido',
      finished: 'concluido',
    };

    // Direct match first
    if (statusMappings[name]) {
      console.log('✅ Direct match found:', name, '->', statusMappings[name]);

      return statusMappings[name];
    }

    // Partial match
    for (const [key, value] of Object.entries(statusMappings)) {
      if (name.includes(key)) {
        console.log(
          '✅ Partial match found:',
          name,
          'contains',
          key,
          '->',
          value
        );

        return value;
      }
    }

    console.log(
      '⚠️ No mapping found for list:',
      name,
      ', defaulting to a-fazer'
    );

    return 'a-fazer';
  }

  private extractPriority(card: TrelloCard): Project['priority'] {
    const labels = card.labels || [];

    for (const label of labels) {
      if (!label) continue;

      const name = (label.name || '').toLowerCase();
      const color = (label.color || '').toLowerCase();

      if (name.includes('high') || name.includes('urgent') || color === 'red')
        return 'high';
      if (name.includes('medium') || color === 'yellow') return 'medium';
      if (name.includes('low') || color === 'green') return 'low';
    }

    return 'medium'; // Default
  }
}

export const trelloApi = new TrelloAPI();
