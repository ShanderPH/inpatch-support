/**
 * HubSpot API V3 CRM Integration Service
 * Serviço completo para integração com a API de Tickets do HubSpot
 *
 * Funcionalidades:
 * - CRUD operations para tickets
 * - Busca avançada com filtros
 * - Integração com pipelines e stages
 * - Rate limiting e error handling
 * - Cache inteligente
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import { toast } from 'react-hot-toast';

// Interfaces e tipos para HubSpot Tickets
export interface HubSpotTicket {
  id: string;
  properties: {
    hs_object_id: string;
    hs_created_date?: string;
    hs_lastmodifieddate?: string;
    subject: string;
    content?: string;
    hs_pipeline: string;
    hs_pipeline_stage: string;
    hs_ticket_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    hs_ticket_category?: string;
    hubspot_owner_id?: string;
    source_type?: string;
    createdate?: string;
    closedate?: string;
    time_to_close?: string;
    hs_num_times_contacted?: string;
    hs_num_associated_contacts?: string;
    hs_num_associated_companies?: string;
    hs_custom_inbox?: string;
    tags?: string;
  };
  associations?: {
    contacts?: Array<{ id: string }>;
    companies?: Array<{ id: string }>;
    deals?: Array<{ id: string }>;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: HubSpotPipelineStage[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotPipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: {
    isClosed: boolean;
    probability?: number;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotOwner {
  id: string;
  userId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotSearchFilter {
  propertyName: string;
  operator:
    | 'EQ'
    | 'NEQ'
    | 'LT'
    | 'LTE'
    | 'GT'
    | 'GTE'
    | 'BETWEEN'
    | 'IN'
    | 'NOT_IN'
    | 'HAS_PROPERTY'
    | 'NOT_HAS_PROPERTY'
    | 'CONTAINS_TOKEN'
    | 'NOT_CONTAINS_TOKEN';
  value: string | number | boolean;
  values?: (string | number | boolean)[];
}

export interface HubSpotSearchRequest {
  filterGroups: Array<{
    filters: HubSpotSearchFilter[];
  }>;
  sorts?: Array<{
    propertyName: string;
    direction: 'ASCENDING' | 'DESCENDING';
  }>;
  properties?: string[];
  limit?: number;
  after?: string;
}

export interface HubSpotSearchResponse<T> {
  total: number;
  results: T[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
    prev?: {
      before: string;
      link: string;
    };
  };
}

export interface CreateTicketRequest {
  properties: {
    subject: string;
    content?: string;
    hs_pipeline: string;
    hs_pipeline_stage: string;
    hs_ticket_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    hs_ticket_category?: string;
    hubspot_owner_id?: string;
    source_type?: string;
    tags?: string;
  };
  associations?: Array<{
    to: { id: string };
    types: Array<{
      associationCategory: 'HUBSPOT_DEFINED' | 'USER_DEFINED';
      associationTypeId: number;
    }>;
  }>;
}

export interface UpdateTicketRequest {
  properties: Partial<CreateTicketRequest['properties']>;
}

// Rate Limiter específico para HubSpot API
class HubSpotRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 100; // 100 requests per 10 seconds
  private readonly timeWindow = 10000; // 10 seconds

  async checkLimit(): Promise<void> {
    const now = Date.now();

    // Remove requests older than time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);

      console.log(`⏳ HubSpot rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      return this.checkLimit();
    }

    this.requests.push(now);
  }
}

// Constantes de configuração do sistema
const SYSTEM_CONFIG = {
  // Pipeline específica para tickets do sistema
  TICKETS_PIPELINE_ID: '634240100',
  // Stage de tickets fechados que devem ser excluídos
  CLOSED_TICKETS_STAGE_ID: '1028692851',
  // Técnicos autorizados do sistema
  AUTHORIZED_OWNERS: ['1514631054', '360834054', '1727693927'],
  // Informações dos técnicos autorizados
  AUTHORIZED_OWNERS_INFO: {
    '1514631054': { name: 'Felipe Teixeira', role: 'Analista N2 Eventos' },
    '360834054': { name: 'Tiago Triani', role: 'Analista N2' },
    '1727693927': { name: 'Guilherme Souza', role: 'Analista N2' },
  },
} as const;

// Classe principal do serviço HubSpot
export class HubSpotApiService {
  private static instance: HubSpotApiService;
  private baseUrl = 'https://api.hubapi.com';
  private rateLimiter = new HubSpotRateLimiter();
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  // Configuração da API (server-side only)
  private config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN || ''}`,
    },
  };

  private constructor() {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      console.warn('⚠️ HubSpot Access Token not configured (server-side)');
    }
  }

  static getInstance(): HubSpotApiService {
    if (!HubSpotApiService.instance) {
      HubSpotApiService.instance = new HubSpotApiService();
    }

    return HubSpotApiService.instance;
  }

  // Método privado para fazer requests HTTP
  private async makeRequest<T>(
    endpoint: string,
    options: globalThis.RequestInit = {},
    useCache = true,
    cacheTTL = this.defaultTTL
  ): Promise<T> {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;

    // Check cache first
    if (useCache && options.method === 'GET') {
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log(`📦 Cache hit for ${endpoint}`);

        return cached.data;
      }
    }

    // Rate limiting
    await this.rateLimiter.checkLimit();

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`HubSpot API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Cache successful GET requests
      if (
        useCache &&
        options.method !== 'POST' &&
        options.method !== 'PUT' &&
        options.method !== 'PATCH' &&
        options.method !== 'DELETE'
      ) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL,
        });
      }

      return data;
    } catch (error) {
      console.error(`❌ HubSpot API request failed:`, error);

      if (typeof window !== 'undefined') {
        toast.error(
          `Erro na integração HubSpot: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        );
      }

      throw error;
    }
  }

  // Invalidar cache
  private invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // ============================================================================
  // TICKETS CRUD OPERATIONS
  // ============================================================================

  /**
   * Buscar todos os tickets com filtros e paginação
   */
  async getTickets(
    filters?: HubSpotSearchRequest,
    useCache = true
  ): Promise<HubSpotSearchResponse<HubSpotTicket>> {
    console.log('🎫 Fetching HubSpot tickets...');

    // Filtros obrigatórios do sistema
    const systemFilters: HubSpotSearchFilter[] = [
      // Apenas pipeline específica
      {
        propertyName: 'hs_pipeline',
        operator: 'EQ',
        value: SYSTEM_CONFIG.TICKETS_PIPELINE_ID,
      },
      // Excluir tickets fechados
      {
        propertyName: 'hs_pipeline_stage',
        operator: 'NEQ',
        value: SYSTEM_CONFIG.CLOSED_TICKETS_STAGE_ID,
      },
    ];

    // Combinar filtros do sistema com filtros customizados
    const allFilterGroups = [
      { filters: systemFilters },
      ...(filters?.filterGroups || []),
    ];

    const searchPayload: HubSpotSearchRequest = {
      filterGroups: allFilterGroups,
      sorts: filters?.sorts || [
        { propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' },
      ],
      properties: filters?.properties || [
        'hs_object_id',
        'subject',
        'content',
        'hs_pipeline',
        'hs_pipeline_stage',
        'hs_ticket_priority',
        'hs_ticket_category',
        'hubspot_owner_id',
        'source_type',
        'createdate',
        'hs_lastmodifieddate',
        'closedate',
        'tags',
      ],
      limit: filters?.limit || 100,
      after: filters?.after,
    };

    return this.makeRequest<HubSpotSearchResponse<HubSpotTicket>>(
      '/crm/v3/objects/tickets/search',
      {
        method: 'POST',
        body: JSON.stringify(searchPayload),
      },
      useCache
    );
  }

  /**
   * Buscar ticket por ID
   */
  async getTicketById(
    ticketId: string,
    properties?: string[]
  ): Promise<HubSpotTicket> {
    const props = properties || [
      'hs_object_id',
      'subject',
      'content',
      'hs_pipeline',
      'hs_pipeline_stage',
      'hs_ticket_priority',
      'hs_ticket_category',
      'hubspot_owner_id',
      'source_type',
      'createdate',
      'hs_lastmodifieddate',
      'closedate',
      'tags',
    ];

    const queryParams = new URLSearchParams({
      properties: props.join(','),
    });

    return this.makeRequest<HubSpotTicket>(
      `/crm/v3/objects/tickets/${ticketId}?${queryParams}`,
      { method: 'GET' }
    );
  }

  /**
   * Criar novo ticket
   */
  async createTicket(ticketData: CreateTicketRequest): Promise<HubSpotTicket> {
    console.log('🎫 Creating new HubSpot ticket...');

    const result = await this.makeRequest<HubSpotTicket>(
      '/crm/v3/objects/tickets',
      {
        method: 'POST',
        body: JSON.stringify(ticketData),
      },
      false
    );

    // Invalidate cache
    this.invalidateCache('tickets');

    if (typeof window !== 'undefined') {
      toast.success('Ticket criado com sucesso no HubSpot!');
    }

    return result;
  }

  /**
   * Atualizar ticket existente
   */
  async updateTicket(
    ticketId: string,
    updates: UpdateTicketRequest
  ): Promise<HubSpotTicket> {
    console.log(`🎫 Updating HubSpot ticket ${ticketId}...`);

    const result = await this.makeRequest<HubSpotTicket>(
      `/crm/v3/objects/tickets/${ticketId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      },
      false
    );

    // Invalidate cache
    this.invalidateCache('tickets');

    if (typeof window !== 'undefined') {
      toast.success('Ticket atualizado com sucesso!');
    }

    return result;
  }

  /**
   * Deletar ticket
   */
  async deleteTicket(ticketId: string): Promise<void> {
    console.log(`🎫 Deleting HubSpot ticket ${ticketId}...`);

    await this.makeRequest(
      `/crm/v3/objects/tickets/${ticketId}`,
      { method: 'DELETE' },
      false
    );

    // Invalidate cache
    this.invalidateCache('tickets');

    if (typeof window !== 'undefined') {
      toast.success('Ticket deletado com sucesso!');
    }
  }

  // ============================================================================
  // PIPELINES AND STAGES
  // ============================================================================

  /**
   * Buscar todas as pipelines de tickets
   */
  async getTicketPipelines(): Promise<{ results: HubSpotPipeline[] }> {
    console.log('🚰 Fetching ticket pipelines...');

    return this.makeRequest<{ results: HubSpotPipeline[] }>(
      '/crm/v3/pipelines/tickets',
      { method: 'GET' },
      true,
      30 * 60 * 1000 // 30 minutes cache for pipelines
    );
  }

  /**
   * Buscar apenas a pipeline específica do sistema
   */
  async getSystemPipeline(): Promise<HubSpotPipeline> {
    console.log('🚰 Fetching system pipeline...');

    return this.makeRequest<HubSpotPipeline>(
      `/crm/v3/pipelines/tickets/${SYSTEM_CONFIG.TICKETS_PIPELINE_ID}`,
      { method: 'GET' },
      true,
      60 * 60 * 1000 // 1 hour cache for system pipeline
    );
  }

  /**
   * Buscar pipeline por ID
   */
  async getPipelineById(pipelineId: string): Promise<HubSpotPipeline> {
    return this.makeRequest<HubSpotPipeline>(
      `/crm/v3/pipelines/tickets/${pipelineId}`,
      { method: 'GET' },
      true,
      30 * 60 * 1000 // 30 minutes cache
    );
  }

  // ============================================================================
  // OWNERS (USERS)
  // ============================================================================

  /**
   * Buscar todos os owners/usuários
   */
  async getOwners(): Promise<{ results: HubSpotOwner[] }> {
    console.log('👥 Fetching HubSpot owners...');

    return this.makeRequest<{ results: HubSpotOwner[] }>(
      '/crm/v3/owners',
      { method: 'GET' },
      true,
      60 * 60 * 1000 // 1 hour cache for owners
    );
  }

  /**
   * Buscar apenas os técnicos autorizados do sistema
   */
  async getAuthorizedOwners(): Promise<{
    results: (HubSpotOwner & { role?: string })[];
  }> {
    console.log('👥 Fetching authorized owners...');

    try {
      // Buscar todos os owners primeiro
      const allOwnersResponse = await this.getOwners();

      // Filtrar apenas os autorizados e adicionar informações extras
      const authorizedOwners = allOwnersResponse.results
        .filter(owner =>
          SYSTEM_CONFIG.AUTHORIZED_OWNERS.includes(owner.id as any)
        )
        .map(owner => ({
          ...owner,
          role: SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO[
            owner.id as keyof typeof SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO
          ]?.role,
        }));

      return { results: authorizedOwners };
    } catch (error) {
      console.warn(
        '⚠️ Erro ao buscar owners do HubSpot, usando dados locais:',
        error
      );

      // Fallback: Retornar dados locais dos técnicos autorizados
      const fallbackOwners = SYSTEM_CONFIG.AUTHORIZED_OWNERS.map(ownerId => ({
        id: ownerId,
        email: `${SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO[ownerId as keyof typeof SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO].name.toLowerCase().replace(' ', '.')}@inpatch.com`,
        firstName:
          SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO[
            ownerId as keyof typeof SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO
          ].name.split(' ')[0],
        lastName: SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO[
          ownerId as keyof typeof SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO
        ].name
          .split(' ')
          .slice(1)
          .join(' '),
        role: SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO[
          ownerId as keyof typeof SYSTEM_CONFIG.AUTHORIZED_OWNERS_INFO
        ].role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
      }));

      return { results: fallbackOwners };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Buscar tickets por owner
   */
  async getTicketsByOwner(
    ownerId: string
  ): Promise<HubSpotSearchResponse<HubSpotTicket>> {
    return this.getTickets({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hubspot_owner_id',
              operator: 'EQ',
              value: ownerId,
            },
          ],
        },
      ],
    });
  }

  /**
   * Buscar tickets por pipeline stage
   */
  async getTicketsByStage(
    stageId: string
  ): Promise<HubSpotSearchResponse<HubSpotTicket>> {
    return this.getTickets({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_pipeline_stage',
              operator: 'EQ',
              value: stageId,
            },
          ],
        },
      ],
    });
  }

  /**
   * Buscar tickets por prioridade
   */
  async getTicketsByPriority(
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  ): Promise<HubSpotSearchResponse<HubSpotTicket>> {
    return this.getTickets({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_ticket_priority',
              operator: 'EQ',
              value: priority,
            },
          ],
        },
      ],
    });
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.invalidateCache();
    console.log('🧹 HubSpot cache cleared');
  }

  /**
   * Health check da API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest(
        '/crm/v3/objects/tickets',
        {
          method: 'GET',
          headers: {
            ...this.config.headers,
          },
        },
        false
      );

      return true;
    } catch (error) {
      console.error('❌ HubSpot API health check failed:', error);

      return false;
    }
  }
}

// Export da instância singleton
export const hubspotApi = HubSpotApiService.getInstance();
