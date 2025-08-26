import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Project, ProjectsResponse } from '@/types/project';

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
        setProjects: (projects) => set({ projects, error: null }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error, loading: false }),
        setLastUpdated: (timestamp) => set({ lastUpdated: timestamp }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),
        setStatusFilter: (statusFilter) => set({ statusFilter }),
        setPlatformFilter: (platformFilter) => set({ platformFilter }),
        setResponsibleFilter: (responsibleFilter) => set({ responsibleFilter }),

        // Computed getters
        getFilteredProjects: () => {
          const { projects, searchQuery, statusFilter, platformFilter, responsibleFilter } = get();
          
          return projects.filter((project) => {
            const matchesSearch = searchQuery === '' || 
              project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              project.description.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
            
            const matchesPlatform = platformFilter === 'all' || 
              project.platforms.includes(platformFilter as any);
            
            const matchesResponsible = responsibleFilter === 'all' || 
              project.responsible === responsibleFilter;
            
            return matchesSearch && matchesStatus && matchesPlatform && matchesResponsible;
          });
        },

        getProjectById: (id) => {
          const { projects } = get();
          return projects.find(project => project.id === id);
        },

        getProjectStats: () => {
          const { projects } = get();
          const total = projects.length;
          const inProgress = projects.filter(p => p.status === 'development').length;
          const completed = projects.filter(p => p.status === 'completed').length;
          const avgProgress = total > 0 
            ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / total)
            : 0;
          
          return { total, inProgress, completed, avgProgress };
        },

        // API actions
        fetchProjects: async () => {
          set({ loading: true, error: null });
          try {
            // Try to sync from Trello first
            const { trelloSyncService } = await import('@/lib/services/trello-sync');
            const projects = await trelloSyncService.syncFromTrello();
            
            set({ 
              projects, 
              loading: false, 
              lastUpdated: new Date().toLocaleString('pt-BR'),
              error: null 
            });
          } catch (error) {
            // If Trello fails, show empty state with error message
            console.error('Failed to load projects from Trello:', error);
            set({ 
              projects: [],
              error: error instanceof Error ? error.message : 'Erro ao carregar projetos do Trello',
              loading: false 
            });
          }
        },

        refreshProjects: async () => {
          const { fetchProjects } = get();
          await fetchProjects();
        },

        clearFilters: () => set({
          searchQuery: '',
          statusFilter: 'all',
          platformFilter: 'all',
          responsibleFilter: 'all'
        })
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          projects: state.projects,
          lastUpdated: state.lastUpdated,
        }),
      }
    ),
    { name: 'project-store' }
  )
);
