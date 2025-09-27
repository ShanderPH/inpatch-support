/**
 * Tipos e interfaces para o sistema de Tickets
 * Integração com HubSpot CRM API v3
 *
 * @author inPatch Team
 * @version 1.0.0
 */

// Tipos básicos para tickets (compatível com Prisma enums)
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'NEW' | 'OPEN' | 'WAITING' | 'CLOSED' | 'RESOLVED';

// Interface principal do Ticket
export interface Ticket {
  id: string;
  hubspotId: string;
  subject: string;
  content?: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  pipelineId: string;
  pipelineStageId: string;
  hubspotOwnerId?: string;
  sourceType?: string;
  tags?: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  closedAt?: string;

  // HubSpot specific fields
  hubspotCreatedAt?: string;
  hubspotUpdatedAt?: string;
}

// Interface para criação de tickets
export interface CreateTicketData {
  subject: string;
  content?: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  pipelineId: string;
  pipelineStageId: string;
  hubspotOwnerId?: string;
  sourceType?: string;
  tags?: string[];
}

// Interface para atualização de tickets
export interface UpdateTicketData extends Partial<CreateTicketData> {
  closedAt?: string;
}

// Interface para HubSpot Pipeline
export interface Pipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// Interface para HubSpot Pipeline Stage
export interface PipelineStage {
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

// Interface para HubSpot Owner/User
export interface Owner {
  id: string;
  userId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// Interface para resposta de API com paginação
export interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  lastUpdated: string;
  hasMore?: boolean;
  nextCursor?: string;
}

// Interface para filtros de busca
export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  ownerId?: string | string[];
  pipelineStageId?: string | string[];
  category?: string;
  tags?: string[];
  search?: string; // Busca por subject ou content
  dateFrom?: string;
  dateTo?: string;
}

// Interface para agrupamento de tickets (Kanban)
export interface TicketsByStage {
  [stageId: string]: {
    stage: PipelineStage;
    tickets: Ticket[];
    count: number;
  };
}

export interface TicketsByOwner {
  [ownerId: string]: {
    owner: Owner;
    tickets: Ticket[];
    count: number;
  };
}

// Interface para estatísticas
export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byOwner: Record<string, number>;
  avgTimeToClose?: number; // em horas
  openTickets: number;
  closedTickets: number;
  overdueTickets: number;
}

// Labels para exibição na UI
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'Novo',
  OPEN: 'Aberto',
  WAITING: 'Aguardando',
  CLOSED: 'Fechado',
  RESOLVED: 'Resolvido',
};

// Cores para os status
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  NEW: 'text-blue-500',
  OPEN: 'text-orange-500',
  WAITING: 'text-yellow-500',
  CLOSED: 'text-gray-500',
  RESOLVED: 'text-green-500',
};

// Cores para as prioridades
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  LOW: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-red-500',
};

// Mapeamentos para HubSpot
export const HUBSPOT_PRIORITY_MAPPING: Record<TicketPriority, string> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const REVERSE_HUBSPOT_PRIORITY_MAPPING: Record<string, TicketPriority> =
  {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  };

// Tipos para transformação de dados
export type HubSpotTicketProperties = {
  hs_object_id: string;
  subject: string;
  content?: string;
  hs_pipeline: string;
  hs_pipeline_stage: string;
  hs_ticket_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  hs_ticket_category?: string;
  hubspot_owner_id?: string;
  source_type?: string;
  createdate?: string;
  hs_lastmodifieddate?: string;
  closedate?: string;
  tags?: string;
};

// Interface para dados do HubSpot
export interface HubSpotTicketData {
  id: string;
  properties: HubSpotTicketProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// Funções utilitárias para transformação
export const transformHubSpotToLocal = (
  hubspotTicket: HubSpotTicketData
): Ticket => {
  const properties = hubspotTicket.properties;

  return {
    id: '', // Será definido pelo Prisma
    hubspotId: properties.hs_object_id,
    subject: properties.subject || '',
    content: properties.content,
    priority:
      REVERSE_HUBSPOT_PRIORITY_MAPPING[properties.hs_ticket_priority] ||
      'MEDIUM',
    status: 'OPEN', // Será mapeado baseado no pipeline stage
    category: properties.hs_ticket_category,
    pipelineId: properties.hs_pipeline,
    pipelineStageId: properties.hs_pipeline_stage,
    hubspotOwnerId: properties.hubspot_owner_id,
    sourceType: properties.source_type,
    tags: properties.tags
      ? properties.tags.split(',').map(tag => tag.trim())
      : [],
    createdAt: properties.createdate || hubspotTicket.createdAt,
    updatedAt: properties.hs_lastmodifieddate || hubspotTicket.updatedAt,
    closedAt: properties.closedate,
    hubspotCreatedAt: hubspotTicket.createdAt,
    hubspotUpdatedAt: hubspotTicket.updatedAt,
  };
};

export const transformLocalToHubSpot = (
  ticket: Ticket | CreateTicketData
): HubSpotTicketProperties => {
  return {
    hs_object_id: 'hubspotId' in ticket ? ticket.hubspotId : '',
    subject: ticket.subject,
    content: ticket.content,
    hs_pipeline: ticket.pipelineId,
    hs_pipeline_stage: ticket.pipelineStageId,
    hs_ticket_priority: ticket.priority, // Já está em formato correto (UPPERCASE)
    hs_ticket_category: ticket.category,
    hubspot_owner_id: ticket.hubspotOwnerId,
    source_type: ticket.sourceType,
    tags: ticket.tags?.join(', '),
  };
};
