/**
 * Ticket Stats - Dashboard de Estatísticas
 * Painel com métricas dos tickets em tempo real
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import type { TicketStats as TicketStatsType } from '@/types/ticket';

import { motion } from 'framer-motion';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import {
  FiTrendingUp,
  FiClock,
  FiUsers,
  FiAlertTriangle,
  FiCheckCircle,
  FiActivity,
} from 'react-icons/fi';

interface TicketStatsProps {
  stats: TicketStatsType;
}

const statsVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

export function TicketStats({ stats }: TicketStatsProps) {
  // Calcular percentuais
  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const closedPercentage = getPercentage(stats.closedTickets, stats.total);
  const urgentPercentage = getPercentage(stats.byPriority.URGENT, stats.total);

  // Cores baseadas na performance
  const performanceColor =
    closedPercentage >= 80
      ? 'success'
      : closedPercentage >= 60
        ? 'warning'
        : 'danger';

  return (
    <motion.div
      animate="animate"
      className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      initial="initial"
      variants={statsVariants}
    >
      {/* Total de Tickets */}
      <motion.div variants={cardVariants}>
        <Card className="liquid-glass">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <FiActivity className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-xs text-foreground/60">Total</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Tickets Abertos */}
      <motion.div variants={cardVariants}>
        <Card className="liquid-glass">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                <FiClock className="text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.openTickets}
                </p>
                <p className="text-xs text-foreground/60">Abertos</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Tickets Fechados */}
      <motion.div variants={cardVariants}>
        <Card className="liquid-glass">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <FiCheckCircle className="text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.closedTickets}
                </p>
                <p className="text-xs text-foreground/60">Fechados</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Tickets Urgentes */}
      <motion.div variants={cardVariants}>
        <Card className="liquid-glass">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
                <FiAlertTriangle className="text-danger-600 dark:text-danger-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.byPriority.URGENT}
                </p>
                <p className="text-xs text-foreground/60">Urgentes</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Taxa de Resolução */}
      <motion.div className="md:col-span-2" variants={cardVariants}>
        <Card className="liquid-glass">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiTrendingUp className="text-foreground/60" />
                <span className="text-sm font-medium text-foreground">
                  Taxa de Resolução
                </span>
              </div>
              <Chip
                className="text-xs"
                color={performanceColor}
                size="sm"
                variant="flat"
              >
                {closedPercentage}%
              </Chip>
            </div>
            {/* Custom Progress Bar */}
            <div className="w-full bg-content3 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  performanceColor === 'success'
                    ? 'bg-success-500'
                    : performanceColor === 'warning'
                      ? 'bg-warning-500'
                      : 'bg-danger-500'
                }`}
                style={{ width: `${closedPercentage}%` }}
              />
            </div>
            <p className="text-xs text-foreground/60">
              {stats.closedTickets} de {stats.total} tickets resolvidos
            </p>
          </CardBody>
        </Card>
      </motion.div>

      {/* Distribuição por Status */}
      <motion.div
        className="col-span-2 md:col-span-4 lg:col-span-6"
        variants={cardVariants}
      >
        <Card className="liquid-glass">
          <CardBody className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FiUsers />
              Distribuição por Status
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const percentage = getPercentage(count, stats.total);
                const statusLabels = {
                  new: { label: 'Novos', color: 'primary', icon: '🆕' },
                  open: { label: 'Abertos', color: 'warning', icon: '📂' },
                  waiting: {
                    label: 'Aguardando',
                    color: 'default',
                    icon: '⏳',
                  },
                  closed: { label: 'Fechados', color: 'success', icon: '✅' },
                  resolved: {
                    label: 'Resolvidos',
                    color: 'success',
                    icon: '🎯',
                  },
                };

                const statusInfo = statusLabels[
                  status as keyof typeof statusLabels
                ] || {
                  label: status,
                  color: 'default' as const,
                  icon: '📋',
                };

                return (
                  <div key={status} className="text-center">
                    <div className="text-lg mb-1">{statusInfo.icon}</div>
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <p className="text-xs text-foreground/60 mb-1">
                      {statusInfo.label}
                    </p>
                    <Chip
                      className="text-xs"
                      color={
                        statusInfo.color as
                          | 'default'
                          | 'primary'
                          | 'secondary'
                          | 'success'
                          | 'warning'
                          | 'danger'
                      }
                      size="sm"
                      variant="flat"
                    >
                      {percentage}%
                    </Chip>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Top Técnicos */}
      <motion.div
        className="col-span-2 md:col-span-4 lg:col-span-6"
        variants={cardVariants}
      >
        <Card className="liquid-glass">
          <CardBody className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FiUsers />
              Distribuição por Técnico
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.byOwner)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([ownerId, count]) => {
                  const percentage = getPercentage(count, stats.total);

                  // Mapear técnicos conhecidos
                  const technicianNames = {
                    '1514631054': 'Felipe Teixeira',
                    '360834054': 'Tiago Triani',
                    '1727693927': 'Guilherme Souza',
                    unassigned: 'Não Atribuído',
                  };

                  const name =
                    technicianNames[ownerId as keyof typeof technicianNames] ||
                    `Técnico ${ownerId.slice(-4)}`;

                  return (
                    <div
                      key={ownerId}
                      className="flex items-center justify-between p-2 bg-content2 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {name}
                        </p>
                        <p className="text-xs text-foreground/60">
                          {count} ticket{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Chip
                        className="text-xs shrink-0"
                        color={
                          count > 5
                            ? 'danger'
                            : count > 2
                              ? 'warning'
                              : 'success'
                        }
                        size="sm"
                        variant="flat"
                      >
                        {percentage}%
                      </Chip>
                    </div>
                  );
                })}
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  );
}
