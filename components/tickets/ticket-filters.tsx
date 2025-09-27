/**
 * Ticket Filters - Filtros Avançados
 * Componente de filtros com busca e seleções múltiplas
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody } from '@heroui/card';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Select, SelectItem } from '@heroui/select';
import {
  FiSearch,
  FiFilter,
  FiX,
  FiUser,
  FiClock,
  FiTag,
} from 'react-icons/fi';

import { useTicketStore } from '@/lib/stores/ticket-store';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types/ticket';

const filtersVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

export function TicketFilters() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const {
    filters,
    searchQuery,
    setFilters,
    setSearchQuery,
    clearFilters,
    pipelines,
    owners,
  } = useTicketStore();

  // Aplicar busca quando Enter é pressionado
  const handleSearchSubmit = () => {
    setSearchQuery(localSearch);
  };

  // Limpar filtros e busca
  const handleClearAll = () => {
    setLocalSearch('');
    setSearchQuery('');
    clearFilters();
  };

  // Contar filtros ativos
  const activeFiltersCount =
    Object.values(filters).filter(Boolean).length + (searchQuery ? 1 : 0);

  return (
    <motion.div animate="animate" initial="initial" variants={filtersVariants}>
      <Card className="liquid-glass">
        <CardBody className="p-4">
          {/* Header dos Filtros */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-foreground/60" />
              <h3 className="font-semibold text-foreground">Filtros</h3>
              {activeFiltersCount > 0 && (
                <Chip
                  className="text-xs"
                  color="primary"
                  size="sm"
                  variant="flat"
                >
                  {activeFiltersCount}
                </Chip>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  className="text-xs"
                  size="sm"
                  startContent={<FiX />}
                  variant="light"
                  onPress={handleClearAll}
                >
                  Limpar
                </Button>
              )}

              <Button
                className="text-xs"
                size="sm"
                variant="light"
                onPress={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Menos' : 'Mais'} Filtros
              </Button>
            </div>
          </div>

          {/* Busca Principal */}
          <div className="mb-4">
            <Input
              className="w-full"
              endContent={
                localSearch && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setLocalSearch('');
                      setSearchQuery('');
                    }}
                  >
                    <FiX />
                  </Button>
                )
              }
              placeholder="Buscar tickets por assunto ou conteúdo..."
              startContent={<FiSearch className="text-foreground/40" />}
              value={localSearch}
              onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
              onValueChange={setLocalSearch}
            />

            {localSearch !== searchQuery && localSearch && (
              <Button
                className="mt-2 text-xs"
                color="primary"
                size="sm"
                onPress={handleSearchSubmit}
              >
                Aplicar Busca
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {/* Status */}
            <Select
              label="Status"
              placeholder="Todos"
              selectedKeys={filters.status ? ([filters.status] as any) : []}
              size="sm"
              startContent={<FiClock className="text-sm" />}
              onSelectionChange={keys => {
                const selectedKeys = Array.from(keys);
                const value =
                  selectedKeys.length > 0 ? String(selectedKeys[0]) : undefined;

                setFilters({ status: value as any });
              }}
            >
              {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key}>{label}</SelectItem>
              ))}
            </Select>

            {/* Prioridade */}
            <Select
              label="Prioridade"
              placeholder="Todas"
              selectedKeys={filters.priority ? ([filters.priority] as any) : []}
              size="sm"
              startContent={<FiTag className="text-sm" />}
              onSelectionChange={keys => {
                const selectedKeys = Array.from(keys);
                const value =
                  selectedKeys.length > 0 ? String(selectedKeys[0]) : undefined;

                setFilters({ priority: value as any });
              }}
            >
              {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                <SelectItem key={key}>{label}</SelectItem>
              ))}
            </Select>

            {/* Técnico */}
            <Select
              label="Técnico"
              placeholder="Todos"
              selectedKeys={filters.ownerId ? ([filters.ownerId] as any) : []}
              size="sm"
              startContent={<FiUser className="text-sm" />}
              onSelectionChange={keys => {
                const selectedKeys = Array.from(keys);
                const value =
                  selectedKeys.length > 0 ? String(selectedKeys[0]) : undefined;

                setFilters({ ownerId: value });
              }}
            >
              <SelectItem key="1514631054">Felipe Teixeira</SelectItem>
              <SelectItem key="360834054">Tiago Triani</SelectItem>
              <SelectItem key="1727693927">Guilherme Souza</SelectItem>
              <SelectItem key="unassigned">Não Atribuído</SelectItem>
            </Select>

            {/* Categoria */}
            <Input
              label="Categoria"
              placeholder="Filtrar por categoria"
              size="sm"
              startContent={<FiTag className="text-sm" />}
              value={filters.category || ''}
              onValueChange={value =>
                setFilters({ category: value || undefined })
              }
            />
          </div>

          {/* Filtros Expandidos */}
          {isExpanded && (
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 border-t border-divider pt-4"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              {/* Filtros de Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Data Inicial"
                  size="sm"
                  type="date"
                  value={filters.dateFrom || ''}
                  onValueChange={value =>
                    setFilters({ dateFrom: value || undefined })
                  }
                />

                <Input
                  label="Data Final"
                  size="sm"
                  type="date"
                  value={filters.dateTo || ''}
                  onValueChange={value =>
                    setFilters({ dateTo: value || undefined })
                  }
                />
              </div>

              {/* Pipeline Stage (se disponível) */}
              {pipelines.length > 0 && (
                <Select
                  label="Estágio do Pipeline"
                  placeholder="Todos os estágios"
                  selectedKeys={
                    filters.pipelineStageId
                      ? ([filters.pipelineStageId] as any)
                      : []
                  }
                  size="sm"
                  onSelectionChange={keys => {
                    const selectedKeys = Array.from(keys);
                    const value =
                      selectedKeys.length > 0
                        ? String(selectedKeys[0])
                        : undefined;

                    setFilters({ pipelineStageId: value });
                  }}
                >
                  {pipelines.flatMap(pipeline =>
                    pipeline.stages.map(stage => (
                      <SelectItem key={stage.id}>
                        {pipeline.label} - {stage.label}
                      </SelectItem>
                    ))
                  )}
                </Select>
              )}

              {/* Tags */}
              <Input
                label="Tags"
                placeholder="Filtrar por tags (separadas por vírgula)"
                size="sm"
                startContent={<FiTag className="text-sm" />}
                value={filters.tags?.join(', ') || ''}
                onValueChange={value => {
                  const tags = value
                    ? value
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(Boolean)
                    : undefined;

                  setFilters({ tags });
                }}
              />
            </motion.div>
          )}

          {/* Filtros Ativos */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t border-divider">
              <p className="text-xs text-foreground/60 mb-2">Filtros ativos:</p>
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Chip
                    color="primary"
                    size="sm"
                    variant="flat"
                    onClose={() => setSearchQuery('')}
                  >
                    Busca: "{searchQuery}"
                  </Chip>
                )}

                {filters.status && (
                  <Chip
                    color="default"
                    size="sm"
                    variant="flat"
                    onClose={() => setFilters({ status: undefined })}
                  >
                    Status:{' '}
                    {
                      TICKET_STATUS_LABELS[
                        filters.status as keyof typeof TICKET_STATUS_LABELS
                      ]
                    }
                  </Chip>
                )}

                {filters.priority && (
                  <Chip
                    color="warning"
                    size="sm"
                    variant="flat"
                    onClose={() => setFilters({ priority: undefined })}
                  >
                    Prioridade:{' '}
                    {
                      TICKET_PRIORITY_LABELS[
                        filters.priority as keyof typeof TICKET_PRIORITY_LABELS
                      ]
                    }
                  </Chip>
                )}

                {filters.ownerId && (
                  <Chip
                    color="secondary"
                    size="sm"
                    variant="flat"
                    onClose={() => setFilters({ ownerId: undefined })}
                  >
                    Técnico:{' '}
                    {filters.ownerId === '1514631054'
                      ? 'Felipe Teixeira'
                      : filters.ownerId === '360834054'
                        ? 'Tiago Triani'
                        : filters.ownerId === '1727693927'
                          ? 'Guilherme Souza'
                          : 'Não Atribuído'}
                  </Chip>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}
