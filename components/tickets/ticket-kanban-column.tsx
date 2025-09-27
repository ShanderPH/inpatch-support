/**
 * Ticket Kanban Column - Coluna Individual do Board
 * Coluna responsiva com header animado e área de drop
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
// Avatar component not available in current HeroUI version
import { Button } from '@heroui/button';
import { FiChevronDown, FiMoreHorizontal } from 'react-icons/fi';

interface TicketKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  subtitle?: string;
  avatar?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  viewMode: 'stage' | 'owner' | 'priority';
  children: ReactNode;
}

const headerVariants = {
  expanded: {
    borderRadius: '12px 12px 0 0',
  },
  collapsed: {
    borderRadius: '12px',
  },
};

const bodyVariants = {
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: 0.3,
        ease: 'easeOut',
      },
      opacity: {
        duration: 0.2,
        delay: 0.1,
      },
    },
  },
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: 0.3,
        ease: 'easeIn',
      },
      opacity: {
        duration: 0.1,
      },
    },
  },
};

export function TicketKanbanColumn({
  id: _id,
  title,
  color,
  count,
  subtitle,
  avatar,
  isExpanded,
  onToggleExpand,
  viewMode,
  children,
}: TicketKanbanColumnProps) {
  // Determinar cor do chip baseada na contagem
  const getCountColor = () => {
    if (count === 0) return 'default';
    if (count < 3) return 'success';
    if (count < 6) return 'warning';

    return 'danger';
  };

  return (
    <div className="flex flex-col">
      {/* Header da Coluna */}
      <motion.div
        animate={isExpanded ? 'expanded' : 'collapsed'}
        className="liquid-glass border-b-0"
        style={{ zIndex: 10 }}
        variants={headerVariants}
      >
        <Card className="bg-transparent shadow-none border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              {/* Lado Esquerdo - Título e Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Indicador de Cor */}
                <div
                  aria-label={`Cor da coluna ${title}`}
                  className={`w-3 h-3 rounded-full ${color} shrink-0`}
                />

                {/* Avatar (apenas para modo owner) */}
                {viewMode === 'owner' && avatar && (
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {avatar}
                  </div>
                )}

                {/* Título e Subtítulo */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-xs text-foreground/60 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Lado Direito - Controles */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Chip de Contagem */}
                <Chip
                  className="text-xs font-medium"
                  color={getCountColor()}
                  size="sm"
                  variant="flat"
                >
                  {count}
                </Chip>

                {/* Botão de Menu (futuro) */}
                <Button
                  isIconOnly
                  aria-label="Opções da coluna"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  size="sm"
                  variant="light"
                >
                  <FiMoreHorizontal className="text-xs" />
                </Button>

                {/* Botão Expandir/Colapsar */}
                <Button
                  isIconOnly
                  aria-label={
                    isExpanded ? 'Colapsar coluna' : 'Expandir coluna'
                  }
                  className="transition-transform"
                  size="sm"
                  variant="light"
                  onPress={onToggleExpand}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiChevronDown className="text-sm" />
                  </motion.div>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Body da Coluna - Área de Tickets */}
      <motion.div
        animate={isExpanded ? 'expanded' : 'collapsed'}
        className="overflow-hidden"
        variants={bodyVariants}
      >
        <Card className="liquid-glass rounded-t-none border-t-0 min-h-[400px]">
          <CardBody className="p-3 gap-3">
            {/* Área de Drop Zone (futuro drag & drop) */}
            <div
              className="
                min-h-[350px] space-y-3
                border-2 border-dashed border-transparent
                rounded-lg transition-colors duration-200
                hover:border-primary-300/50 hover:bg-primary-50/20
                dark:hover:border-primary-700/50 dark:hover:bg-primary-950/20
              "
            >
              {count === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <div className="text-foreground/30 text-4xl mb-2">📋</div>
                  <p className="text-sm text-foreground/50">
                    Nenhum ticket nesta coluna
                  </p>
                  <p className="text-xs text-foreground/30 mt-1">
                    {viewMode === 'stage' && 'Arraste tickets aqui'}
                    {viewMode === 'owner' && 'Atribua tickets a este técnico'}
                    {viewMode === 'priority' && 'Tickets aparecerão aqui'}
                  </p>
                </div>
              ) : (
                children
              )}
            </div>

            {/* Footer da Coluna com Info Adicional */}
            {count > 0 && (
              <div className="pt-2 border-t border-divider">
                <div className="flex items-center justify-between text-xs text-foreground/50">
                  <span>
                    {count} ticket{count !== 1 ? 's' : ''}
                  </span>
                  {viewMode === 'owner' && <span>Carga de trabalho</span>}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
