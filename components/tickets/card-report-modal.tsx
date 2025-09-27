/**
 * Card Report Modal - Modal de Relatório de Problemas
 * Modal para seleção de plataforma e criação de relatórios
 *
 * @author inPatch Team
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/modal';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Card, CardBody } from '@heroui/card';
import { SiJira, SiHubspot } from 'react-icons/si';

type Platform = 'jira' | 'hubspot' | null;

interface CardReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CardReportModal({ isOpen, onClose }: CardReportModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);
  const [hubspotTicketId, setHubspotTicketId] = useState('');

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
  };

  const handleBack = () => {
    setSelectedPlatform(null);
    setHubspotTicketId('');
  };

  const handleCreateTicket = () => {
    // Lógica para criar ticket
    console.log('Criando ticket para plataforma:', selectedPlatform);
    console.log('ID Hubspot Ticket:', hubspotTicketId);
    onClose();
  };

  const handleStartReport = () => {
    // Lógica para iniciar report
    console.log('Iniciando report para ID:', hubspotTicketId);
    onClose();
  };

  const resetModal = () => {
    setSelectedPlatform(null);
    setHubspotTicketId('');
  };

  const handleModalClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      classNames={{
        backdrop:
          'bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20',
      }}
      isOpen={isOpen}
      placement="center"
      size="lg"
      onOpenChange={open => !open && handleModalClose()}
    >
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className="flex items-start flex-col gap-1">
              {selectedPlatform ? (
                <div className="gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={handleBack}
                  >
                    ←
                  </Button>
                  <span>
                    {selectedPlatform === 'jira'
                      ? 'Relatório Jira'
                      : 'Relatório Hubspot'}
                  </span>
                </div>
              ) : (
                'Para qual plataforma você deseja relatar?'
              )}
            </ModalHeader>

            <ModalBody className="items-center justify-center py-6">
              {!selectedPlatform ? (
                // Seleção de Plataforma
                <div className=" grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      isPressable
                      className="h-auto w-50 items-center justify-center cursor-pointer border-2 border-transparent hover:border-primary-200 transition-all duration-200"
                      onPress={() => handlePlatformSelect('jira')}
                    >
                      <CardBody className="flex flex-col items-center justify-center gap-3 p-6">
                        <SiJira className="text-4xl text-blue-600" />
                        <span className="font-medium text-foreground">
                          Jira
                        </span>
                      </CardBody>
                    </Card>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      isPressable
                      className="h-auto w-50 items-center justify-center cursor-pointer border-2 border-transparent hover:border-primary-200 transition-all duration-200"
                      onPress={() => handlePlatformSelect('hubspot')}
                    >
                      <CardBody className="flex flex-col items-center justify-center gap-3 p-6">
                        <SiHubspot className="text-4xl text-orange-600" />
                        <span className="font-medium text-foreground">
                          Hubspot
                        </span>
                      </CardBody>
                    </Card>
                  </motion.div>
                </div>
              ) : selectedPlatform === 'jira' ? (
                // Formulário Jira
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4 w-[80%]"
                  initial={{ opacity: 0, x: 20 }}
                >
                  <Input
                    classNames={{
                      input: 'text-small',
                      inputWrapper: 'h-12',
                    }}
                    label="ID Hubspot Ticket"
                    placeholder="Digite o ID do ticket do HubSpot"
                    value={hubspotTicketId}
                    variant="bordered"
                    onValueChange={setHubspotTicketId}
                  />
                </motion.div>
              ) : (
                // Mensagem Hubspot
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="text-center py-8"
                  initial={{ opacity: 0, x: 20 }}
                >
                  <div className="mb-4">
                    <SiHubspot className="text-6xl text-orange-600 mx-auto mb-4" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Em breve
                  </h3>
                  <p className="text-foreground/70">
                    A integração com HubSpot estará disponível em breve.
                  </p>
                </motion.div>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-center gap-2">
              {!selectedPlatform ? (
                <Button
                  color="danger"
                  variant="flat"
                  onPress={handleModalClose}
                >
                  Cancelar
                </Button>
              ) : selectedPlatform === 'jira' ? (
                <div className="flex flex-wrap gap-4 items-center mt-10 mb-4">
                  <Button
                    color="primary"
                    isDisabled={!hubspotTicketId.trim()}
                    variant="faded"
                    onPress={handleStartReport}
                  >
                    Iniciar Report
                  </Button>
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={handleModalClose}
                  >
                    Cancelar
                  </Button>
                  <Button
                    color="success"
                    isDisabled={!hubspotTicketId.trim()}
                    onPress={handleCreateTicket}
                  >
                    Criar Ticket
                  </Button>
                </div>
              ) : (
                <Button
                  color="danger"
                  variant="flat"
                  onPress={handleModalClose}
                >
                  Fechar
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
