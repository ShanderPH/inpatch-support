/**
 * Create Ticket Button - Botão de Criação de Ticket
 * Botão com modal para criar novos tickets
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@heroui/button';
import { FiPlus } from 'react-icons/fi';

import { CardReportModal } from './card-report-modal';

export function CreateTicketButton() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            className="font-medium"
            color="primary"
            startContent={<FiPlus />}
            onPress={() => setIsReportModalOpen(true)}
          >
            Novo Ticket
          </Button>
        </motion.div>
      </div>

      <CardReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
}
