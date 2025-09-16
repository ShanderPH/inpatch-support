'use client';

import { motion } from 'framer-motion';
import { FiTrendingUp, FiClock, FiCheckCircle } from 'react-icons/fi';

import { ProjectCard } from './project-card';

import { Project, STATUS_LABELS } from '@/types/project';

interface ProjectGroupProps {
  status: 'em-andamento' | 'a-fazer' | 'concluido';
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

const statusIcons = {
  'em-andamento': FiTrendingUp,
  'a-fazer': FiClock,
  concluido: FiCheckCircle,
};

const statusColors = {
  'em-andamento': 'from-orange-500 to-orange-600',
  'a-fazer': 'from-blue-500 to-blue-600',
  concluido: 'from-green-500 to-green-600',
};

const statusBgColors = {
  'em-andamento': 'bg-orange-500/10 border-orange-500/20',
  'a-fazer': 'bg-blue-500/10 border-blue-500/20',
  concluido: 'bg-green-500/10 border-green-500/20',
};

export const ProjectGroup = ({
  status,
  projects,
  onProjectClick,
}: ProjectGroupProps) => {
  if (projects.length === 0) return null;

  const StatusIcon = statusIcons[status];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-12"
      initial={{ opacity: 0, y: 20 }}
    >
      {/* Group Header */}
      <div
        className={`liquid-glass p-4 mb-6 border ${statusBgColors[status]} backdrop-blur-sm`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg bg-gradient-to-r ${statusColors[status]} text-white shadow-lg`}
            >
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {STATUS_LABELS[status]}
              </h2>
              <p className="text-sm text-default-600">
                {projects.length}{' '}
                {projects.length === 1 ? 'projeto' : 'projetos'}
              </p>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full bg-gradient-to-r ${statusColors[status]} text-white font-semibold text-sm shadow-lg`}
          >
            {projects.length}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            index={index}
            project={project}
            onClick={onProjectClick}
          />
        ))}
      </div>
    </motion.div>
  );
};
