export type Platform = 'N8N' | 'Jira' | 'Hubspot' | 'Backoffice' | 'Google Workspace';

export type TeamMember = 'Guilherme Souza' | 'Felipe Braat' | 'Tiago Triani';

export interface Project {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  platforms: Platform[];
  responsible: TeamMember;
  imageUrl?: string;
  startDate: string;
  estimatedEndDate: string;
  status: 'planning' | 'development' | 'testing' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high';
}

export interface ProjectsResponse {
  projects: Project[];
  lastUpdated: string;
}