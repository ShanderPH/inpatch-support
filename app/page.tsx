'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiTrendingUp, FiUsers, FiActivity } from 'react-icons/fi';
import { Button } from '@heroui/button';
import { Toaster } from 'react-hot-toast';

import { Project } from '@/types/project';
import { ProjectCard } from '@/components/project-card';
import { ProjectFilters } from '@/components/project-filters';
import { ProjectDetailModal } from '@/components/project-detail-modal';
import { ErrorBoundary, ProjectErrorFallback } from '@/components/error-boundary';
import { TrelloSetupGuide } from '@/components/trello-setup-guide';
import { title, subtitle } from '@/components/primitives';
import { useProjectStore } from '@/lib/store';

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    loading,
    error,
    lastUpdated,
    fetchProjects,
    refreshProjects,
    getFilteredProjects,
    getProjectStats,
  } = useProjectStore();

  const filteredProjects = getFilteredProjects();
  const stats = getProjectStats();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleRefresh = async () => {
    await refreshProjects();
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  // Show Trello setup guide if credentials are missing
  if (error && error.includes('Trello API credentials not configured')) {
    return (
      <ErrorBoundary fallback={ProjectErrorFallback}>
        <div className="min-h-screen py-8">
          <Toaster position="top-right" />
          <TrelloSetupGuide />
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return <ProjectErrorFallback error={new Error(error)} reset={handleRefresh} />;
  }

  return (
    <ErrorBoundary fallback={ProjectErrorFallback}>
      <div className="min-h-screen py-8">
        <Toaster position="top-right" />
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className={`${title({ size: 'lg' })} mb-4`}>
            <span className="text-primary-600">inPatch</span> Suporte
          </h1>
          <p className={`${subtitle()} max-w-2xl mx-auto`}>
            Acompanhe o desenvolvimento dos principais projetos e automações do time de Suporte da inChurch
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="liquid-glass p-4 text-center">
            <FiActivity className="w-8 h-8 mx-auto mb-2 text-primary-600" />
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-default-600">Total Projetos</div>
          </div>
          <div className="liquid-glass p-4 text-center">
            <FiTrendingUp className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold text-foreground">{stats.inProgress}</div>
            <div className="text-sm text-default-600">Em Desenvolvimento</div>
          </div>
          <div className="liquid-glass p-4 text-center">
            <FiUsers className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
            <div className="text-sm text-default-600">Concluídos</div>
          </div>
          <div className="liquid-glass p-4 text-center">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
              {stats.avgProgress}%
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.avgProgress}%</div>
            <div className="text-sm text-default-600">Progresso Médio</div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <ProjectFilters />
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
        >
          <div className="text-sm text-default-600 order-2 sm:order-1">
            {lastUpdated && `Última atualização: ${lastUpdated}`}
          </div>
          <Button
            color="primary"
            variant="ghost"
            startContent={<FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            isDisabled={loading}
            className="order-1 sm:order-2"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="liquid-glass p-6 h-96 animate-pulse"
              >
                <div className="w-full h-48 bg-default-200 dark:bg-default-800 rounded-lg mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-default-200 dark:bg-default-800 rounded w-3/4" />
                  <div className="h-3 bg-default-200 dark:bg-default-800 rounded w-full" />
                  <div className="h-3 bg-default-200 dark:bg-default-800 rounded w-2/3" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project, index) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                index={index}
                onClick={handleProjectClick}
              />
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum projeto encontrado
            </h3>
            <p className="text-default-600 mb-4">
              Não há projetos disponíveis no momento.
            </p>
            <Button color="primary" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </motion.div>
        )}

        {/* Project Detail Modal */}
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </ErrorBoundary>
  );
}
