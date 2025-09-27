/**
 * API Routes para Tickets - HubSpot Integration
 * CRUD operations para tickets integrados com HubSpot CRM API v3
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import type { TicketFilters } from '@/types/ticket';
import type {
  HubSpotSearchRequest,
  HubSpotSearchFilter,
} from '@/lib/services/hubspot-api';

import { NextRequest, NextResponse } from 'next/server';

import { hubspotApi } from '@/lib/services/hubspot-api';
import { transformHubSpotToLocal } from '@/types/ticket';
import { ticketDatabaseService } from '@/lib/services/ticket-database';
import {
  validateCreateTicket,
  sanitizeTicketInput,
} from '@/lib/validations/ticket-schemas';

// Constantes de configuração do sistema (manter sincronizado com hubspot-api.ts)
const SYSTEM_CONFIG = {
  TICKETS_PIPELINE_ID: '634240100',
  CLOSED_TICKETS_STAGE_ID: '1028692851',
  // Técnicos autorizados do sistema
  AUTHORIZED_OWNERS: ['1514631054', '360834054', '1727693927'],
  // Stages permitidos no sistema inPatch
  ALLOWED_STAGES: [
    '1110524173', // Triagem N2
    '1060950860', // P0|Crítico
    '1060950861', // P1|Alta
    '1060950862', // P2|Média
    '1060950863', // P3|Baixa
    '1060950864', // P4|Trivial
    '936942379', // Resolvido
    '1028692851', // Desconsiderado
  ],
} as const;

// GET /api/tickets - Buscar tickets com filtros
export async function GET(request: NextRequest) {
  try {
    // Verificar configurações obrigatórias
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuração incompleta',
          details:
            'HubSpot Access Token não configurado. Configure HUBSPOT_ACCESS_TOKEN no arquivo .env.local',
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse dos parâmetros de query
    const filters: TicketFilters = {
      status: searchParams.get('status') as any,
      priority: searchParams.get('priority') as any,
      ownerId: searchParams.get('ownerId') || undefined,
      pipelineStageId: searchParams.get('pipelineStageId') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const limit = parseInt(searchParams.get('limit') || '100');
    const after = searchParams.get('after') || undefined;

    console.log('🎫 GET /api/tickets - Filters:', filters);

    // Construir filtros para HubSpot
    const hubspotFilters: HubSpotSearchFilter[] = [];

    // FILTRO OBRIGATÓRIO: Apenas pipeline específica
    hubspotFilters.push({
      propertyName: 'hs_pipeline',
      operator: 'EQ',
      value: SYSTEM_CONFIG.TICKETS_PIPELINE_ID,
    });

    // FILTRO: Incluir apenas stages do sistema inPatch
    // (removido filtro de exclusão para permitir stages de "Resolvido" e "Desconsiderado")
    hubspotFilters.push({
      propertyName: 'hs_pipeline_stage',
      operator: 'IN',
      values: [...SYSTEM_CONFIG.ALLOWED_STAGES], // Cópia do array para evitar readonly
    });

    // FILTRO OBRIGATÓRIO: Apenas tickets com técnico atribuído
    hubspotFilters.push({
      propertyName: 'hubspot_owner_id',
      operator: 'HAS_PROPERTY',
      value: '',
    });

    // Filtro por owner
    if (filters.ownerId && typeof filters.ownerId === 'string') {
      hubspotFilters.push({
        propertyName: 'hubspot_owner_id',
        operator: 'EQ',
        value: filters.ownerId,
      });
    }

    // Filtro por pipeline stage (adicional, se especificado)
    if (
      filters.pipelineStageId &&
      typeof filters.pipelineStageId === 'string'
    ) {
      hubspotFilters.push({
        propertyName: 'hs_pipeline_stage',
        operator: 'EQ',
        value: filters.pipelineStageId,
      });
    }

    // Filtro por prioridade
    if (filters.priority && typeof filters.priority === 'string') {
      hubspotFilters.push({
        propertyName: 'hs_ticket_priority',
        operator: 'EQ',
        value: filters.priority, // Já está em formato UPPERCASE
      });
    }

    // Filtro por categoria
    if (filters.category) {
      hubspotFilters.push({
        propertyName: 'hs_ticket_category',
        operator: 'EQ',
        value: filters.category,
      });
    }

    // Filtro por data de criação
    if (filters.dateFrom) {
      hubspotFilters.push({
        propertyName: 'createdate',
        operator: 'GTE',
        value: new Date(filters.dateFrom).getTime(),
      });
    }

    if (filters.dateTo) {
      hubspotFilters.push({
        propertyName: 'createdate',
        operator: 'LTE',
        value: new Date(filters.dateTo).getTime(),
      });
    }

    // Filtro por busca textual (subject)
    if (filters.search) {
      hubspotFilters.push({
        propertyName: 'subject',
        operator: 'CONTAINS_TOKEN',
        value: filters.search,
      });
    }

    // Construir request para HubSpot
    const searchRequest: HubSpotSearchRequest = {
      filterGroups:
        hubspotFilters.length > 0 ? [{ filters: hubspotFilters }] : [],
      sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
      limit,
      after,
    };

    // Verificar se há cache local válido
    console.log('🔄 Buscando tickets com cache inteligente...');

    try {
      // Verificar se DATABASE_URL está configurado antes de tentar o cache local
      if (process.env.DATABASE_URL) {
        // Tentar buscar do banco local primeiro
        const localTickets =
          await ticketDatabaseService.getLocalTickets(filters);

        if (localTickets.length > 0) {
          console.log(
            `📦 ${localTickets.length} tickets encontrados no cache local`
          );

          // Filtrar tickets conforme critérios do sistema inPatch
          const filteredTickets = localTickets.filter(ticket => {
            // Deve ter técnico atribuído
            if (!ticket.hubspotOwnerId) return false;

            // Técnico deve estar autorizado
            if (
              !SYSTEM_CONFIG.AUTHORIZED_OWNERS.includes(
                ticket.hubspotOwnerId as any
              )
            )
              return false;

            // Deve estar em um dos stages permitidos
            if (
              !(SYSTEM_CONFIG.ALLOWED_STAGES as readonly string[]).includes(
                ticket.pipelineStageId
              )
            )
              return false;

            return true;
          });

          const response = {
            success: true,
            data: {
              tickets: filteredTickets,
              total: filteredTickets.length,
              hasMore: false,
              lastUpdated: new Date().toISOString(),
              source: 'local_cache',
            },
            message: `${filteredTickets.length} tickets encontrados (cache local)`,
          };

          return NextResponse.json(response);
        }
      } else {
        console.warn('⚠️ DATABASE_URL não configurado, pulando cache local');
      }
    } catch (localError) {
      console.warn(
        '⚠️ Erro ao buscar cache local, fallback para HubSpot:',
        localError
      );
    }

    // Fallback: Buscar do HubSpot e sincronizar
    const hubspotResponse = await hubspotApi.getTickets(searchRequest);

    console.log(
      `📥 ${hubspotResponse.results.length} tickets encontrados no HubSpot`
    );

    // Transformar e filtrar conforme critérios do sistema inPatch
    const allTickets = hubspotResponse.results.map(transformHubSpotToLocal);
    const authorizedTickets = allTickets.filter(ticket => {
      // Deve ter técnico atribuído
      if (!ticket.hubspotOwnerId) return false;

      // Técnico deve estar autorizado
      if (
        !SYSTEM_CONFIG.AUTHORIZED_OWNERS.includes(ticket.hubspotOwnerId as any)
      )
        return false;

      // Deve estar em um dos stages permitidos
      if (
        !(SYSTEM_CONFIG.ALLOWED_STAGES as readonly string[]).includes(
          ticket.pipelineStageId
        )
      )
        return false;

      return true;
    });

    // Tentar sincronizar com banco local em background (somente se DATABASE_URL estiver configurado)
    if (process.env.DATABASE_URL) {
      setImmediate(async () => {
        try {
          await ticketDatabaseService.syncFromHubSpot(filters);
          console.log('✅ Sincronização em background concluída');
        } catch (syncError) {
          console.warn('⚠️ Erro na sincronização em background:', syncError);
        }
      });
    }

    const response = {
      success: true,
      data: {
        tickets: authorizedTickets,
        total: authorizedTickets.length,
        hasMore: hubspotResponse.paging?.next?.after ? true : false,
        nextCursor: hubspotResponse.paging?.next?.after,
        lastUpdated: new Date().toISOString(),
        source: 'hubspot_with_sync',
      },
      message: `${authorizedTickets.length} tickets encontrados (HubSpot + sync)`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ GET /api/tickets error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar tickets',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Criar novo ticket
export async function POST(request: NextRequest) {
  try {
    // Verificar configurações obrigatórias
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuração incompleta',
          details:
            'HubSpot Access Token não configurado. Configure HUBSPOT_ACCESS_TOKEN no arquivo .env.local',
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    console.log('🎫 POST /api/tickets - Body:', body);

    // Sanitizar dados de entrada
    const sanitizedBody = sanitizeTicketInput(body);

    // Validar dados com schema robusto
    const validationResult = validateCreateTicket(sanitizedBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          details: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Usar dados já validados
    const ticketData = validationResult.data!;

    // Validar se o técnico é autorizado (se especificado)
    if (
      ticketData.hubspotOwnerId &&
      !SYSTEM_CONFIG.AUTHORIZED_OWNERS.includes(
        ticketData.hubspotOwnerId as any
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Técnico não autorizado',
          details: `O técnico ${ticketData.hubspotOwnerId} não está na lista de técnicos autorizados.`,
        },
        { status: 403 }
      );
    }

    console.log('🎫 Criando ticket com sincronização completa...');

    try {
      // Criar via ticketDatabaseService apenas se DATABASE_URL estiver configurado
      if (process.env.DATABASE_URL) {
        const ticket = await ticketDatabaseService.createTicket(ticketData);

        const response = {
          success: true,
          data: { ticket },
          message: 'Ticket criado com sucesso (sincronizado)',
        };

        return NextResponse.json(response, { status: 201 });
      } else {
        console.warn(
          '⚠️ DATABASE_URL não configurado, criando apenas no HubSpot'
        );
        throw new Error('Database não configurado, usando fallback HubSpot');
      }
    } catch (createError) {
      console.warn(
        '⚠️ Erro na criação via database service, fallback para HubSpot direto:',
        createError
      );

      // Fallback: Criar diretamente no HubSpot
      const hubspotProperties: any = {
        subject: ticketData.subject,
        hs_pipeline: ticketData.pipelineId,
        hs_pipeline_stage: ticketData.pipelineStageId,
        hs_ticket_priority: ticketData.priority,
      };

      // Adicionar campos opcionais apenas se existirem
      if (ticketData.content) {
        hubspotProperties.content = ticketData.content;
      }

      if (ticketData.category) {
        hubspotProperties.hs_ticket_category = ticketData.category;
      }

      if (ticketData.hubspotOwnerId) {
        hubspotProperties.hubspot_owner_id = ticketData.hubspotOwnerId;
      }

      if (ticketData.tags && ticketData.tags.length > 0) {
        hubspotProperties.tags = ticketData.tags.join(', ');
      }

      const hubspotTicket = await hubspotApi.createTicket({
        properties: hubspotProperties,
      });

      // Transformar dados do HubSpot para formato local
      const ticket = transformHubSpotToLocal(hubspotTicket);

      const response = {
        success: true,
        data: { ticket },
        message: 'Ticket criado com sucesso (HubSpot fallback)',
      };

      return NextResponse.json(response, { status: 201 });
    }
  } catch (error) {
    console.error('❌ POST /api/tickets error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao criar ticket',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
