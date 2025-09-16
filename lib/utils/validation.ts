import {
  Project,
  Platform,
  TeamMember,
  ProjectStatus,
  ProjectPriority,
} from '@/types/project';

// Validation schemas
export const ValidationRules = {
  project: {
    title: {
      minLength: 1,
      maxLength: 255,
      required: true,
    },
    description: {
      maxLength: 2000,
      required: false,
    },
    progress: {
      min: 0,
      max: 100,
      required: true,
    },
  },
} as const;

// Input sanitization
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

// Validate project data
export function validateProject(project: Partial<Project>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Title validation
  if (!project.title || project.title.trim().length === 0) {
    errors.push('Título é obrigatório');
  } else if (project.title.length > ValidationRules.project.title.maxLength) {
    errors.push(
      `Título deve ter no máximo ${ValidationRules.project.title.maxLength} caracteres`
    );
  }

  // Description validation
  if (
    project.description &&
    project.description.length > ValidationRules.project.description.maxLength
  ) {
    errors.push(
      `Descrição deve ter no máximo ${ValidationRules.project.description.maxLength} caracteres`
    );
  }

  // Progress validation
  if (project.progress !== undefined) {
    if (
      project.progress < ValidationRules.project.progress.min ||
      project.progress > ValidationRules.project.progress.max
    ) {
      errors.push(
        `Progresso deve estar entre ${ValidationRules.project.progress.min} e ${ValidationRules.project.progress.max}`
      );
    }
  }

  // Platforms validation
  if (project.platforms && project.platforms.length === 0) {
    errors.push('Pelo menos uma plataforma deve ser selecionada');
  }

  // Responsible validation
  if (project.responsible && project.responsible.length === 0) {
    errors.push('Pelo menos um responsável deve ser atribuído');
  }

  // Date validation
  if (project.estimatedEndDate) {
    const endDate = new Date(project.estimatedEndDate);
    const now = new Date();

    if (endDate < now) {
      errors.push('Data de conclusão não pode ser no passado');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validate and sanitize project input
export function sanitizeProject(project: Partial<Project>): Partial<Project> {
  return {
    ...project,
    title: project.title ? sanitizeString(project.title) : project.title,
    description: project.description
      ? sanitizeString(project.description)
      : project.description,
    progress: project.progress
      ? Math.max(0, Math.min(100, project.progress))
      : project.progress,
  };
}

// Type guards
export function isValidPlatform(platform: string): platform is Platform {
  const validPlatforms: Platform[] = [
    'N8N',
    'Jira',
    'Hubspot',
    'Backoffice',
    'Google Workspace',
  ];

  return validPlatforms.includes(platform as Platform);
}

export function isValidTeamMember(member: string): member is TeamMember {
  const validMembers: TeamMember[] = [
    'Guilherme Souza',
    'Felipe Braat',
    'Tiago Triani',
  ];

  return validMembers.includes(member as TeamMember);
}

export function isValidStatus(status: string): status is ProjectStatus {
  const validStatuses: ProjectStatus[] = [
    'a-fazer',
    'em-andamento',
    'concluido',
  ];

  return validStatuses.includes(status as ProjectStatus);
}

export function isValidPriority(priority: string): priority is ProjectPriority {
  const validPriorities: ProjectPriority[] = ['low', 'medium', 'high'];

  return validPriorities.includes(priority as ProjectPriority);
}

// Error handling utilities
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Rate limiting utilities
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= limit) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}
