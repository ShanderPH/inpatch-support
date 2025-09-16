'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@heroui/switch';
import { Card, CardBody } from '@heroui/card';
import { FiWifi, FiWifiOff, FiActivity, FiClock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useProjectStore } from '@/lib/store';

export const RealTimeSyncToggle = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const { startRealTimeSync, stopRealTimeSync, isRealTimeSyncActive } =
    useProjectStore();

  useEffect(() => {
    setIsEnabled(isRealTimeSyncActive());
  }, [isRealTimeSyncActive]);

  const handleToggle = async () => {
    try {
      if (isEnabled) {
        stopRealTimeSync();
        setIsEnabled(false);
        toast.success('Sincronização em tempo real desativada');
      } else {
        startRealTimeSync();
        setIsEnabled(true);
        setLastUpdate(new Date().toLocaleString('pt-BR'));
        toast.success('Sincronização em tempo real ativada');
      }
    } catch {
      toast.error('Erro ao alterar sincronização');
    }
  };

  return (
    <Card className="liquid-glass">
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${isEnabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}
            >
              {isEnabled ? (
                <FiWifi className="w-5 h-5 text-green-500" />
              ) : (
                <FiWifiOff className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Sincronização em Tempo Real
              </h3>
              <p className="text-xs text-default-600">
                {isEnabled
                  ? 'Monitorando mudanças no Trello'
                  : 'Sincronização manual'}
              </p>
            </div>
          </div>

          <Switch
            color="success"
            isSelected={isEnabled}
            size="sm"
            onValueChange={handleToggle}
          />
        </div>

        <AnimatePresence>
          {isEnabled && (
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-divider"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-default-600">
                  <FiActivity className="w-3 h-3" />
                  <span>Verificando a cada 30s</span>
                </div>
                {lastUpdate && (
                  <div className="flex items-center gap-2 text-default-600">
                    <FiClock className="w-3 h-3" />
                    <span>Última verificação: {lastUpdate}</span>
                  </div>
                )}
              </div>

              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">
                    Ativo
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </Card>
  );
};
