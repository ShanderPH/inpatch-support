'use client';

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/modal';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiUser,
  FiTrendingUp,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiPause,
  FiExternalLink,
} from 'react-icons/fi';
import { Project, Platform } from '@/types/project';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

const platformColors: Record<Platform, string> = {
  'N8N': 'bg-purple-500/80 text-white',
  'Jira': 'bg-blue-500/80 text-white',
  'Hubspot': 'bg-orange-500/80 text-white',
  'Backoffice': 'bg-green-500/80 text-white',
  'Google Workspace': 'bg-red-500/80 text-white'
};

const priorityColors = {
  low: 'text-green-500 bg-green-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  high: 'text-red-500 bg-red-500/10'
};

const statusIcons = {
  planning: FiClock,
  development: FiTrendingUp,
  testing: FiAlertCircle,
  completed: FiCheckCircle,
  'on-hold': FiPause
};

const statusColors = {
  planning: 'text-blue-500 bg-blue-500/10',
  development: 'text-orange-500 bg-orange-500/10',
  testing: 'text-yellow-500 bg-yellow-500/10',
  completed: 'text-green-500 bg-green-500/10',
  'on-hold': 'text-gray-500 bg-gray-500/10'
};

const statusLabels = {
  planning: 'Planejamento',
  development: 'Desenvolvimento',
  testing: 'Testes',
  completed: 'Concluído',
  'on-hold': 'Pausado'
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
};

export const ProjectDetailModal = ({ project, isOpen, onClose }: ProjectDetailModalProps) => {
  if (!project) return null;

  const StatusIcon = statusIcons[project.status];
  const startDate = new Date(project.startDate).toLocaleDateString('pt-BR');
  const endDate = new Date(project.estimatedEndDate).toLocaleDateString('pt-BR');
  const daysRemaining = Math.ceil(
    (new Date(project.estimatedEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-background/95 backdrop-blur-md",
        backdrop: "bg-black/50",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground pr-4">
                {project.title}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Chip
                  size="sm"
                  variant="flat"
                  className={statusColors[project.status]}
                  startContent={<StatusIcon className="w-3 h-3" />}
                >
                  {statusLabels[project.status]}
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  className={priorityColors[project.priority]}
                >
                  Prioridade {priorityLabels[project.priority]}
                </Chip>
              </div>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-6">
            {/* Project Image */}
            <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex justify-between items-end">
                  <div className="text-white">
                    <div className="text-2xl font-bold">{project.progress}%</div>
                    <div className="text-sm opacity-90">Progresso</div>
                  </div>
                  <div className="text-white text-right">
                    <div className="text-sm opacity-90">
                      {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Prazo vencido'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-default-700">Progresso do Projeto</span>
                <span className="text-sm font-bold text-primary-600">{project.progress}%</span>
              </div>
              <div className="w-full bg-default-200 dark:bg-default-800 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Descrição</h3>
              <p className="text-default-600 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Platform Badges */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Plataformas</h3>
              <div className="flex flex-wrap gap-2">
                {project.platforms.map((platform, index) => (
                  <motion.span
                    key={platform}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${platformColors[platform]} backdrop-blur-sm`}
                  >
                    {platform}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="liquid-glass p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FiUser className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-foreground">Responsável</span>
                </div>
                <p className="text-default-600 ml-8">{project.responsible}</p>
              </div>

              <div className="liquid-glass p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FiCalendar className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-foreground">Data de Início</span>
                </div>
                <p className="text-default-600 ml-8">{startDate}</p>
              </div>

              <div className="liquid-glass p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FiClock className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-foreground">Prazo Estimado</span>
                </div>
                <p className="text-default-600 ml-8">{endDate}</p>
              </div>

              <div className="liquid-glass p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FiTrendingUp className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-foreground">Status</span>
                </div>
                <p className="text-default-600 ml-8">{statusLabels[project.status]}</p>
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            color="default"
            variant="light"
            onPress={onClose}
          >
            Fechar
          </Button>
          <Button
            color="primary"
            startContent={<FiExternalLink className="w-4 h-4" />}
            onPress={() => {
              // TODO: Open Trello card or project management link
              console.log('Open project in external tool');
            }}
          >
            Ver no Trello
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
