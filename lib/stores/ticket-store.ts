/**
 * Ticket Store - Zustand State Management
 * Gerenciamento de estado para o sistema de tickets
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import type {
  Ticket,
  TicketFilters,
  CreateTicketData,
  UpdateTicketData,
  Pipeline,
  Owner,
  TicketStats,
  TicketsByStage,
  TicketsByOwner,
} from '@/types/ticket';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Interface do store
interface TicketStore {
  // Estado principal
  tickets: Ticket[];
  pipelines: Pipeline[];
  owners: Owner[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Filtros
  filters: TicketFilters;
  searchQuery: string;

  // Paginação
  hasMore: boolean;
  nextCursor?: string;

  // Actions - Estado
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  removeTicket: (ticketId: string) => void;
  setPipelines: (pipelines: Pipeline[]) => void;
  setOwners: (owners: Owner[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (timestamp: string) => void;

  // Actions - Filtros
  setFilters: (filters: Partial<TicketFilters>) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // Actions - API
  fetchTickets: (refresh?: boolean) => Promise<void>;
  fetchMoreTickets: () => Promise<void>;
  fetchPipelines: () => Promise<void>;
  fetchOwners: () => Promise<void>;
  createTicket: (ticketData: CreateTicketData) => Promise<Ticket>;
  updateTicketById: (
    ticketId: string,
    updates: UpdateTicketData
  ) => Promise<Ticket>;
  deleteTicketById: (ticketId: string) => Promise<void>;

  // Getters computados
  getFilteredTickets: () => Ticket[];
  getTicketsByStage: () => TicketsByStage;
  getTicketsByOwner: () => TicketsByOwner;
  getTicketStats: () => TicketStats;
  getTicketById: (id: string) => Ticket | undefined;
  getPipelineById: (id: string) => Pipeline | undefined;
  getOwnerById: (id: string) => Owner | undefined;

  // Utility actions
  refreshData: () => Promise<void>;
}

// Store implementation
export const useTicketStore = create<TicketStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Estado inicial
        tickets: [],
        pipelines: [],
        owners: [],
        loading: false,
        error: null,
        lastUpdated: null,

        // Filtros iniciais
        filters: {},
        searchQuery: '',

        // Paginação inicial
        hasMore: false,
        nextCursor: undefined,

        // Actions - Estado
        setTickets: tickets => set({ tickets, error: null }),

        addTicket: ticket =>
          set(state => ({
            tickets: [ticket, ...state.tickets],
          })),

        updateTicket: (ticketId, updates) =>
          set(state => ({
            tickets: state.tickets.map(ticket =>
              ticket.id === ticketId ? { ...ticket, ...updates } : ticket
            ),
          })),

        removeTicket: ticketId =>
          set(state => ({
            tickets: state.tickets.filter(ticket => ticket.id !== ticketId),
          })),

        setPipelines: pipelines => set({ pipelines }),
        setOwners: owners => set({ owners }),
        setLoading: loading => set({ loading }),
        setError: error => set({ error, loading: false }),
        setLastUpdated: timestamp => set({ lastUpdated: timestamp }),

        // Actions - Filtros
        setFilters: newFilters =>
          set(state => ({
            filters: { ...state.filters, ...newFilters },
          })),

        setSearchQuery: searchQuery => set({ searchQuery }),

        clearFilters: () =>
          set({
            filters: {},
            searchQuery: '',
          }),

        // Actions - API
        fetchTickets: async (refresh = false) => {
          const { filters, searchQuery } = get();

          console.log('🎫 Store: Fetching tickets...', {
            refresh,
            filters,
            searchQuery,
          });

          set({ loading: true, error: null });

          if (refresh) {
            set({ tickets: [], hasMore: false, nextCursor: undefined });
          }

          try {
            const params = new URLSearchParams();

            // Aplicar filtros
            if (filters.status)
              params.append('status', filters.status as string);
            if (filters.priority)
              params.append('priority', filters.priority as string);
            if (filters.ownerId)
              params.append('ownerId', filters.ownerId as string);
            if (filters.pipelineStageId)
              params.append(
                'pipelineStageId',
                filters.pipelineStageId as string
              );
            if (filters.category) params.append('category', filters.category);
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (searchQuery) params.append('search', searchQuery);

            const response = await fetch(`/api/tickets?${params}`);

            if (!response.ok) {
              throw new Error('Falha ao buscar tickets');
            }

            const data = await response.json();

            if (data.success) {
              set({
                tickets: data.data.tickets,
                hasMore: data.data.hasMore || false,
                nextCursor: data.data.nextCursor,
                lastUpdated: data.data.lastUpdated,
                loading: false,
                error: null,
              });

              console.log(
                `✅ Store: ${data.data.tickets.length} tickets carregados`
              );
            } else {
              throw new Error(data.error || 'Erro ao buscar tickets');
            }
          } catch (error) {
            console.error('❌ Store: Erro ao buscar tickets:', error);
            set({
              error:
                error instanceof Error ? error.message : 'Erro desconhecido',
              loading: false,
            });
          }
        },

        fetchMoreTickets: async () => {
          const { nextCursor, hasMore, loading, tickets } = get();

          if (!hasMore || loading || !nextCursor) return;

          set({ loading: true });

          try {
            const params = new URLSearchParams({ after: nextCursor });
            const response = await fetch(`/api/tickets?${params}`);

            if (!response.ok) {
              throw new Error('Falha ao buscar mais tickets');
            }

            const data = await response.json();

            if (data.success) {
              set({
                tickets: [...tickets, ...data.data.tickets],
                hasMore: data.data.hasMore || false,
                nextCursor: data.data.nextCursor,
                loading: false,
              });
            } else {
              throw new Error(data.error || 'Erro ao buscar mais tickets');
            }
          } catch (error) {
            console.error('❌ Store: Erro ao buscar mais tickets:', error);
            set({
              error:
                error instanceof Error ? error.message : 'Erro desconhecido',
              loading: false,
            });
          }
        },

        fetchPipelines: async () => {
          console.log('🚰 Store: Fetching pipelines...');

          try {
            const response = await fetch('/api/hubspot/pipelines');

            if (!response.ok) {
              throw new Error('Falha ao buscar pipelines');
            }

            const data = await response.json();

            if (data.success) {
              set({ pipelines: data.data });
              console.log(`✅ Store: ${data.data.length} pipelines carregadas`);
            } else {
              throw new Error(data.error || 'Erro ao buscar pipelines');
            }
          } catch (error) {
            console.error('❌ Store: Erro ao buscar pipelines:', error);
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Erro ao buscar pipelines',
            });
          }
        },

        fetchOwners: async () => {
          console.log('👥 Store: Fetching owners...');

          try {
            const response = await fetch('/api/hubspot/owners');

            if (!response.ok) {
              throw new Error('Falha ao buscar técnicos');
            }

            const data = await response.json();

            if (data.success) {
              set({ owners: data.data });
              console.log(`✅ Store: ${data.data.length} técnicos carregados`);
            } else {
              throw new Error(data.error || 'Erro ao buscar técnicos');
            }
          } catch (error) {
            console.error('❌ Store: Erro ao buscar técnicos:', error);
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Erro ao buscar técnicos',
            });
          }
        },

        createTicket: async ticketData => {
          console.log('🎫 Store: Creating ticket...', ticketData);

          set({ loading: true });

          try {
            const response = await fetch('/api/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ticketData),
            });

            if (!response.ok) {
              throw new Error('Falha ao criar ticket');
            }

            const data = await response.json();

            if (data.success) {
              const newTicket = data.data;

              get().addTicket(newTicket);
              set({ loading: false });
              console.log('✅ Store: Ticket criado com sucesso');

              return newTicket;
            } else {
              throw new Error(data.error || 'Erro ao criar ticket');
            }
          } catch (error) {
            console.error('❌ Store: Erro ao criar ticket:', error);
            set({
              error:
                error instanceof Error ? error.message : 'Erro ao criar ticket',
              loading: false,
            });
            throw error;
          }
        },

        updateTicketById: async (ticketId, updates) => {
          console.log(`🎫 Store: Updating ticket ${ticketId}...`, updates);

          set({ loading: true });

          try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });

            if (!response.ok) {
              throw new Error('Falha ao atualizar ticket');
            }

            const data = await response.json();

            if (data.success) {
              const updatedTicket = data.data;

              get().updateTicket(ticketId, updatedTicket);
              set({ loading: false });
              console.log('✅ Store: Ticket atualizado com sucesso');

              return updatedTicket;
            } else {
              throw new Error(data.error || 'Erro ao atualizar ticket');
            }
          } catch (error) {
            console.error('❌ Store: Erro ao atualizar ticket:', error);
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Erro ao atualizar ticket',
              loading: false,
            });
            throw error;
          }
        },

        deleteTicketById: async ticketId => {
          console.log(`🎫 Store: Deleting ticket ${ticketId}...`);

          set({ loading: true });

          try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error('Falha ao deletar ticket');
            }

            const data = await response.json();

            if (data.success) {
              get().removeTicket(ticketId);
              set({ loading: false });
              console.log('✅ Store: Ticket deletado com sucesso');
            } else {
              throw new Error(data.error || 'Erro ao deletar ticket');
            }
          } catch (error) {
            console.error('❌ Store: Erro ao deletar ticket:', error);
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Erro ao deletar ticket',
              loading: false,
            });
            throw error;
          }
        },

        // Getters computados
        getFilteredTickets: () => {
          const { tickets, filters, searchQuery } = get();

          return tickets.filter(ticket => {
            // Filtro por busca textual
            if (searchQuery) {
              const searchLower = searchQuery.toLowerCase();
              const matchesSearch =
                ticket.subject.toLowerCase().includes(searchLower) ||
                ticket.content?.toLowerCase().includes(searchLower) ||
                ticket.category?.toLowerCase().includes(searchLower);

              if (!matchesSearch) return false;
            }

            // Filtros específicos
            if (filters.status && ticket.status !== filters.status)
              return false;
            if (filters.priority && ticket.priority !== filters.priority)
              return false;
            if (filters.ownerId && ticket.hubspotOwnerId !== filters.ownerId)
              return false;
            if (
              filters.pipelineStageId &&
              ticket.pipelineStageId !== filters.pipelineStageId
            )
              return false;
            if (filters.category && ticket.category !== filters.category)
              return false;

            return true;
          });
        },

        getTicketsByStage: () => {
          const { getFilteredTickets, pipelines } = get();
          const tickets = getFilteredTickets();
          const ticketsByStage: TicketsByStage = {};

          // Agrupar por pipeline stage
          tickets.forEach(ticket => {
            const stageId = ticket.pipelineStageId;

            if (!ticketsByStage[stageId]) {
              // Encontrar informações do stage
              let stage = null;

              for (const pipeline of pipelines) {
                const foundStage = pipeline.stages.find(s => s.id === stageId);

                if (foundStage) {
                  stage = foundStage;
                  break;
                }
              }

              ticketsByStage[stageId] = {
                stage: stage || {
                  id: stageId,
                  label: `Stage ${stageId}`,
                  displayOrder: 0,
                  metadata: { isClosed: false },
                  createdAt: '',
                  updatedAt: '',
                  archived: false,
                },
                tickets: [],
                count: 0,
              };
            }

            ticketsByStage[stageId].tickets.push(ticket);
            ticketsByStage[stageId].count += 1;
          });

          return ticketsByStage;
        },

        getTicketsByOwner: () => {
          const { getFilteredTickets, owners } = get();
          const tickets = getFilteredTickets();
          const ticketsByOwner: TicketsByOwner = {};

          tickets.forEach(ticket => {
            const ownerId = ticket.hubspotOwnerId || 'unassigned';

            if (!ticketsByOwner[ownerId]) {
              const owner = owners.find(o => o.id === ownerId) || {
                id: ownerId,
                email: 'unassigned@example.com',
                fullName:
                  ownerId === 'unassigned'
                    ? 'Não Atribuído'
                    : `User ${ownerId}`,
                createdAt: '',
                updatedAt: '',
                archived: false,
              };

              ticketsByOwner[ownerId] = {
                owner,
                tickets: [],
                count: 0,
              };
            }

            ticketsByOwner[ownerId].tickets.push(ticket);
            ticketsByOwner[ownerId].count += 1;
          });

          return ticketsByOwner;
        },

        getTicketStats: () => {
          const { getFilteredTickets } = get();
          const tickets = getFilteredTickets();

          const stats: TicketStats = {
            total: tickets.length,
            byStatus: {
              NEW: 0,
              OPEN: 0,
              WAITING: 0,
              CLOSED: 0,
              RESOLVED: 0,
            },
            byPriority: {
              LOW: 0,
              MEDIUM: 0,
              HIGH: 0,
              URGENT: 0,
            },
            byOwner: {},
            openTickets: 0,
            closedTickets: 0,
            overdueTickets: 0,
          };

          tickets.forEach(ticket => {
            // Por status
            stats.byStatus[ticket.status] += 1;

            // Por prioridade
            stats.byPriority[ticket.priority] += 1;

            // Por owner
            const ownerId = ticket.hubspotOwnerId || 'unassigned';

            stats.byOwner[ownerId] = (stats.byOwner[ownerId] || 0) + 1;

            // Contadores especiais
            if (['NEW', 'OPEN', 'WAITING'].includes(ticket.status)) {
              stats.openTickets += 1;
            } else {
              stats.closedTickets += 1;
            }
          });

          return stats;
        },

        getTicketById: id => {
          const { tickets } = get();

          return tickets.find(
            ticket => ticket.id === id || ticket.hubspotId === id
          );
        },

        getPipelineById: id => {
          const { pipelines } = get();

          return pipelines.find(pipeline => pipeline.id === id);
        },

        getOwnerById: id => {
          const { owners } = get();

          return owners.find(owner => owner.id === id);
        },

        // Utility actions
        refreshData: async () => {
          const { fetchTickets, fetchPipelines, fetchOwners } = get();

          console.log('🔄 Store: Refreshing all data...');

          await Promise.all([
            fetchTickets(true),
            fetchPipelines(),
            fetchOwners(),
          ]);

          console.log('✅ Store: All data refreshed');
        },
      }),
      {
        name: 'ticket-store',
        partialize: state => ({
          tickets: state.tickets,
          pipelines: state.pipelines,
          owners: state.owners,
          lastUpdated: state.lastUpdated,
        }),
      }
    ),
    { name: 'ticket-store' }
  )
);
