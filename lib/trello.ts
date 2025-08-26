import { Project, Platform, TeamMember } from '@/types/project';

// Trello API configuration
const TRELLO_API_KEY = process.env.NEXT_PUBLIC_TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.NEXT_PUBLIC_TRELLO_API_TOKEN;
const TRELLO_BOARD_ID = process.env.NEXT_PUBLIC_TRELLO_BOARD_ID || '6807e4880c33aea54daabd5c';

const TRELLO_BASE_URL = 'https://api.trello.com/1';

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
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
      throw new Error('Trello API credentials not configured. Please set NEXT_PUBLIC_TRELLO_API_KEY and NEXT_PUBLIC_TRELLO_API_TOKEN in your .env.local file.');
    }

    const url = new URL(`${TRELLO_BASE_URL}${endpoint}`);
    url.searchParams.append('key', TRELLO_API_KEY);
    url.searchParams.append('token', TRELLO_API_TOKEN);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getBoardLists(): Promise<TrelloList[]> {
    return this.makeRequest(`/boards/${TRELLO_BOARD_ID}/lists`);
  }

  async getBoardCards(): Promise<TrelloCard[]> {
    return this.makeRequest(
      `/boards/${TRELLO_BOARD_ID}/cards?` +
      'members=true&' +
      'member_fields=fullName,username&' +
      'labels=true&' +
      'list=true&' +
      'badges=true'
    );
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

  async createCard(listId: string, project: Omit<Project, 'id'>): Promise<TrelloCard> {
    const cardData = {
      name: project.title,
      desc: project.description,
      idList: listId,
      due: project.estimatedEndDate ? new Date(project.estimatedEndDate).toISOString() : null,
    };

    return this.makeRequest('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  }

  async updateCard(cardId: string, updates: Partial<Project>): Promise<TrelloCard> {
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

  // Convert Trello cards to Project format
  transformCardsToProjects(cards: TrelloCard[]): Project[] {
    return cards.map(card => ({
      id: card.id,
      title: card.name,
      description: card.desc || '',
      progress: this.calculateProgress(card),
      platforms: this.extractPlatforms(card) as Platform[],
      responsible: this.extractResponsible(card) as TeamMember,
      startDate: card.dateLastActivity,
      estimatedEndDate: card.due || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: this.mapListToStatus(card.list?.name),
      priority: this.extractPriority(card),
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
    if (listName.includes('planning') || listName.includes('backlog') || listName.includes('to do')) return 5;
    if (listName.includes('development') || listName.includes('doing') || listName.includes('progress') || listName.includes('in progress')) return 45;
    if (listName.includes('testing') || listName.includes('review') || listName.includes('qa')) return 75;
    if (listName.includes('done') || listName.includes('completed') || listName.includes('finished')) return 100;
    if (listName.includes('hold') || listName.includes('paused') || listName.includes('blocked')) return 25;
    
    // Default for unknown lists
    return 10;
  }

  private extractPlatforms(card: TrelloCard): string[] {
    const labels = card.labels || [];
    const platforms: string[] = [];
    
    labels.forEach(label => {
      const name = label.name?.toLowerCase() || '';
      if (name.includes('n8n')) platforms.push('N8N');
      if (name.includes('jira')) platforms.push('Jira');
      if (name.includes('hubspot')) platforms.push('Hubspot');
      if (name.includes('backoffice')) platforms.push('Backoffice');
      if (name.includes('google') || name.includes('workspace')) platforms.push('Google Workspace');
    });
    
    return platforms.length > 0 ? platforms : ['Backoffice'];
  }

  private extractResponsible(card: TrelloCard): string {
    const members = card.members || [];
    if (members.length > 0) {
      const member = members[0];
      const fullName = member.fullName || member.username || '';
      
      // Map Trello users to team members
      if (fullName.toLowerCase().includes('guilherme')) return 'Guilherme Souza';
      if (fullName.toLowerCase().includes('felipe')) return 'Felipe Braat';
      if (fullName.toLowerCase().includes('tiago')) return 'Tiago Triani';
    }
    
    return 'Guilherme Souza'; // Default
  }

  private mapListToStatus(listName?: string): Project['status'] {
    if (!listName) return 'planning';
    
    const name = listName.toLowerCase();
    if (name.includes('planning') || name.includes('backlog')) return 'planning';
    if (name.includes('development') || name.includes('doing') || name.includes('progress')) return 'development';
    if (name.includes('testing') || name.includes('review')) return 'testing';
    if (name.includes('done') || name.includes('completed')) return 'completed';
    if (name.includes('hold') || name.includes('paused')) return 'on-hold';
    
    return 'planning';
  }

  private extractPriority(card: TrelloCard): Project['priority'] {
    const labels = card.labels || [];
    
    for (const label of labels) {
      const name = label.name?.toLowerCase() || '';
      const color = label.color?.toLowerCase() || '';
      
      if (name.includes('high') || name.includes('urgent') || color === 'red') return 'high';
      if (name.includes('medium') || color === 'yellow') return 'medium';
      if (name.includes('low') || color === 'green') return 'low';
    }
    
    return 'medium'; // Default
  }
}

export const trelloApi = new TrelloAPI();
