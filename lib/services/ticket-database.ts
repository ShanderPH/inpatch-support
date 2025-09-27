/**
 * Ticket Database Service - Sincronização HubSpot ↔ Prisma
 * Integração completa entre HubSpot CRM e banco local PostgreSQL
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import type {
  Ticket,
  CreateTicketData,
  UpdateTicketData,
  TicketFilters,
} from '@/types/ticket';

import { PrismaClient } from '@prisma/client';

import { transformHubSpotToLocal } from '@/types/ticket';
import { hubspotApi } from '@/lib/services/hubspot-api';

// Instância do Prisma (singleton)
const prisma = new PrismaClient();

export class TicketDatabaseService {
  private static instance: TicketDatabaseService;

  static getInstance(): TicketDatabaseService {
    if (!TicketDatabaseService.instance) {
      TicketDatabaseService.instance = new TicketDatabaseService();
    }

    return TicketDatabaseService.instance;
  }

  /**
   * Sincronizar tickets do HubSpot para o banco local
   */
  async syncFromHubSpot(_filters?: TicketFilters): Promise<{
    synced: number;
    created: number;
    updated: number;
    errors: number;
  }> {
    console.log('🔄 Sincronizando tickets do HubSpot para banco local...');

    const stats = { synced: 0, created: 0, updated: 0, errors: 0 };

    try {
      // Buscar todos os tickets do HubSpot (usando os filtros padrão do sistema)
      const hubspotResponse = await hubspotApi.getTickets();

      console.log(
        `📥 ${hubspotResponse.results.length} tickets encontrados no HubSpot`
      );

      // Processar cada ticket
      for (const hubspotTicket of hubspotResponse.results) {
        try {
          const localTicket = transformHubSpotToLocal(hubspotTicket);

          // Verificar se o ticket já existe no banco local
          const existingTicket = await prisma.ticket.findUnique({
            where: { hubspotId: localTicket.hubspotId },
          });

          if (existingTicket) {
            // Atualizar ticket existente
            await prisma.ticket.update({
              where: { id: existingTicket.id },
              data: {
                subject: localTicket.subject,
                content: localTicket.content,
                priority: localTicket.priority,
                status: this.mapStatusToPrisma(localTicket.status),
                category: localTicket.category,
                pipelineId: localTicket.pipelineId,
                pipelineStageId: localTicket.pipelineStageId,
                hubspotOwnerId: localTicket.hubspotOwnerId,
                sourceType: localTicket.sourceType,
                tags: localTicket.tags || [],
                updatedAt: new Date(localTicket.updatedAt),
                closedAt: localTicket.closedAt
                  ? new Date(localTicket.closedAt)
                  : null,
                hubspotUpdatedAt: localTicket.hubspotUpdatedAt
                  ? new Date(localTicket.hubspotUpdatedAt)
                  : null,
              },
            });

            stats.updated++;
            console.log(`✅ Ticket atualizado: ${localTicket.subject}`);
          } else {
            // Criar novo ticket
            await prisma.ticket.create({
              data: {
                hubspotId: localTicket.hubspotId,
                subject: localTicket.subject,
                content: localTicket.content,
                priority: localTicket.priority,
                status: this.mapStatusToPrisma(localTicket.status),
                category: localTicket.category,
                pipelineId: localTicket.pipelineId,
                pipelineStageId: localTicket.pipelineStageId,
                hubspotOwnerId: localTicket.hubspotOwnerId,
                sourceType: localTicket.sourceType,
                tags: localTicket.tags || [],
                createdAt: new Date(localTicket.createdAt),
                updatedAt: new Date(localTicket.updatedAt),
                closedAt: localTicket.closedAt
                  ? new Date(localTicket.closedAt)
                  : null,
                hubspotCreatedAt: localTicket.hubspotCreatedAt
                  ? new Date(localTicket.hubspotCreatedAt)
                  : null,
                hubspotUpdatedAt: localTicket.hubspotUpdatedAt
                  ? new Date(localTicket.hubspotUpdatedAt)
                  : null,
              },
            });

            stats.created++;
            console.log(`✅ Ticket criado: ${localTicket.subject}`);
          }

          // Registrar histórico de sincronização
          await prisma.syncHistory.create({
            data: {
              ticketId: existingTicket?.id,
              action: 'SYNCED',
              source: 'hubspot',
              details: {
                hubspotId: localTicket.hubspotId,
                operation: existingTicket ? 'update' : 'create',
              },
              success: true,
            },
          });

          stats.synced++;
        } catch (error) {
          console.error(
            `❌ Erro ao processar ticket ${hubspotTicket.id}:`,
            error
          );

          // Registrar erro no histórico (sem ticketId, pois não foi criado)
          try {
            await prisma.syncHistory.create({
              data: {
                action: 'ERROR',
                source: 'hubspot',
                details: {
                  hubspotId: hubspotTicket.id,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Erro desconhecido',
                },
                success: false,
                errorMessage:
                  error instanceof Error ? error.message : 'Erro desconhecido',
              },
            });
          } catch (historyError) {
            console.warn('⚠️ Erro ao registrar histórico:', historyError);
          }

          stats.errors++;
        }
      }

      console.log(`🎯 Sincronização concluída:`, stats);

      return stats;
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      throw error;
    }
  }

  /**
   * Buscar tickets do banco local com filtros
   */
  async getLocalTickets(filters?: TicketFilters): Promise<Ticket[]> {
    const where: any = {};

    // Aplicar filtros
    if (filters?.status && typeof filters.status === 'string') {
      where.status = this.mapStatusToPrisma(filters.status);
    }

    if (filters?.priority && typeof filters.priority === 'string') {
      where.priority = filters.priority;
    }

    if (filters?.ownerId) {
      where.hubspotOwnerId = filters.ownerId;
    }

    if (filters?.pipelineStageId) {
      where.pipelineStageId = filters.pipelineStageId;
    }

    if (filters?.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.dateFrom) {
      where.createdAt = { gte: new Date(filters.dateFrom) };
    }

    if (filters?.dateTo) {
      if (where.createdAt) {
        where.createdAt.lte = new Date(filters.dateTo);
      } else {
        where.createdAt = { lte: new Date(filters.dateTo) };
      }
    }

    // Buscar tickets no banco
    const prismaTickets = await prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    // Transformar para formato da aplicação
    return prismaTickets.map(this.mapPrismaToLocal);
  }

  /**
   * Criar ticket local e sincronizar com HubSpot
   */
  async createTicket(ticketData: CreateTicketData): Promise<Ticket> {
    console.log('🎫 Criando ticket local e sincronizando com HubSpot...');

    try {
      // Criar no HubSpot primeiro
      const hubspotTicket = await hubspotApi.createTicket({
        properties: {
          subject: ticketData.subject,
          content: ticketData.content,
          hs_pipeline: ticketData.pipelineId,
          hs_pipeline_stage: ticketData.pipelineStageId,
          hs_ticket_priority: ticketData.priority,
          hs_ticket_category: ticketData.category,
          hubspot_owner_id: ticketData.hubspotOwnerId,
          source_type: ticketData.sourceType,
          tags: ticketData.tags?.join(', '),
        },
      });

      // Transformar dados do HubSpot
      const localTicket = transformHubSpotToLocal(hubspotTicket);

      // Salvar no banco local
      const prismaTicket = await prisma.ticket.create({
        data: {
          hubspotId: localTicket.hubspotId,
          subject: localTicket.subject,
          content: localTicket.content,
          priority: localTicket.priority,
          status: this.mapStatusToPrisma(localTicket.status),
          category: localTicket.category,
          pipelineId: localTicket.pipelineId,
          pipelineStageId: localTicket.pipelineStageId,
          hubspotOwnerId: localTicket.hubspotOwnerId,
          sourceType: localTicket.sourceType,
          tags: localTicket.tags || [],
          createdAt: new Date(localTicket.createdAt),
          updatedAt: new Date(localTicket.updatedAt),
          hubspotCreatedAt: localTicket.hubspotCreatedAt
            ? new Date(localTicket.hubspotCreatedAt)
            : null,
          hubspotUpdatedAt: localTicket.hubspotUpdatedAt
            ? new Date(localTicket.hubspotUpdatedAt)
            : null,
        },
      });

      // Registrar histórico
      await prisma.syncHistory.create({
        data: {
          ticketId: prismaTicket.id,
          action: 'CREATED',
          source: 'api',
          details: { hubspotId: localTicket.hubspotId },
          success: true,
        },
      });

      console.log('✅ Ticket criado e sincronizado com sucesso');

      return this.mapPrismaToLocal(prismaTicket);
    } catch (error) {
      console.error('❌ Erro ao criar ticket:', error);

      // Registrar erro
      await prisma.syncHistory.create({
        data: {
          action: 'ERROR',
          source: 'api',
          details: {
            operation: 'create',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          },
          success: false,
          errorMessage:
            error instanceof Error ? error.message : 'Erro desconhecido',
        },
      });

      throw error;
    }
  }

  /**
   * Atualizar ticket local e sincronizar com HubSpot
   */
  async updateTicket(
    ticketId: string,
    updates: UpdateTicketData
  ): Promise<Ticket> {
    console.log(`🔄 Atualizando ticket ${ticketId}...`);

    try {
      // Buscar ticket no banco local
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        throw new Error('Ticket não encontrado no banco local');
      }

      // Atualizar no HubSpot
      await hubspotApi.updateTicket(existingTicket.hubspotId, {
        properties: {
          subject: updates.subject,
          content: updates.content,
          hs_ticket_priority: updates.priority,
          hs_ticket_category: updates.category,
          hubspot_owner_id: updates.hubspotOwnerId,
          source_type: updates.sourceType,
          tags: updates.tags?.join(', '),
        },
      });

      // Atualizar no banco local
      const updatedPrismaTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          subject: updates.subject || existingTicket.subject,
          content:
            updates.content !== undefined
              ? updates.content
              : existingTicket.content,
          priority: updates.priority || existingTicket.priority,
          status: updates.status
            ? this.mapStatusToPrisma(updates.status)
            : existingTicket.status,
          category:
            updates.category !== undefined
              ? updates.category
              : existingTicket.category,
          pipelineId: updates.pipelineId || existingTicket.pipelineId,
          pipelineStageId:
            updates.pipelineStageId || existingTicket.pipelineStageId,
          hubspotOwnerId:
            updates.hubspotOwnerId !== undefined
              ? updates.hubspotOwnerId
              : existingTicket.hubspotOwnerId,
          sourceType:
            updates.sourceType !== undefined
              ? updates.sourceType
              : existingTicket.sourceType,
          tags: updates.tags !== undefined ? updates.tags : existingTicket.tags,
          closedAt: updates.closedAt
            ? new Date(updates.closedAt)
            : existingTicket.closedAt,
          updatedAt: new Date(),
        },
      });

      // Registrar histórico
      await prisma.syncHistory.create({
        data: {
          ticketId,
          action: 'UPDATED',
          source: 'api',
          details: { changes: Object.keys(updates) },
          success: true,
        },
      });

      console.log('✅ Ticket atualizado com sucesso');

      return this.mapPrismaToLocal(updatedPrismaTicket);
    } catch (error) {
      console.error(`❌ Erro ao atualizar ticket ${ticketId}:`, error);

      await prisma.syncHistory.create({
        data: {
          ticketId,
          action: 'ERROR',
          source: 'api',
          details: {
            operation: 'update',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          },
          success: false,
          errorMessage:
            error instanceof Error ? error.message : 'Erro desconhecido',
        },
      });

      throw error;
    }
  }

  /**
   * Deletar ticket local e no HubSpot
   */
  async deleteTicket(ticketId: string): Promise<void> {
    console.log(`🗑️ Deletando ticket ${ticketId}...`);

    try {
      // Buscar ticket no banco local
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        throw new Error('Ticket não encontrado no banco local');
      }

      // Deletar do HubSpot
      await hubspotApi.deleteTicket(existingTicket.hubspotId);

      // Deletar do banco local
      await prisma.ticket.delete({
        where: { id: ticketId },
      });

      // Registrar histórico
      await prisma.syncHistory.create({
        data: {
          action: 'DELETED',
          source: 'api',
          details: { hubspotId: existingTicket.hubspotId },
          success: true,
        },
      });

      console.log('✅ Ticket deletado com sucesso');
    } catch (error) {
      console.error(`❌ Erro ao deletar ticket ${ticketId}:`, error);

      await prisma.syncHistory.create({
        data: {
          ticketId,
          action: 'ERROR',
          source: 'api',
          details: {
            operation: 'delete',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          },
          success: false,
          errorMessage:
            error instanceof Error ? error.message : 'Erro desconhecido',
        },
      });

      throw error;
    }
  }

  // Métodos auxiliares de mapeamento
  private mapStatusToPrisma(status: string) {
    // Mapear para enum correto do Prisma
    switch (status?.toUpperCase()) {
      case 'NEW':
        return 'NEW';
      case 'OPEN':
        return 'OPEN';
      case 'WAITING':
        return 'WAITING';
      case 'CLOSED':
        return 'CLOSED';
      case 'RESOLVED':
        return 'RESOLVED';
      default:
        return 'OPEN'; // Default seguro
    }
  }

  private mapPrismaToLocal(prismaTicket: any): Ticket {
    return {
      id: prismaTicket.id,
      hubspotId: prismaTicket.hubspotId,
      subject: prismaTicket.subject,
      content: prismaTicket.content,
      priority: prismaTicket.priority,
      status: prismaTicket.status,
      category: prismaTicket.category,
      pipelineId: prismaTicket.pipelineId,
      pipelineStageId: prismaTicket.pipelineStageId,
      hubspotOwnerId: prismaTicket.hubspotOwnerId,
      sourceType: prismaTicket.sourceType,
      tags: prismaTicket.tags || [],
      createdAt: prismaTicket.createdAt.toISOString(),
      updatedAt: prismaTicket.updatedAt.toISOString(),
      closedAt: prismaTicket.closedAt?.toISOString(),
      hubspotCreatedAt: prismaTicket.hubspotCreatedAt?.toISOString(),
      hubspotUpdatedAt: prismaTicket.hubspotUpdatedAt?.toISOString(),
    };
  }
}

// Export da instância singleton
export const ticketDatabaseService = TicketDatabaseService.getInstance();
