/**
 * Connection Status - Indicador de Status da Conexão
 * Mostra o status da conexão com HubSpot em tempo real
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chip } from '@heroui/chip';
import { Button } from '@heroui/button';
import { FiWifi, FiWifiOff, FiAlertCircle } from 'react-icons/fi';

interface ConnectionStatusProps {
  isConnected?: boolean;
  lastSync?: string | null;
  onRetry?: () => void;
}

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export function ConnectionStatus({
  isConnected = true,
  lastSync,
  onRetry,
}: ConnectionStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Auto-hide details após alguns segundos
  useEffect(() => {
    if (showDetails) {
      const timer = setTimeout(() => setShowDetails(false), 5000);

      return () => clearTimeout(timer);
    }
  }, [showDetails]);

  const getStatusInfo = () => {
    if (isConnected) {
      return {
        color: 'success' as const,
        icon: <FiWifi />,
        label: 'Conectado',
        description: 'HubSpot CRM Online',
      };
    } else {
      return {
        color: 'danger' as const,
        icon: <FiWifiOff />,
        label: 'Desconectado',
        description: 'Problemas na conexão',
      };
    }
  };

  const status = getStatusInfo();

  return (
    <div className="flex items-center gap-2">
      {/* Indicador Principal */}
      <motion.div
        animate={!isConnected ? 'animate' : undefined}
        variants={pulseVariants}
      >
        <Chip
          className="cursor-pointer select-none"
          color={status.color}
          size="sm"
          startContent={status.icon}
          variant="flat"
          onClick={() => setShowDetails(!showDetails)}
        >
          {status.label}
        </Chip>
      </motion.div>

      {/* Detalhes Expandidos */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="flex items-center gap-2"
            exit={{ opacity: 0, scale: 0.9, x: -10 }}
            initial={{ opacity: 0, scale: 0.9, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xs text-foreground/60">
              {status.description}
              {lastSync && isConnected && (
                <span className="ml-1">
                  • Última sync:{' '}
                  {new Date(lastSync).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>

            {!isConnected && onRetry && (
              <Button
                isIconOnly
                aria-label="Tentar reconectar"
                color="danger"
                size="sm"
                variant="light"
                onPress={onRetry}
              >
                <FiAlertCircle className="text-xs" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
