/**
 * Ticket Kanban Board - Componente Principal
 * Board Kanban moderno com drag & drop, animações suaves e responsividade
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody } from '@heroui/card';
import { Spinner } from '@heroui/spinner';
import { FiColumns, FiUser, FiCalendar } from 'react-icons/fi';

import { EmptyState } from './empty-state';
import { TicketCard } from './ticket-card';
import { TicketKanbanColumn } from './ticket-kanban-column';

import { useTicketStore } from '@/lib/stores/ticket-store';

// Tipos para visualização
type ViewMode = 'stage' | 'owner' | 'priority';

// Animações
const boardVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const columnVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Configurações dos técnicos especificados
const TECHNICIANS = {
  '1514631054': {
    name: 'Felipe Teixeira',
    role: 'Analista N2 Eventos',
    color: 'primary',
    avatar: 'FT',
  },
  '360834054': {
    name: 'Tiago Triani',
    role: 'Analista N2',
    color: 'secondary',
    avatar: 'TT',
  },
  '1727693927': {
    name: 'Guilherme Souza',
    role: 'Analista N2',
    color: 'success',
    avatar: 'GS',
  },
} as const;

// Configuração específica dos stages do sistema inPatch
const INPATCH_STAGES_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    displayOrder: number;
    description: string;
  }
> = {
  // Triagem N2 - stageId = 1110524173 (Aguardando triagem do time N2)
  '1110524173': {
    label: 'Triagem N2',
    color: 'bg-blue-500',
    displayOrder: 1,
    description: 'Aguardando triagem do time N2',
  },
  // P0|Crítico - stageId = 1060950860 (Tickets com prioridade Urgente)
  '1060950860': {
    label: 'P0|Crítico',
    color: 'bg-red-600',
    displayOrder: 2,
    description: 'Tickets com prioridade Urgente',
  },
  // P1|Alta - stageId = 1060950861 (Tickets com prioridade Alta)
  '1060950861': {
    label: 'P1|Alta',
    color: 'bg-orange-500',
    displayOrder: 3,
    description: 'Tickets com prioridade Alta',
  },
  // P2|Média - stageId = 1060950862 (Tickets com prioridade Normal)
  '1060950862': {
    label: 'P2|Média',
    color: 'bg-yellow-500',
    displayOrder: 4,
    description: 'Tickets com prioridade Normal',
  },
  // P3|Baixa - stageId = 1060950863 (Tickets com prioridade Baixa)
  '1060950863': {
    label: 'P3|Baixa',
    color: 'bg-green-500',
    displayOrder: 5,
    description: 'Tickets com prioridade Baixa',
  },
  // P4|Trivial - stageId = 1060950864 (Tickets com prioridade Lowest)
  '1060950864': {
    label: 'P4|Trivial',
    color: 'bg-gray-400',
    displayOrder: 6,
    description: 'Tickets com prioridade Lowest',
  },
  // Resolvido - stageId = 936942379 (Tickets resolvidos)
  '936942379': {
    label: 'Resolvido',
    color: 'bg-emerald-600',
    displayOrder: 7,
    description: 'Tickets resolvidos',
  },
  // Desconsiderado - stageId = 1028692851 (Tickets fechados, fora do padrão ou ilegível)
  '1028692851': {
    label: 'Desconsiderado',
    color: 'bg-slate-500',
    displayOrder: 8,
    description: 'Tickets fechados, fora do padrão ou ilegível',
  },
};

// Labels para estágios (backward compatibility)
const STAGE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(INPATCH_STAGES_CONFIG).map(([id, config]) => [
      id,
      config.label,
    ])
  ),
  // Fallbacks genéricos
  new: 'Novo',
  open: 'Aberto',
  in_progress: 'Em Progresso',
  waiting: 'Aguardando',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

// Cores para diferentes estágios (backward compatibility)
const STAGE_COLORS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(INPATCH_STAGES_CONFIG).map(([id, config]) => [
      id,
      config.color,
    ])
  ),
  // Fallbacks genéricos
  new: 'bg-blue-500',
  open: 'bg-orange-500',
  in_progress: 'bg-purple-500',
  waiting: 'bg-yellow-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

export function TicketKanbanBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>('stage');
  // Kanbans expandidos por padrão - inicializar vazio e expandir programaticamente
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const {
    loading,
    getFilteredTickets,
    getTicketsByStage,
    getTicketsByOwner,
    pipelines,
    owners,
  } = useTicketStore();

  // Dados baseados no modo de visualização
  const ticketGroups = useMemo(() => {
    switch (viewMode) {
      case 'stage':
        return getTicketsByStage();
      case 'owner':
        return getTicketsByOwner();
      case 'priority': {
        // Agrupar por prioridade
        const tickets = getFilteredTickets();
        const byPriority: any = {};

        tickets.forEach(ticket => {
          const priority = ticket.priority;

          if (!byPriority[priority]) {
            byPriority[priority] = {
              stage: {
                id: priority,
                label: priority.charAt(0).toUpperCase() + priority.slice(1),
                displayOrder:
                  priority === 'URGENT'
                    ? 0
                    : priority === 'HIGH'
                      ? 1
                      : priority === 'MEDIUM'
                        ? 2
                        : 3,
                metadata: { isClosed: false },
                createdAt: '',
                updatedAt: '',
                archived: false,
              },
              tickets: [],
              count: 0,
            };
          }
          byPriority[priority].tickets.push(ticket);
          byPriority[priority].count += 1;
        });

        return byPriority;
      }
      default:
        return getTicketsByStage();
    }
  }, [viewMode, getFilteredTickets, getTicketsByStage, getTicketsByOwner]);

  // Toggle expandir/colapsar coluna - Kanbans expandidos por padrão
  const toggleStageExpansion = (stageId: string) => {
    const newExpanded = new Set(expandedStages);

    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  // Inicializar todos os estágios como expandidos ao carregar dados
  useEffect(() => {
    const stageIds = Object.keys(ticketGroups);

    if (stageIds.length > 0 && expandedStages.size === 0) {
      setExpandedStages(new Set(stageIds));
    }
  }, [ticketGroups, expandedStages.size]);

  // Verificar se uma coluna específica está expandida
  const isExpanded = (stageId: string) => {
    return expandedStages.has(stageId);
  };

  // Ordenar colunas por displayOrder personalizado
  const sortedGroups = Object.entries(ticketGroups).sort(([, a], [, b]) => {
    // Type guards para identificar o tipo de grupo
    const groupA = a as any;
    const groupB = b as any;

    if (groupA?.stage && groupB?.stage) {
      // Usar ordem personalizada da configuração inPatch
      const orderA =
        INPATCH_STAGES_CONFIG[groupA.stage.id]?.displayOrder || 999;
      const orderB =
        INPATCH_STAGES_CONFIG[groupB.stage.id]?.displayOrder || 999;

      return orderA - orderB;
    }
    if (groupA?.owner && groupB?.owner) {
      return (
        groupA.owner.fullName?.localeCompare(groupB.owner.fullName || '') || 0
      );
    }

    return 0;
  });

  if (loading && Object.keys(ticketGroups).length === 0) {
    return (
      <Card className="liquid-glass min-h-[400px]">
        <CardBody className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner color="primary" size="lg" />
            <p className="text-foreground/70">Carregando tickets...</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (Object.keys(ticketGroups).length === 0) {
    return <EmptyState viewMode={viewMode} />;
  }

  return (
    <div className="space-y-6">
      {/* Modern View Mode Selector */}
      <div className="flex items-center justify-center">
        <div className="bg-content1/80 backdrop-blur-xl border border-divider/50 rounded-2xl p-1.5 shadow-lg">
          <div className="flex items-center gap-1">
            <motion.button
              className={`
                relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
                ${
                  viewMode === 'stage'
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'text-foreground/70 hover:text-foreground hover:bg-content2/50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode('stage')}
            >
              <FiColumns className="text-base" />
              Por Estágio
              {viewMode === 'stage' && (
                <motion.div
                  className="absolute inset-0 bg-primary-500 rounded-xl -z-10"
                  layoutId="activeTab"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>

            <motion.button
              className={`
                relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
                ${
                  viewMode === 'owner'
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'text-foreground/70 hover:text-foreground hover:bg-content2/50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode('owner')}
            >
              <FiUser className="text-base" />
              Por Técnico
              {viewMode === 'owner' && (
                <motion.div
                  className="absolute inset-0 bg-primary-500 rounded-xl -z-10"
                  layoutId="activeTab"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>

            <motion.button
              className={`
                relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
                ${
                  viewMode === 'priority'
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'text-foreground/70 hover:text-foreground hover:bg-content2/50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode('priority')}
            >
              <FiCalendar className="text-base" />
              Por Prioridade
              {viewMode === 'priority' && (
                <motion.div
                  className="absolute inset-0 bg-primary-500 rounded-xl -z-10"
                  layoutId="activeTab"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Modern Kanban Board com scroll horizontal */}
      <div
        className="
        overflow-x-auto overflow-y-visible pb-8 
        kanban-scroll scroll-smooth
        px-4 -mx-4
      "
      >
        <motion.div
          animate="animate"
          className="flex gap-6 min-w-max"
          initial="initial"
          style={{
            width: `${Object.keys(ticketGroups).length * 340}px`,
            minWidth: '100%',
          }}
          variants={boardVariants}
        >
          <AnimatePresence mode="popLayout">
            {sortedGroups.map(([groupId, group]) => {
              const isStageExpanded = isExpanded(groupId);

              // Determinar informações da coluna baseado no tipo
              let columnInfo;
              const groupData = group as any;

              if ('stage' in groupData) {
                const stage = groupData.stage;
                const stageConfig = INPATCH_STAGES_CONFIG[stage.id];

                columnInfo = {
                  title:
                    stageConfig?.label ||
                    STAGE_LABELS[stage.id] ||
                    stage.label ||
                    `Estágio ${stage.id}`,
                  color:
                    stageConfig?.color ||
                    STAGE_COLORS[stage.id] ||
                    'bg-gray-500',
                  count: groupData.count,
                  subtitle:
                    stageConfig?.description ||
                    (viewMode === 'stage'
                      ? `${groupData.count} tickets`
                      : undefined),
                };
              } else if ('owner' in groupData) {
                const owner = groupData.owner;
                const techInfo =
                  TECHNICIANS[owner.id as keyof typeof TECHNICIANS];

                columnInfo = {
                  title: techInfo?.name || owner.fullName || 'Não Atribuído',
                  color: `bg-${techInfo?.color || 'gray'}-500`,
                  count: groupData.count,
                  subtitle: techInfo?.role || 'Técnico',
                  avatar: techInfo?.avatar,
                };
              } else {
                columnInfo = {
                  title: `Grupo ${groupId}`,
                  color: 'bg-gray-500',
                  count: groupData.count,
                  subtitle: `${groupData.count} tickets`,
                };
              }

              return (
                <motion.div
                  key={groupId}
                  layout
                  className="flex flex-col min-h-[600px] w-[320px] flex-shrink-0" // Largura fixa e flex-shrink-0
                  variants={columnVariants}
                >
                  <TicketKanbanColumn
                    avatar={columnInfo.avatar}
                    color={columnInfo.color}
                    count={columnInfo.count}
                    id={groupId}
                    isExpanded={isStageExpanded}
                    subtitle={columnInfo.subtitle}
                    title={columnInfo.title}
                    viewMode={viewMode}
                    onToggleExpand={() => toggleStageExpansion(groupId)}
                  >
                    <AnimatePresence mode="popLayout">
                      {(groupData.tickets || []).map(
                        (ticket: any, index: number) => (
                          <motion.div
                            key={ticket.id}
                            layout
                            animate={{
                              opacity: 1,
                              y: 0,
                              transition: {
                                delay: index * 0.05,
                                duration: 0.3,
                                ease: 'easeOut',
                              },
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.8,
                              transition: { duration: 0.2 },
                            }}
                            initial={{ opacity: 0, y: 20 }}
                          >
                            <TicketCard
                              technicianInfo={
                                TECHNICIANS[
                                  ticket.hubspotOwnerId as keyof typeof TECHNICIANS
                                ]
                              }
                              ticket={ticket}
                              viewMode={viewMode}
                            />
                          </motion.div>
                        )
                      )}
                    </AnimatePresence>
                  </TicketKanbanColumn>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Modern Loading overlay */}
      <AnimatePresence>
        {loading && Object.keys(ticketGroups).length > 0 && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <motion.div
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-content1/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-divider/50"
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <div className="flex flex-col items-center gap-4">
                <Spinner color="primary" size="lg" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Atualizando tickets
                  </h3>
                  <p className="text-sm text-foreground/60">
                    Sincronizando com HubSpot CRM...
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
