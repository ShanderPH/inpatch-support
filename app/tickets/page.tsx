/**
 * Página Principal - Kanban de Tickets HubSpot
 * Interface moderna, responsiva e animada para gerenciamento de tickets
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { FiAlertCircle, FiRefreshCw, FiFilter } from 'react-icons/fi';
import { Chip } from '@heroui/chip';
import { toast } from 'react-hot-toast';

import { useTicketStore } from '@/lib/stores/ticket-store';
import { TicketKanbanBoard } from '@/components/tickets/ticket-kanban-board';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { CreateTicketButton } from '@/components/tickets/create-ticket-button';
import { RefreshButton } from '@/components/tickets/refresh-button';
import { ConnectionStatus } from '@/components/tickets/connection-status';
import { TicketErrorBoundary } from '@/components/error-boundary-tickets';

// Animações para entrada da página
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const headerVariants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      delay: 0.1,
      ease: 'easeOut',
    },
  },
};

const filtersVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: 0.2,
      ease: 'easeOut',
    },
  },
};

const kanbanVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      delay: 0.3,
      ease: 'easeOut',
    },
  },
};

export default function TicketsPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // Filtros colapsados por padrão

  const {
    loading,
    error,
    tickets,
    pipelines,
    owners,
    lastUpdated,
    filters,
    fetchTickets,
    fetchPipelines,
    fetchOwners,
    refreshData,
  } = useTicketStore();

  // Inicialização da página
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsInitialized(false);

        // Buscar dados iniciais em paralelo
        await Promise.all([
          fetchPipelines(),
          fetchOwners(),
          fetchTickets(true), // refresh = true
        ]);

        setIsInitialized(true);

        if (tickets.length > 0) {
          toast.success(`✅ ${tickets.length} tickets carregados com sucesso!`);
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        toast.error('Erro ao carregar dados iniciais');
        setIsInitialized(true); // Permitir que a UI seja exibida mesmo com erro
      }
    };

    initialize();
  }, []);

  // Handler para refresh manual
  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('🔄 Dados atualizados!');
    } catch (error) {
      console.error('❌ Erro no refresh:', error);
      toast.error('Erro ao atualizar dados');
    }
  };

  // Loading inicial
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
        >
          <Spinner color="primary" size="lg" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              Carregando Sistema de Tickets
            </h2>
            <p className="text-sm text-foreground/70">
              Conectando com HubSpot CRM...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Contar filtros ativos
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <motion.div
      animate="animate"
      className="min-h-screen p-4 md:p-6 lg:p-8"
      initial="initial"
      variants={pageVariants}
    >
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <motion.header
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          variants={headerVariants}
        >
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              🎫 Sistema de Tickets
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-foreground/70">
                Integração HubSpot CRM • {tickets.length} tickets ativos
              </span>
              <ConnectionStatus
                isConnected={!error && !loading}
                lastSync={lastUpdated}
                onRetry={handleRefresh}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RefreshButton loading={loading} onRefresh={handleRefresh} />
            <CreateTicketButton />
          </div>
        </motion.header>

        {/* Header com Filtros Toggler */}
        <motion.div
          className="flex items-center justify-between bg-content1/50 backdrop-blur-lg border border-divider rounded-2xl p-4 shadow-sm"
          variants={filtersVariants}
        >
          <div className="flex items-center gap-3">
            <Button
              className="font-medium"
              color={showFilters ? 'primary' : 'default'}
              startContent={<FiFilter className="text-sm" />}
              variant="flat"
              onPress={() => setShowFilters(!showFilters)}
            >
              Filtros
              {activeFilters > 0 && (
                <Chip className="ml-2" color="primary" size="sm" variant="flat">
                  {activeFilters}
                </Chip>
              )}
            </Button>

            <div className="text-sm text-foreground/60">
              {tickets.length}{' '}
              {tickets.length === 1
                ? 'ticket encontrado'
                : 'tickets encontrados'}
            </div>
          </div>
        </motion.div>

        {/* Filtros */}
        {showFilters && (
          <motion.div
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            variants={filtersVariants}
          >
            <TicketFilters />
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
          >
            <Card className="border-danger-200 bg-danger-50/50 dark:bg-danger-950/30">
              <CardBody className="flex flex-row items-center gap-3 p-4">
                <FiAlertCircle className="text-danger-500 text-xl shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-danger-700 dark:text-danger-300">
                    Erro na conexão
                  </p>
                  <p className="text-xs text-danger-600 dark:text-danger-400">
                    {error}
                  </p>
                </div>
                <Button
                  isIconOnly
                  color="danger"
                  size="sm"
                  variant="flat"
                  onPress={handleRefresh}
                >
                  <FiRefreshCw className="text-sm" />
                </Button>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Kanban Board Principal */}
        <motion.main variants={kanbanVariants}>
          <TicketErrorBoundary
            onError={(error, _errorInfo) => {
              console.error('🚨 Error in Ticket Kanban:', error);
              // Em produção, enviar para serviço de monitoramento
            }}
          >
            <TicketKanbanBoard />
          </TicketErrorBoundary>
        </motion.main>

        {/* Footer com informações técnicas */}
        <motion.footer
          animate={{ opacity: 1 }}
          className="pt-8 pb-4 text-center text-xs text-foreground/50"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.8 }}
        >
          <p>
            inPatch HelpDesk • Integração HubSpot CRM API v3 • Técnicos: Felipe
            Teixeira, Tiago Triani, Guilherme Souza
          </p>
        </motion.footer>
      </div>
    </motion.div>
  );
}
