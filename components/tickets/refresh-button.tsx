/**
 * Refresh Button - Botão de Atualização
 * Botão para refresh manual dos dados
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { motion } from 'framer-motion';
import { Button } from '@heroui/button';
import { FiRefreshCw } from 'react-icons/fi';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export function RefreshButton({ onRefresh, loading }: RefreshButtonProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        isIconOnly
        aria-label="Atualizar dados"
        className="transition-all duration-200"
        isLoading={loading}
        variant="bordered"
        onPress={onRefresh}
      >
        <motion.div
          animate={{ rotate: loading ? 360 : 0 }}
          transition={{
            duration: 1,
            repeat: loading ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <FiRefreshCw />
        </motion.div>
      </Button>
    </motion.div>
  );
}
