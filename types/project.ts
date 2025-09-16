// Prisma-compatible types (usando mock temporário)
import type {
  Project as PrismaProject,
  SyncHistory,
} from '@/lib/types/prisma-mock';

// Legacy types for backward compatibility
export type Platform =
  | 'N8N'
  | 'Jira'
  | 'Hubspot'
  | 'Backoffice'
  | 'Google Workspace';

export type TeamMember = 'Guilherme Souza' | 'Felipe Braat' | 'Tiago Triani';
export type ProjectStatus = 'a-fazer' | 'em-andamento' | 'concluido';
export type ProjectPriority = 'low' | 'medium' | 'high';

// Enhanced Project interface with Prisma compatibility
export interface Project {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  platforms: Platform[];
  responsible: TeamMember[];
  imageUrl?: string;
  startDate: string;
  estimatedEndDate: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  trelloCardId?: string;
  labels?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Prisma-enhanced types
export type ProjectWithHistory = PrismaProject & {
  syncHistory: SyncHistory[];
};

export type CreateProjectData = Omit<
  PrismaProject,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateProjectData = Partial<CreateProjectData>;

// Status mapping for consistency
export const STATUS_MAPPING = {
  planning: 'a-fazer',
  backlog: 'a-fazer',
  'to-do': 'a-fazer',
  fazer: 'a-fazer',
  development: 'em-andamento',
  doing: 'em-andamento',
  progress: 'em-andamento',
  andamento: 'em-andamento',
  desenvolvimento: 'em-andamento',
  done: 'concluido',
  completed: 'concluido',
  concluido: 'concluido',
  finalizado: 'concluido',
} as const;

// Status labels for display
export const STATUS_LABELS = {
  'a-fazer': 'A Fazer',
  'em-andamento': 'Em Andamento',
  concluido: 'Concluído',
} as const;

// Priority labels for display
export const PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
} as const;

export interface ProjectsResponse {
  projects: Project[];
  lastUpdated: string;
}
