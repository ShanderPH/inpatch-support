/**
 * Empty State - Estado Vazio do Kanban
 * Componente para exibir quando não há tickets
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { motion } from 'framer-motion';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';

interface EmptyStateProps {
  viewMode: 'stage' | 'owner' | 'priority';
}

const emptyVariants = {
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

const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0.2,
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

export function EmptyState({ viewMode }: EmptyStateProps) {
  const getEmptyStateContent = () => {
    switch (viewMode) {
      case 'stage':
        return {
          icon: '📋',
          title: 'Nenhum ticket encontrado',
          description: 'Não há tickets que correspondam aos filtros atuais.',
          suggestion: 'Ajuste os filtros ou crie um novo ticket.',
        };
      case 'owner':
        return {
          icon: '👥',
          title: 'Nenhum ticket atribuído',
          description: 'Todos os técnicos estão livres no momento.',
          suggestion: 'Crie novos tickets ou ajuste os filtros.',
        };
      case 'priority':
        return {
          icon: '🎯',
          title: 'Nenhum ticket por prioridade',
          description: 'Não há tickets nas prioridades selecionadas.',
          suggestion: 'Ajuste os filtros de prioridade.',
        };
      default:
        return {
          icon: '🎫',
          title: 'Nenhum ticket',
          description: 'O sistema está vazio.',
          suggestion: 'Comece criando seu primeiro ticket.',
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <motion.div
      animate="animate"
      className="flex items-center justify-center min-h-[400px]"
      initial="initial"
      variants={emptyVariants}
    >
      <Card className="liquid-glass max-w-md mx-auto">
        <CardBody className="text-center p-8">
          {/* Ícone Animado */}
          <motion.div className="text-6xl mb-4" variants={iconVariants}>
            {content.icon}
          </motion.div>

          {/* Título */}
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {content.title}
          </h3>

          {/* Descrição */}
          <p className="text-foreground/70 mb-6">{content.description}</p>

          {/* Sugestão */}
          <p className="text-sm text-foreground/50 mb-6">
            {content.suggestion}
          </p>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="font-medium"
              color="primary"
              startContent={<FiPlus />}
            >
              Criar Ticket
            </Button>

            <Button
              className="font-medium"
              startContent={<FiRefreshCw />}
              variant="bordered"
            >
              Atualizar
            </Button>
          </div>

          {/* Dicas */}
          <div className="mt-8 pt-6 border-t border-divider">
            <p className="text-xs text-foreground/40 mb-2">💡 Dicas rápidas:</p>
            <ul className="text-xs text-foreground/50 space-y-1">
              <li>• Use filtros para encontrar tickets específicos</li>
              <li>• Organize por técnico para gerenciar cargas de trabalho</li>
              <li>• Visualize por prioridade para focar no urgente</li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
