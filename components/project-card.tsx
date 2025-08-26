'use client';

import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiUser, 
  FiTrendingUp,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiPause
} from 'react-icons/fi';
import { Project, Platform } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  index: number;
  onClick?: (project: Project) => void;
}

const platformColors: Record<Platform, string> = {
  'N8N': 'bg-purple-500/80 text-white',
  'Jira': 'bg-blue-500/80 text-white',
  'Hubspot': 'bg-orange-500/80 text-white',
  'Backoffice': 'bg-green-500/80 text-white',
  'Google Workspace': 'bg-red-500/80 text-white'
};

const priorityColors = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-red-500'
};

const statusIcons = {
  planning: FiClock,
  development: FiTrendingUp,
  testing: FiAlertCircle,
  completed: FiCheckCircle,
  'on-hold': FiPause
};

const statusColors = {
  planning: 'text-blue-500',
  development: 'text-orange-500',
  testing: 'text-yellow-500',
  completed: 'text-green-500',
  'on-hold': 'text-gray-500'
};

export const ProjectCard = ({ project, index, onClick }: ProjectCardProps) => {
  const StatusIcon = statusIcons[project.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group cursor-pointer"
      onClick={() => onClick?.(project)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(project);
        }
      }}
      aria-label={`Ver detalhes do projeto ${project.title}`}
    >
      <div className="liquid-glass hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 p-6 h-full focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:ring-offset-background">
        {/* Project Image */}
        <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-lg mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute top-3 right-3">
            <div className={`w-3 h-3 rounded-full ${priorityColors[project.priority]} bg-current animate-pulse`} />
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
            <StatusIcon className={`w-4 h-4 ${statusColors[project.status]}`} />
            <span className="text-sm font-medium capitalize">{project.status}</span>
          </div>
        </div>

        {/* Project Info */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary-600 transition-colors">
              {project.title}
            </h3>
            <p className="text-default-600 text-sm leading-relaxed line-clamp-3">
              {project.description}
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-default-700">Progresso</span>
              <span className="text-sm font-bold text-primary-600">{project.progress}%</span>
            </div>
            <div className="w-full bg-default-200 dark:bg-default-800 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${project.progress}%` }}
                transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Platform Badges */}
          <div className="flex flex-wrap gap-2">
            {project.platforms.map((platform, platformIndex) => (
              <motion.span
                key={platform}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + platformIndex * 0.05 + 0.5 }}
                className={`px-2 py-1 rounded-md text-xs font-medium ${platformColors[platform]} backdrop-blur-sm`}
              >
                {platform}
              </motion.span>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-divider flex justify-between items-center">
            <div className="flex items-center gap-2 text-default-600">
              <FiUser className="w-4 h-4" />
              <span className="text-sm">{project.responsible}</span>
            </div>
            <div className="flex items-center gap-2 text-default-600">
              <FiCalendar className="w-4 h-4" />
              <span className="text-sm">
                {new Date(project.estimatedEndDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};