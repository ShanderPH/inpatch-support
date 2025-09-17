'use client';

import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi';

import {
  Project,
  Platform,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/types/project';

interface ProjectCardProps {
  project: Project;
  index: number;
  onClick?: (project: Project) => void;
}

const platformColors: Record<Platform, string> = {
  N8N: 'bg-purple-500/80 text-white',
  Jira: 'bg-blue-500/80 text-white',
  Hubspot: 'bg-orange-500/80 text-white',
  Backoffice: 'bg-green-500/80 text-white',
  'Google Workspace': 'bg-red-500/80 text-white',
};

const priorityColors = {
  low: 'text-green-500 bg-green-500',
  medium: 'text-yellow-500 bg-yellow-500',
  high: 'text-red-500 bg-red-500',
};

const statusIcons = {
  'a-fazer': FiClock,
  'em-andamento': FiTrendingUp,
  concluido: FiCheckCircle,
};

const statusColors = {
  'a-fazer': 'text-blue-500',
  'em-andamento': 'text-orange-500',
  concluido: 'text-green-500',
};

export const ProjectCard = ({ project, index, onClick }: ProjectCardProps) => {
  const StatusIcon = statusIcons[project.status] || FiClock;

  // Validate project data
  if (!project || !project.id) {
    console.warn('⚠️ ProjectCard: Invalid project data', project);

    return null;
  }

  // Ensure required fields have fallbacks
  const safeProject = {
    ...project,
    title: project.title || 'Projeto sem título',
    description: project.description || 'Sem descrição',
    progress: Math.max(0, Math.min(100, project.progress || 0)),
    platforms: project.platforms || ['Backoffice'],
    responsible: project.responsible || ['Guilherme Souza'],
    labels: project.labels || [],
    priority: project.priority || 'medium',
    status: project.status || 'a-fazer',
  };

  console.log('📋 ProjectCard: Rendering project', {
    id: safeProject.id,
    title: safeProject.title,
    status: safeProject.status,
    platforms: safeProject.platforms,
    responsible: safeProject.responsible,
  });

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      aria-label={`Ver detalhes do projeto ${safeProject.title}`}
      className="group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      role="button"
      tabIndex={0}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={() => onClick?.(safeProject)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(safeProject);
        }
      }}
    >
      <div className="liquid-glass hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 p-6 h-full focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:ring-offset-background">
        {/* Project Image */}
        <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-lg mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div
            className="absolute top-3 right-3"
            title={`Prioridade: ${PRIORITY_LABELS[safeProject.priority]}`}
          >
            <div
              className={`w-3 h-3 rounded-full ${priorityColors[safeProject.priority]} animate-pulse shadow-lg`}
            />
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
            <StatusIcon
              className={`w-4 h-4 ${statusColors[safeProject.status]} drop-shadow-sm`}
            />
            <span className="text-sm font-medium drop-shadow-sm">
              {STATUS_LABELS[safeProject.status]}
            </span>
          </div>
        </div>

        {/* Project Info */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary-600 transition-colors">
              {safeProject.title}
            </h3>
            <p className="text-default-600 text-sm leading-relaxed line-clamp-3">
              {safeProject.description}
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-default-700">
                Progresso
              </span>
              <span className="text-sm font-bold text-primary-600">
                {safeProject.progress}%
              </span>
            </div>
            <div className="w-full bg-default-200 dark:bg-default-800 rounded-full h-2 overflow-hidden">
              <motion.div
                animate={{ width: `${safeProject.progress}%` }}
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                initial={{ width: 0 }}
                transition={{
                  delay: index * 0.1 + 0.3,
                  duration: 1,
                  ease: 'easeOut',
                }}
              />
            </div>
          </div>

          {/* Platform Badges */}
          <div className="flex flex-wrap gap-2">
            {safeProject.platforms.map((platform, platformIndex) => (
              <motion.span
                key={platform}
                animate={{ opacity: 1, scale: 1 }}
                className={`px-2 py-1 rounded-md text-xs font-medium ${platformColors[platform]} backdrop-blur-sm`}
                initial={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.1 + platformIndex * 0.05 + 0.5 }}
              >
                {platform}
              </motion.span>
            ))}
          </div>

          {/* Members */}
          <div className="flex flex-wrap gap-1 mb-3">
            {safeProject.responsible.map((member, memberIndex) => {
              // Get initials for avatar
              const initials = member
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase();
              const colors = [
                'bg-blue-500 text-white',
                'bg-green-500 text-white',
                'bg-purple-500 text-white',
                'bg-orange-500 text-white',
                'bg-pink-500 text-white',
              ];
              const colorClass = colors[memberIndex % colors.length];

              return (
                <motion.div
                  key={member}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-default-100 dark:bg-default-800 px-2 py-1 rounded-md hover:bg-default-200 dark:hover:bg-default-700 transition-colors"
                  initial={{ opacity: 0, scale: 0.8 }}
                  title={member}
                  transition={{ delay: index * 0.1 + memberIndex * 0.05 + 0.6 }}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${colorClass}`}
                  >
                    {initials}
                  </div>
                  <span className="text-xs text-default-700 font-medium">
                    {member.split(' ')[0]}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Labels */}
          {safeProject.labels && safeProject.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {safeProject.labels.slice(0, 3).map((label, labelIndex) => (
                <motion.span
                  key={`${label}-${labelIndex}`}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-2 py-1 rounded-md text-xs font-medium bg-default-200 dark:bg-default-700 text-default-700 dark:text-default-300 hover:bg-default-300 dark:hover:bg-default-600 transition-colors"
                  initial={{ opacity: 0, scale: 0.8 }}
                  title={label}
                  transition={{ delay: index * 0.1 + labelIndex * 0.05 + 0.7 }}
                >
                  {label.length > 12 ? `${label.substring(0, 12)}...` : label}
                </motion.span>
              ))}
              {safeProject.labels.length > 3 && (
                <span
                  className="px-2 py-1 rounded-md text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                  title={`+${safeProject.labels.length - 3} mais labels`}
                >
                  +{safeProject.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-divider flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-default-600" />
              {(() => {
                const dueDate = new Date(safeProject.estimatedEndDate);
                const today = new Date();
                const isOverdue = dueDate < today;

                if (isOverdue) {
                  return (
                    <div className="relative">
                      <div
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white text-xs font-semibold shadow-lg transform hover:scale-105 transition-transform duration-200"
                        style={{
                          boxShadow:
                            'inset 2px 2px 5px rgba(255,255,255,0.2), inset -2px -2px 5px rgba(0,0,0,0.3), 0 4px 15px rgba(239, 68, 68, 0.4)',
                          background:
                            'linear-gradient(145deg, #ef4444, #dc2626)',
                        }}
                        title={`Vencido em ${dueDate.toLocaleDateString('pt-BR')}`}
                      >
                        Vencido
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
                    </div>
                  );
                }

                return (
                  <span className="text-sm text-default-600">
                    {dueDate.toLocaleDateString('pt-BR')}
                  </span>
                );
              })()}
            </div>
            <div
              className="text-xs text-default-500"
              title={`Prioridade: ${PRIORITY_LABELS[safeProject.priority]}`}
            >
              {PRIORITY_LABELS[safeProject.priority]}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
