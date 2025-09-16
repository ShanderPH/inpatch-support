'use client';

import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { FiSearch, FiX, FiFilter } from 'react-icons/fi';

import { useProjectStore } from '@/lib/store';

const statusOptions = [
  { key: 'all', label: 'Todos os Status' },
  { key: 'a-fazer', label: 'A Fazer' },
  { key: 'em-andamento', label: 'Em Andamento' },
  { key: 'concluido', label: 'Concluído' },
];

const platformOptions = [
  { key: 'all', label: 'Todas as Plataformas' },
  { key: 'N8N', label: 'N8N' },
  { key: 'Jira', label: 'Jira' },
  { key: 'Hubspot', label: 'Hubspot' },
  { key: 'Backoffice', label: 'Backoffice' },
  { key: 'Google Workspace', label: 'Google Workspace' },
];

const responsibleOptions = [
  { key: 'all', label: 'Todos os Responsáveis' },
  { key: 'Guilherme Souza', label: 'Guilherme Souza' },
  { key: 'Felipe Braat', label: 'Felipe Braat' },
  { key: 'Tiago Triani', label: 'Tiago Triani' },
];

export const ProjectFilters = () => {
  const {
    searchQuery,
    statusFilter,
    platformFilter,
    responsibleFilter,
    setSearchQuery,
    setStatusFilter,
    setPlatformFilter,
    setResponsibleFilter,
    clearFilters,
    getFilteredProjects,
  } = useProjectStore();

  const filteredProjects = getFilteredProjects();
  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    platformFilter !== 'all' ||
    responsibleFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Input
          classNames={{
            base: 'max-w-full',
            mainWrapper: 'h-full',
            input: 'text-small',
            inputWrapper:
              'h-full font-normal text-default-500 bg-default-400/20 dark:bg-default-500/20',
          }}
          endContent={
            searchQuery && (
              <Button
                isIconOnly
                className="min-w-unit-6 w-6 h-6"
                size="sm"
                variant="light"
                onClick={() => setSearchQuery('')}
              >
                <FiX className="w-3 h-3" />
              </Button>
            )
          }
          placeholder="Buscar projetos..."
          startContent={<FiSearch className="w-4 h-4 text-default-400" />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          aria-label="Filtrar por status do projeto"
          className="max-w-xs"
          placeholder="Status"
          selectedKeys={[statusFilter]}
          size="sm"
          startContent={<FiFilter className="w-4 h-4" />}
          onSelectionChange={keys =>
            setStatusFilter(Array.from(keys)[0] as string)
          }
        >
          {statusOptions.map(option => (
            <SelectItem key={option.key}>{option.label}</SelectItem>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por plataforma"
          className="max-w-xs"
          placeholder="Plataforma"
          selectedKeys={[platformFilter]}
          size="sm"
          onSelectionChange={keys =>
            setPlatformFilter(Array.from(keys)[0] as string)
          }
        >
          {platformOptions.map(option => (
            <SelectItem key={option.key}>{option.label}</SelectItem>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por responsável"
          className="max-w-xs"
          placeholder="Responsável"
          selectedKeys={[responsibleFilter]}
          size="sm"
          onSelectionChange={keys =>
            setResponsibleFilter(Array.from(keys)[0] as string)
          }
        >
          {responsibleOptions.map(option => (
            <SelectItem key={option.key}>{option.label}</SelectItem>
          ))}
        </Select>

        {hasActiveFilters && (
          <Button
            color="default"
            size="sm"
            startContent={<FiX className="w-4 h-4" />}
            variant="ghost"
            onClick={clearFilters}
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Chip size="sm" variant="flat" onClose={() => setSearchQuery('')}>
              Busca: "{searchQuery}"
            </Chip>
          )}
          {statusFilter !== 'all' && (
            <Chip
              size="sm"
              variant="flat"
              onClose={() => setStatusFilter('all')}
            >
              Status: {statusOptions.find(o => o.key === statusFilter)?.label}
            </Chip>
          )}
          {platformFilter !== 'all' && (
            <Chip
              size="sm"
              variant="flat"
              onClose={() => setPlatformFilter('all')}
            >
              Plataforma: {platformFilter}
            </Chip>
          )}
          {responsibleFilter !== 'all' && (
            <Chip
              size="sm"
              variant="flat"
              onClose={() => setResponsibleFilter('all')}
            >
              Responsável: {responsibleFilter}
            </Chip>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-default-600">
        {filteredProjects.length} projeto
        {filteredProjects.length !== 1 ? 's' : ''} encontrado
        {filteredProjects.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
