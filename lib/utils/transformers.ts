/**
 * Transformadores de dados para migração Trello → Prisma
 * Converte dados do Trello para formato compatível com Prisma
 */

import type {
  Project,
  Platform,
  TeamMember,
  ProjectStatus,
  ProjectPriority,
} from '@/types/project';

// Tipos temporários até o Prisma Client ser gerado
export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dateLastActivity: string;
  list: {
    id: string;
    name: string;
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  members: Array<{
    id: string;
    fullName: string;
    username: string;
  }>;
  checklists: Array<{
    id: string;
    name: string;
    checkItems: Array<{
      id: string;
      name: string;
      state: 'complete' | 'incomplete';
    }>;
  }>;
}

export interface PrismaProjectData {
  title: string;
  description: string | null;
  progress: number;
  platforms: Platform[];
  responsible: TeamMember[];
  imageUrl: string | null;
  startDate: Date;
  estimatedEndDate: Date;
  status: ProjectStatus;
  priority: ProjectPriority;
  trelloCardId: string;
  labels: string[];
}

/**
 * Mapeia status do Trello para status do sistema
 */
export function mapTrelloStatusToProject(listName: string): ProjectStatus {
  const normalizedName = listName.toLowerCase().trim();

  const statusMapping: Record<string, ProjectStatus> = {
    planning: 'a-fazer',
    backlog: 'a-fazer',
    'to-do': 'a-fazer',
    fazer: 'a-fazer',
    'a fazer': 'a-fazer',
    development: 'em-andamento',
    doing: 'em-andamento',
    progress: 'em-andamento',
    andamento: 'em-andamento',
    'em andamento': 'em-andamento',
    desenvolvimento: 'em-andamento',
    done: 'concluido',
    completed: 'concluido',
    concluido: 'concluido',
    concluído: 'concluido',
    finalizado: 'concluido',
  };

  return statusMapping[normalizedName] || 'a-fazer';
}

/**
 * Mapeia membros do Trello para TeamMembers
 */
export function mapTrelloMembersToTeam(
  trelloMembers: TrelloCard['members']
): TeamMember[] {
  const memberMapping: Record<string, TeamMember> = {
    guilherme: 'Guilherme Souza',
    gui: 'Guilherme Souza',
    'guilherme souza': 'Guilherme Souza',
    felipe: 'Felipe Braat',
    braat: 'Felipe Braat',
    'felipe braat': 'Felipe Braat',
    tiago: 'Tiago Triani',
    triani: 'Tiago Triani',
    'tiago triani': 'Tiago Triani',
  };

  const mappedMembers: TeamMember[] = [];

  for (const member of trelloMembers) {
    const normalizedName = member.fullName.toLowerCase().trim();
    const normalizedUsername = member.username.toLowerCase().trim();

    const mappedMember =
      memberMapping[normalizedName] || memberMapping[normalizedUsername];

    if (mappedMember && !mappedMembers.includes(mappedMember)) {
      mappedMembers.push(mappedMember);
    }
  }

  return mappedMembers.length > 0 ? mappedMembers : ['Guilherme Souza'];
}

/**
 * Mapeia labels do Trello para Platforms
 */
export function mapTrelloLabelsToPlattforms(
  trelloLabels: TrelloCard['labels']
): Platform[] {
  const platformMapping: Record<string, Platform> = {
    n8n: 'N8N',
    jira: 'Jira',
    hubspot: 'Hubspot',
    backoffice: 'Backoffice',
    'back office': 'Backoffice',
    'google workspace': 'Google Workspace',
    google: 'Google Workspace',
    workspace: 'Google Workspace',
  };

  const mappedPlatforms: Platform[] = [];

  for (const label of trelloLabels) {
    const normalizedName = label.name.toLowerCase().trim();
    const mappedPlatform = platformMapping[normalizedName];

    if (mappedPlatform && !mappedPlatforms.includes(mappedPlatform)) {
      mappedPlatforms.push(mappedPlatform);
    }
  }

  return mappedPlatforms.length > 0 ? mappedPlatforms : ['Backoffice'];
}

/**
 * Detecta prioridade baseada nas labels do Trello
 */
export function detectPriorityFromLabels(
  trelloLabels: TrelloCard['labels']
): ProjectPriority {
  for (const label of trelloLabels) {
    const normalizedName = label.name.toLowerCase().trim();
    const color = label.color.toLowerCase();

    // Prioridade alta: labels vermelhos ou palavras-chave
    if (
      color === 'red' ||
      normalizedName.includes('high') ||
      normalizedName.includes('urgent') ||
      normalizedName.includes('alta')
    ) {
      return 'high';
    }

    // Prioridade baixa: labels verdes ou palavras-chave
    if (
      color === 'green' ||
      normalizedName.includes('low') ||
      normalizedName.includes('baixa')
    ) {
      return 'low';
    }

    // Prioridade média: labels amarelos ou palavras-chave
    if (
      color === 'yellow' ||
      normalizedName.includes('medium') ||
      normalizedName.includes('média')
    ) {
      return 'medium';
    }
  }

  return 'medium'; // Padrão
}

/**
 * Calcula progresso baseado nos checklists do Trello
 */
export function calculateProgressFromChecklists(
  checklists: TrelloCard['checklists']
): number {
  if (!checklists || checklists.length === 0) {
    return 0;
  }

  let totalItems = 0;
  let completedItems = 0;

  for (const checklist of checklists) {
    for (const item of checklist.checkItems) {
      totalItems++;
      if (item.state === 'complete') {
        completedItems++;
      }
    }
  }

  if (totalItems === 0) return 0;

  return Math.round((completedItems / totalItems) * 100);
}

/**
 * Transforma card do Trello em dados compatíveis com Prisma
 */
export function transformTrelloCardToPrismaProject(
  card: TrelloCard
): PrismaProjectData {
  const progress = calculateProgressFromChecklists(card.checklists);
  const status = mapTrelloStatusToProject(card.list.name);
  const platforms = mapTrelloLabelsToPlattforms(card.labels);
  const responsible = mapTrelloMembersToTeam(card.members);
  const priority = detectPriorityFromLabels(card.labels);

  // Inferir progresso por status se não houver checklists
  const inferredProgress =
    progress > 0 ? progress : getDefaultProgressByStatus(status);

  return {
    title: card.name.trim(),
    description: card.desc || null,
    progress: Math.min(100, Math.max(0, inferredProgress)),
    platforms,
    responsible,
    imageUrl: null, // Trello não fornece imagem diretamente
    startDate: new Date(card.dateLastActivity),
    estimatedEndDate: card.due ? new Date(card.due) : getDefaultEndDate(),
    status,
    priority,
    trelloCardId: card.id,
    labels: card.labels
      .map(label => label.name)
      .filter(name => name.trim().length > 0),
  };
}

/**
 * Progresso padrão baseado no status
 */
function getDefaultProgressByStatus(status: ProjectStatus): number {
  switch (status) {
    case 'a-fazer':
      return 5;
    case 'em-andamento':
      return 45;
    case 'concluido':
      return 100;
    default:
      return 0;
  }
}

/**
 * Data de fim padrão (30 dias a partir de hoje)
 */
function getDefaultEndDate(): Date {
  const date = new Date();

  date.setDate(date.getDate() + 30);

  return date;
}

/**
 * Valida e sanitiza dados do projeto
 */
export function validateAndSanitizeProject(
  data: PrismaProjectData
): PrismaProjectData {
  return {
    ...data,
    title: sanitizeString(data.title).substring(0, 255),
    description: data.description
      ? sanitizeString(data.description).substring(0, 1000)
      : null,
    progress: Math.min(100, Math.max(0, data.progress)),
    labels: data.labels
      .map(label => sanitizeString(label))
      .filter(label => label.length > 0),
  };
}

/**
 * Sanitiza strings removendo conteúdo malicioso
 */
function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/\s+/g, ' '); // Normaliza espaços
}

/**
 * Converte dados Prisma para formato legacy (compatibilidade)
 */
export function convertPrismaToLegacyProject(prismaProject: any): Project {
  return {
    id: prismaProject.id,
    title: prismaProject.title,
    description: prismaProject.description || '',
    progress: prismaProject.progress,
    platforms: prismaProject.platforms,
    responsible: prismaProject.responsible,
    imageUrl: prismaProject.imageUrl,
    startDate: prismaProject.startDate.toISOString(),
    estimatedEndDate: prismaProject.estimatedEndDate.toISOString(),
    status: prismaProject.status
      .toLowerCase()
      .replace('_', '-') as ProjectStatus,
    priority: prismaProject.priority.toLowerCase() as ProjectPriority,
    trelloCardId: prismaProject.trelloCardId,
    labels: prismaProject.labels,
    createdAt: prismaProject.createdAt?.toISOString(),
    updatedAt: prismaProject.updatedAt?.toISOString(),
  };
}
