'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiTrendingUp, FiUsers, FiActivity } from 'react-icons/fi';
import { Button } from '@heroui/button';
import { Toaster } from 'react-hot-toast';

import { Project } from '@/types/project';
import { ProjectGroup } from '@/components/project-group';
import { ProjectFilters } from '@/components/project-filters';
import { ProjectDetailModal } from '@/components/project-detail-modal';
import {
  ErrorBoundary,
  ProjectErrorFallback,
} from '@/components/error-boundary';
import { TrelloSetupGuide } from '@/components/trello-setup-guide';
import { RealTimeSyncToggle } from '@/components/real-time-sync-toggle';
import {
  ProjectGridSkeleton,
  StatCardSkeleton,
} from '@/components/loading-skeleton';
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
    getGroupedProjects,
    getProjectStats,
  } = useProjectStore();

  const filteredProjects = getFilteredProjects();
  const groupedProjects = getGroupedProjects();
  const stats = getProjectStats();

  // Debug logging
  console.log('🖥️ Page: Component state:', {
    loading,
    error,
    projectsLength: filteredProjects.length,
    groupedCounts: {
      'em-andamento': groupedProjects['em-andamento'].length,
      'a-fazer': groupedProjects['a-fazer'].length,
      concluido: groupedProjects.concluido.length,
    },
    stats,
    lastUpdated,
  });

  useEffect(() => {
    console.log('🚀 Page: useEffect triggered, calling fetchProjects...');
    console.log('🚀 Page: fetchProjects function:', typeof fetchProjects);
    console.log('🚀 Page: Is client side?', typeof window !== 'undefined');

    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      console.log('⚠️ Page: Running on server side, skipping fetchProjects');

      return;
    }

    // Force immediate call using store getter to avoid dependency issues
    const loadData = async () => {
      console.log('🚀 Page: Starting data load...');
      try {
        // Get fresh fetchProjects from store to avoid stale closure
        const store = useProjectStore.getState();

        await store.fetchProjects();
        console.log('🚀 Page: fetchProjects completed');
      } catch (error) {
        console.error('❌ Page: fetchProjects failed:', error);
      }
    };

    loadData();

    // Cleanup real-time sync on unmount
    return () => {
      const store = useProjectStore.getState();

      if (store.isRealTimeSyncActive()) {
        store.stopRealTimeSync();
      }
    };
  }, []); // Empty dependency array for mount-only effect

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
    return (
      <ProjectErrorFallback error={new Error(error)} reset={handleRefresh} />
    );
  }

  return (
    <ErrorBoundary fallback={ProjectErrorFallback}>
      <div className="min-h-screen py-8">
        <Toaster position="top-right" />

        {/* Header */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
        >
          <h1 className={`${title({ size: 'lg' })} mb-4`}>
            <span className="text-primary-600">inPatch</span> Suporte
          </h1>
          <p className={`${subtitle()} max-w-2xl mx-auto`}>
            Acompanhe o desenvolvimento dos principais projetos e automações do
            time de Suporte da inChurch
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))
          ) : (
            <>
              <div className="liquid-glass p-4 text-center hover:scale-105 transition-transform duration-200">
                <FiActivity className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                <div className="text-2xl font-bold text-foreground">
                  {stats.total}
                </div>
                <div className="text-sm text-default-600">Total Projetos</div>
              </div>
              <div className="liquid-glass p-4 text-center hover:scale-105 transition-transform duration-200">
                <FiTrendingUp className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold text-foreground">
                  {stats.inProgress}
                </div>
                <div className="text-sm text-default-600">Em Andamento</div>
              </div>
              <div className="liquid-glass p-4 text-center hover:scale-105 transition-transform duration-200">
                <FiUsers className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-foreground">
                  {stats.completed}
                </div>
                <div className="text-sm text-default-600">Concluídos</div>
              </div>
              <div className="liquid-glass p-4 text-center hover:scale-105 transition-transform duration-200">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {stats.avgProgress}%
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.avgProgress}%
                </div>
                <div className="text-sm text-default-600">Progresso Médio</div>
              </div>
            </>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          animate={{ opacity: 1 }}
          className="mb-8"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ProjectFilters />
        </motion.div>

        {/* Real-time Sync Toggle */}
        <motion.div
          animate={{ opacity: 1 }}
          className="mb-6"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RealTimeSyncToggle />
        </motion.div>

        {/* Controls */}
        <motion.div
          animate={{ opacity: 1 }}
          className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-sm text-default-600 order-2 sm:order-1">
            {lastUpdated && `Última atualização: ${lastUpdated}`}
          </div>
          <Button
            className="order-1 sm:order-2"
            color="primary"
            isDisabled={loading}
            startContent={
              <FiRefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            }
            variant="ghost"
            onClick={handleRefresh}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </motion.div>

        {/* Projects Grouped by Status */}
        {loading ? (
          <ProjectGridSkeleton count={6} />
        ) : (
          <motion.div
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ delay: 0.7 }}
          >
            {/* Em Andamento - Always first */}
            <ProjectGroup
              projects={groupedProjects['em-andamento']}
              status="em-andamento"
              onProjectClick={handleProjectClick}
            />

            {/* A Fazer - Second */}
            <ProjectGroup
              projects={groupedProjects['a-fazer']}
              status="a-fazer"
              onProjectClick={handleProjectClick}
            />

            {/* Concluído - Last */}
            <ProjectGroup
              projects={groupedProjects['concluido']}
              status="concluido"
              onProjectClick={handleProjectClick}
            />
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredProjects.length === 0 && (
          <motion.div
            animate={{ opacity: 1 }}
            className="text-center py-16"
            initial={{ opacity: 0 }}
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
          isOpen={isModalOpen}
          project={selectedProject}
          onClose={handleCloseModal}
        />
      </div>
    </ErrorBoundary>
  );
}
