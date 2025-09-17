import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { Project } from '@/types/project';
import { syncOrchestrator } from '@/lib/services/sync-orchestrator-v2';

interface ProjectStore {
  // State
  projects: Project[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  searchQuery: string;
  statusFilter: string;
  platformFilter: string;
  responsibleFilter: string;

  // Actions
  setProjects: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (timestamp: string) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setPlatformFilter: (platform: string) => void;
  setResponsibleFilter: (responsible: string) => void;

  // Computed getters
  getFilteredProjects: () => Project[];
  getGroupedProjects: () => {
    'em-andamento': Project[];
    'a-fazer': Project[];
    concluido: Project[];
  };
  getProjectById: (id: string) => Project | undefined;
  getProjectStats: () => {
    total: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  };

  // API actions
  fetchProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  clearFilters: () => void;
  startRealTimeSync: () => void;
  stopRealTimeSync: () => void;
  isRealTimeSyncActive: () => boolean;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        projects: [],
        loading: false,
        error: null,
        lastUpdated: null,
        searchQuery: '',
        statusFilter: 'all',
        platformFilter: 'all',
        responsibleFilter: 'all',

        // Actions
        setProjects: projects => set({ projects, error: null }),
        setLoading: loading => set({ loading }),
        setError: error => set({ error, loading: false }),
        setLastUpdated: timestamp => set({ lastUpdated: timestamp }),
        setSearchQuery: searchQuery => set({ searchQuery }),
        setStatusFilter: statusFilter => set({ statusFilter }),
        setPlatformFilter: platformFilter => set({ platformFilter }),
        setResponsibleFilter: responsibleFilter => set({ responsibleFilter }),

        // Computed getters
        getFilteredProjects: () => {
          const {
            projects,
            searchQuery,
            statusFilter,
            platformFilter,
            responsibleFilter,
          } = get();

          return projects.filter(project => {
            const matchesSearch =
              searchQuery === '' ||
              project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              project.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            const matchesStatus =
              statusFilter === 'all' || project.status === statusFilter;

            const matchesPlatform =
              platformFilter === 'all' ||
              project.platforms.includes(platformFilter as any);

            const matchesResponsible =
              responsibleFilter === 'all' ||
              project.responsible.some(member =>
                member.includes(responsibleFilter)
              );

            return (
              matchesSearch &&
              matchesStatus &&
              matchesPlatform &&
              matchesResponsible
            );
          });
        },

        // New grouped and sorted projects getter
        getGroupedProjects: () => {
          const filteredProjects = get().getFilteredProjects();

          console.log(
            '📋 Store: Grouping',
            filteredProjects.length,
            'filtered projects'
          );
          console.log(
            'Projects by status:',
            filteredProjects.reduce(
              (acc, p) => {
                acc[p.status] = (acc[p.status] || 0) + 1;

                return acc;
              },
              {} as Record<string, number>
            )
          );

          // Sort projects by date descending within each group
          const sortByDateDesc = (projects: Project[]) => {
            return projects.sort((a, b) => {
              const dateA = new Date(
                a.estimatedEndDate || a.startDate
              ).getTime();
              const dateB = new Date(
                b.estimatedEndDate || b.startDate
              ).getTime();

              return dateB - dateA; // Descending order
            });
          };

          // Group projects by status
          const grouped = {
            'em-andamento': sortByDateDesc(
              filteredProjects.filter(p => p.status === 'em-andamento')
            ),
            'a-fazer': sortByDateDesc(
              filteredProjects.filter(p => p.status === 'a-fazer')
            ),
            concluido: sortByDateDesc(
              filteredProjects.filter(p => p.status === 'concluido')
            ),
          };

          console.log('📋 Store: Grouped projects:', {
            'em-andamento': grouped['em-andamento'].length,
            'a-fazer': grouped['a-fazer'].length,
            concluido: grouped.concluido.length,
          });

          return grouped;
        },

        getProjectById: id => {
          const { projects } = get();

          return projects.find(project => project.id === id);
        },

        getProjectStats: () => {
          const { projects } = get();
          const total = projects.length;
          const inProgress = projects.filter(
            p => p.status === 'em-andamento'
          ).length;
          const completed = projects.filter(
            p => p.status === 'concluido'
          ).length;
          const avgProgress =
            total > 0
              ? Math.round(
                  projects.reduce((acc, p) => acc + p.progress, 0) / total
                )
              : 0;

          const stats = { total, inProgress, completed, avgProgress };

          console.log('📊 Store: Project stats:', stats);

          return stats;
        },

        // API actions
        fetchProjects: async () => {
          console.log('🚀 Store: Starting fetchProjects...');
          set({ loading: true, error: null });

          try {
            console.log(
              '🔄 Store: Calling syncOrchestrator.performFullSync()...'
            );

            // Subscribe to real-time updates first
            console.log('📡 Store: Subscribing to SyncOrchestrator updates...');
            syncOrchestrator.subscribe((projects: Project[]) => {
              console.log(
                '📡 Store: Received update from SyncOrchestrator:',
                projects.length,
                'projects'
              );
              set({
                projects,
                lastUpdated: new Date().toLocaleString('pt-BR'),
                error: null,
                loading: false,
              });
            });

            // Use new SyncOrchestrator for enhanced sync
            const result = await syncOrchestrator.performFullSync();

            console.log('✅ Store: Sync completed successfully!');
            console.log('Result:', {
              projectCount: result.projects.length,
              metrics: result.metrics,
              sampleProject: result.projects[0],
            });

            // Set data directly AND through subscription
            set({
              projects: result.projects,
              loading: false,
              lastUpdated: new Date().toLocaleString('pt-BR'),
              error: null,
            });

            console.log(
              '💾 Store: State updated with',
              result.projects.length,
              'projects'
            );
          } catch (error) {
            console.error('❌ Store: Sync failed with error:', error);
            // If sync fails, show empty state with error message
            set({
              projects: [],
              error:
                error instanceof Error
                  ? error.message
                  : 'Erro ao carregar projetos',
              loading: false,
            });
          }
        },

        refreshProjects: async () => {
          const { fetchProjects } = get();

          await fetchProjects();
        },

        clearFilters: () =>
          set({
            searchQuery: '',
            statusFilter: 'all',
            platformFilter: 'all',
            responsibleFilter: 'all',
          }),

        startRealTimeSync: () => {
          // Subscribe to SyncOrchestrator updates
          syncOrchestrator.subscribe((projects: Project[]) => {
            set({
              projects,
              lastUpdated: new Date().toLocaleString('pt-BR'),
              error: null,
            });
          });
        },

        stopRealTimeSync: () => {
          // Real-time sync is managed by SyncOrchestrator subscriptions
          // Individual unsubscribe would need to be implemented
        },

        isRealTimeSyncActive: () => {
          // Check if SyncOrchestrator has active subscriptions
          const status = syncOrchestrator.getSystemStatus();

          return status.orchestrator.subscribersCount > 0;
        },
      }),
      {
        name: 'project-store',
        partialize: state => ({
          projects: state.projects,
          lastUpdated: state.lastUpdated,
        }),
      }
    ),
    { name: 'project-store' }
  )
);
