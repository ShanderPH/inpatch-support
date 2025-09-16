import { createClient } from '@supabase/supabase-js';

import { Project } from '@/types/project';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if credentials are provided
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Database types
export interface DatabaseProject {
  id: string;
  title: string;
  description: string;
  progress: number;
  platforms: string[];
  responsible: string;
  image_url?: string;
  start_date: string;
  estimated_end_date: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  trello_card_id?: string;
}

// API functions
export const projectsApi = {
  // Fetch all projects
  async getAll(): Promise<Project[]> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return data?.map(transformDatabaseProject) || [];
  },

  // Get project by ID
  async getById(id: string): Promise<Project | null> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }

    return data ? transformDatabaseProject(data) : null;
  },

  // Create new project
  async create(project: Omit<Project, 'id'>): Promise<Project> {
    if (!supabase) throw new Error('Supabase not configured');

    const dbProject = transformToDatabase(project);

    const { data, error } = await supabase
      .from('projects')
      .insert([dbProject])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return transformDatabaseProject(data);
  },

  // Update project
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (!supabase) throw new Error('Supabase not configured');

    const dbUpdates = transformToDatabase(updates);

    const { data, error } = await supabase
      .from('projects')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return transformDatabaseProject(data);
  },

  // Delete project
  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) throw new Error(error.message);
  },

  // Sync with Trello
  async syncFromTrello(trelloData: any[]): Promise<Project[]> {
    if (!supabase) throw new Error('Supabase not configured');

    const projects = trelloData.map(card => ({
      id: card.id,
      title: card.name,
      description: card.desc || '',
      progress: calculateProgressFromTrello(card),
      platforms: extractPlatformsFromTrello(card),
      responsible: extractResponsibleFromTrello(card),
      startDate: card.dateLastActivity || new Date().toISOString(),
      estimatedEndDate:
        card.due ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: mapTrelloStatusToProject(card.list?.name),
      priority: extractPriorityFromTrello(card),
      trelloCardId: card.id,
    }));

    // Upsert projects (insert or update)
    const { data, error } = await supabase
      .from('projects')
      .upsert(
        projects.map(p => transformToDatabase(p as any)),
        { onConflict: 'trello_card_id' }
      )
      .select();

    if (error) throw new Error(error.message);

    return data?.map(transformDatabaseProject) || [];
  },
};

// Transform functions
function transformDatabaseProject(dbProject: DatabaseProject): Project {
  return {
    id: dbProject.id,
    title: dbProject.title,
    description: dbProject.description,
    progress: dbProject.progress,
    platforms: dbProject.platforms as any[],
    responsible: dbProject.responsible.split(', ').filter(Boolean) as any,
    imageUrl: dbProject.image_url,
    startDate: dbProject.start_date,
    estimatedEndDate: dbProject.estimated_end_date,
    status: dbProject.status as any,
    priority: dbProject.priority as any,
  };
}

function transformToDatabase(
  project: Partial<Project>
): Partial<DatabaseProject> {
  return {
    ...(project.id && { id: project.id }),
    ...(project.title && { title: project.title }),
    ...(project.description && { description: project.description }),
    ...(project.progress !== undefined && { progress: project.progress }),
    ...(project.platforms && { platforms: project.platforms }),
    ...(project.responsible && { responsible: project.responsible.join(', ') }),
    ...(project.imageUrl && { image_url: project.imageUrl }),
    ...(project.startDate && { start_date: project.startDate }),
    ...(project.estimatedEndDate && {
      estimated_end_date: project.estimatedEndDate,
    }),
    ...(project.status && { status: project.status }),
    ...(project.priority && { priority: project.priority }),
  };
}

// Trello helper functions
function calculateProgressFromTrello(card: any): number {
  if (card.badges?.checkItems && card.badges?.checkItemsChecked) {
    return Math.round(
      (card.badges.checkItemsChecked / card.badges.checkItems) * 100
    );
  }

  // Fallback based on list position
  const listName = card.list?.name?.toLowerCase() || '';

  if (listName.includes('planning')) return 10;
  if (listName.includes('development') || listName.includes('doing')) return 50;
  if (listName.includes('testing') || listName.includes('review')) return 80;
  if (listName.includes('done') || listName.includes('completed')) return 100;

  return 0;
}

function extractPlatformsFromTrello(card: any): string[] {
  const labels = card.labels || [];
  const platforms: string[] = [];

  labels.forEach((label: any) => {
    const name = label.name?.toLowerCase() || '';

    if (name.includes('n8n')) platforms.push('N8N');
    if (name.includes('jira')) platforms.push('Jira');
    if (name.includes('hubspot')) platforms.push('Hubspot');
    if (name.includes('backoffice')) platforms.push('Backoffice');
    if (name.includes('google') || name.includes('workspace'))
      platforms.push('Google Workspace');
  });

  return platforms.length > 0 ? platforms : ['Backoffice'];
}

function extractResponsibleFromTrello(card: any): string {
  const members = card.members || [];

  if (members.length > 0) {
    const member = members[0];
    const fullName = member.fullName || member.username || '';

    // Map Trello users to team members
    if (fullName.toLowerCase().includes('guilherme')) return 'Guilherme Souza';
    if (fullName.toLowerCase().includes('felipe')) return 'Felipe Braat';
    if (fullName.toLowerCase().includes('tiago')) return 'Tiago Triani';
  }

  return 'Guilherme Souza'; // Default
}

function mapTrelloStatusToProject(listName?: string): string {
  if (!listName) return 'planning';

  const name = listName.toLowerCase();

  if (name.includes('planning') || name.includes('backlog')) return 'planning';
  if (
    name.includes('development') ||
    name.includes('doing') ||
    name.includes('progress')
  )
    return 'development';
  if (name.includes('testing') || name.includes('review')) return 'testing';
  if (name.includes('done') || name.includes('completed')) return 'completed';
  if (name.includes('hold') || name.includes('paused')) return 'on-hold';

  return 'planning';
}

function extractPriorityFromTrello(card: any): string {
  const labels = card.labels || [];

  for (const label of labels) {
    const name = label.name?.toLowerCase() || '';
    const color = label.color?.toLowerCase() || '';

    if (name.includes('high') || name.includes('urgent') || color === 'red')
      return 'high';
    if (name.includes('medium') || color === 'yellow') return 'medium';
    if (name.includes('low') || color === 'green') return 'low';
  }

  return 'medium'; // Default
}
