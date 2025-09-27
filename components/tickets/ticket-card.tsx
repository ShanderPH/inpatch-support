/**
 * Ticket Card - Card Individual de Ticket
 * Card responsivo com informações do ticket e animações suaves
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import type { Ticket } from '@/types/ticket';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card';
import { Chip } from '@heroui/chip';
// Avatar component not available in current HeroUI version
import { Button } from '@heroui/button';
// import { Tooltip } from '@heroui/tooltip'; // Not available in current HeroUI version
import {
  FiClock,
  FiTag,
  FiExternalLink,
  FiEdit3,
  FiAlertCircle,
  FiMoreVertical,
} from 'react-icons/fi';

import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types/ticket';

interface TicketCardProps {
  ticket: Ticket;
  viewMode: 'stage' | 'owner' | 'priority';
  technicianInfo?: {
    name: string;
    role: string;
    color: string;
    avatar: string;
  };
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  hover: {
    y: -2,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

const priorityIcons = {
  low: '⬇️',
  medium: '➡️',
  high: '⬆️',
  urgent: '🚨',
};

const statusIcons = {
  new: '🆕',
  open: '📂',
  waiting: '⏳',
  closed: '✅',
  resolved: '🎯',
};

export function TicketCard({
  ticket,
  viewMode,
  technicianInfo,
}: TicketCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calcular tempo desde criação
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;

    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays < 7) return `${diffInDays}d atrás`;

    const diffInWeeks = Math.floor(diffInDays / 7);

    return `${diffInWeeks}sem atrás`;
  };

  // Determinar se o ticket está atrasado (mais de 72h aberto)
  const isOverdue = () => {
    const now = new Date();
    const created = new Date(ticket.createdAt);
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    return diffInHours > 72 && !['closed', 'resolved'].includes(ticket.status);
  };

  // Determinar urgência visual
  const getUrgencyLevel = () => {
    if (ticket.priority === 'URGENT') return 'urgent';
    if (isOverdue()) return 'overdue';
    if (ticket.priority === 'HIGH') return 'high';

    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();

  // Cores baseadas na urgência - simplificado com apenas efeito glass
  const urgencyStyles = {
    urgent: 'border-danger-200/50 bg-content1/80 backdrop-blur-md',
    overdue: 'border-warning-200/50 bg-content1/80 backdrop-blur-md',
    high: 'border-orange-200/50 bg-content1/80 backdrop-blur-md',
    normal: 'border-divider/30 bg-content1/80 backdrop-blur-md',
  };

  const urgencyIndicator = {
    urgent: 'bg-danger-500',
    overdue: 'bg-warning-500',
    high: 'bg-orange-500',
    normal: 'bg-success-500',
  };

  // Handler para abrir ticket no HubSpot
  const handleOpenInHubSpot = () => {
    const hubspotUrl = `https://app.hubspot.com/contacts/tickets/${ticket.hubspotId}`;

    window.open(hubspotUrl, '_blank');
  };

  // Handler para editar ticket
  const handleEditTicket = () => {
    // TODO: Implementar modal de edição
    console.log('Editar ticket:', ticket.id);
  };

  // Handler para click no card
  const handleCardClick = () => {
    // TODO: Implementar modal de detalhes ou navegação
    console.log('Visualizar detalhes do ticket:', ticket.id);
  };

  return (
    <motion.div
      animate="animate"
      className="group"
      initial="initial"
      variants={cardVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={handleCardClick}
      onHoverEnd={() => setIsHovered(false)}
      onHoverStart={() => setIsHovered(true)}
    >
      <Card
        isPressable
        className={`
          relative transition-all duration-300 cursor-pointer backdrop-blur-sm
          ${urgencyStyles[urgencyLevel]}
          ${isHovered ? 'shadow-xl shadow-primary-500/10 scale-[1.02]' : 'shadow-md'}
          border-l-4 border-l-transparent hover:border-l-primary-400
          rounded-2xl overflow-hidden
        `}
      >
        {/* Indicador de Urgência Moderno */}
        <div
          aria-label={`Nível de urgência: ${urgencyLevel}`}
          className={`absolute top-0 right-0 w-2 h-full ${urgencyIndicator[urgencyLevel]} rounded-l-lg opacity-60`}
        />

        {/* Header do Card Moderno */}
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between w-full gap-3">
            {/* ID e Status com novo design */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 bg-content2/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-divider/50">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                  #{ticket.hubspotId.slice(-6)}
                </span>
              </div>

              {/* Status Badge (apenas se não for view mode stage) */}
              {viewMode !== 'stage' && (
                <Chip
                  className="text-xs font-medium"
                  color={
                    ticket.status === 'CLOSED' || ticket.status === 'RESOLVED'
                      ? 'success'
                      : ticket.status === 'NEW'
                        ? 'primary'
                        : 'warning'
                  }
                  size="sm"
                  startContent={
                    <span className="text-xs">
                      {
                        statusIcons[
                          ticket.status.toLowerCase() as keyof typeof statusIcons
                        ]
                      }
                    </span>
                  }
                  variant="flat"
                >
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Chip>
              )}
            </div>

            {/* Menu de Ações com novo design */}
            <Button
              isIconOnly
              aria-label="Mais ações"
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 bg-content2/50 hover:bg-content3/80 backdrop-blur-sm"
              radius="full"
              size="sm"
              variant="flat"
            >
              <FiMoreVertical className="text-sm" />
            </Button>
          </div>
        </CardHeader>

        {/* Body do Card Redesenhado */}
        <CardBody className="py-3 relative z-10">
          {/* Título do Ticket com melhor tipografia */}
          <h4 className="font-bold text-base text-foreground mb-3 line-clamp-2 leading-tight">
            {ticket.subject}
          </h4>

          {/* Conteúdo com melhor espaçamento */}
          {ticket.content && (
            <p className="text-sm text-foreground/60 line-clamp-2 mb-4 leading-relaxed">
              {ticket.content}
            </p>
          )}

          {/* Metadados com novo layout */}
          <div className="space-y-3">
            {/* Prioridade com design aprimorado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    ticket.priority === 'URGENT'
                      ? 'bg-danger-500 animate-pulse'
                      : ticket.priority === 'HIGH'
                        ? 'bg-warning-500'
                        : ticket.priority === 'MEDIUM'
                          ? 'bg-primary-500'
                          : 'bg-success-500'
                  }`}
                />
                <span className="text-sm font-medium text-foreground">
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </span>
              </div>

              <span className="text-lg">
                {
                  priorityIcons[
                    ticket.priority.toLowerCase() as keyof typeof priorityIcons
                  ]
                }
              </span>
            </div>

            {/* Técnico Responsável com avatar melhorado */}
            {viewMode !== 'owner' && ticket.hubspotOwnerId && (
              <div className="flex items-center gap-3 p-2 bg-content2/50 rounded-lg border border-divider/30">
                {technicianInfo && (
                  <div
                    className={`w-8 h-8 bg-${technicianInfo.color}-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg`}
                  >
                    {technicianInfo.avatar}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {technicianInfo?.name ||
                      `Técnico ${ticket.hubspotOwnerId.slice(-4)}`}
                  </p>
                  {technicianInfo?.role && (
                    <p className="text-xs text-foreground/60 truncate">
                      {technicianInfo.role}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tags modernizadas */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <FiTag className="text-sm text-foreground/40" />
                {ticket.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-content2/70 text-xs font-medium text-foreground/80 rounded-full border border-divider/40"
                  >
                    {tag}
                  </span>
                ))}
                {ticket.tags.length > 3 && (
                  <span className="text-xs text-foreground/50 font-medium">
                    +{ticket.tags.length - 3} mais
                  </span>
                )}
              </div>
            )}
          </div>
        </CardBody>

        {/* Footer do Card Modernizado */}
        <CardFooter className="pt-3 relative z-10">
          <div className="flex items-center justify-between w-full">
            {/* Tempo com design aprimorado */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-content2/50 rounded-full">
                <FiClock className="text-xs text-primary-500" />
                <span className="text-xs font-medium text-foreground/70">
                  {getTimeAgo(ticket.createdAt)}
                </span>
                {isOverdue() && (
                  <FiAlertCircle
                    className="text-warning-500 animate-pulse"
                    title="Ticket em atraso"
                  />
                )}
              </div>
            </div>

            {/* Ações com novo layout */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
              {/* Botão Editar */}
              <Button
                isIconOnly
                aria-label="Editar ticket"
                className="bg-content2/70 hover:bg-primary-100 hover:text-primary-600 transition-all duration-200"
                radius="full"
                size="sm"
                variant="flat"
                onPress={handleEditTicket}
              >
                <FiEdit3 className="text-sm" />
              </Button>

              {/* Botão Abrir no HubSpot */}
              <Button
                isIconOnly
                aria-label="Abrir no HubSpot"
                className="bg-content2/70 hover:bg-success-100 hover:text-success-600 transition-all duration-200"
                radius="full"
                size="sm"
                variant="flat"
                onPress={handleOpenInHubSpot}
              >
                <FiExternalLink className="text-sm" />
              </Button>
            </div>
          </div>
        </CardFooter>

        {/* Badge de Urgência Modernizado */}
        {urgencyLevel === 'urgent' && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0],
            }}
            className="absolute -top-2 -right-2 z-20"
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="w-5 h-5 bg-danger-500 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
              <span className="text-xs text-white font-bold">!</span>
            </div>
          </motion.div>
        )}

        {/* Badge de Atraso Modernizado */}
        {urgencyLevel === 'overdue' && (
          <div className="absolute -top-2 -right-2 z-20">
            <div className="w-5 h-5 bg-warning-500 rounded-full animate-pulse shadow-lg border-2 border-white flex items-center justify-center">
              <FiClock className="text-xs text-white" />
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
