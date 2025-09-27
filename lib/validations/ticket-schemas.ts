/**
 * Ticket Validation Schemas - Validação de dados robusta
 * Sistema de validação de tickets seguindo Vibe Coding (sem dependências externas)
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import type {
  TicketPriority,
  TicketStatus,
  CreateTicketData,
  UpdateTicketData,
  TicketFilters,
} from '@/types/ticket';

// Constantes para validação
export const VALID_PRIORITIES: TicketPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];
export const VALID_STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'WAITING',
  'CLOSED',
  'RESOLVED',
];

// Resultado de validação
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

// Função utilitária para sanitizar strings
export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value.trim().replace(/\s+/g, ' ');
}

// Função utilitária para sanitizar arrays
export function sanitizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(item => sanitizeString(item))
    .filter(item => item.length > 0);
}

// Validação de prioridade
export function validatePriority(
  value: unknown
): ValidationResult<TicketPriority> {
  if (typeof value !== 'string') {
    return {
      success: false,
      error: 'Prioridade deve ser uma string',
    };
  }

  const priority = value.toUpperCase() as TicketPriority;

  if (!VALID_PRIORITIES.includes(priority)) {
    return {
      success: false,
      error: `Prioridade inválida. Valores aceitos: ${VALID_PRIORITIES.join(', ')}`,
    };
  }

  return { success: true, data: priority };
}

// Validação de status
export function validateStatus(value: unknown): ValidationResult<TicketStatus> {
  if (typeof value !== 'string') {
    return {
      success: false,
      error: 'Status deve ser uma string',
    };
  }

  const status = value.toUpperCase() as TicketStatus;

  if (!VALID_STATUSES.includes(status)) {
    return {
      success: false,
      error: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}`,
    };
  }

  return { success: true, data: status };
}

// Validação de email (básica)
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email);
}

// Validação de data ISO
export function validateISODate(value: string): boolean {
  const date = new Date(value);

  return (
    !isNaN(date.getTime()) &&
    value === date.toISOString().substring(0, value.length)
  );
}

// Validação principal para criação de tickets
export function validateCreateTicket(
  data: unknown
): ValidationResult<CreateTicketData> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: 'Dados do ticket devem ser um objeto válido',
    };
  }

  const ticket = data as Record<string, unknown>;

  // Validar subject (obrigatório)
  const subject = sanitizeString(ticket.subject);

  if (!subject) {
    errors.push({
      field: 'subject',
      message: 'Título é obrigatório',
      value: ticket.subject,
    });
  } else if (subject.length < 3) {
    errors.push({
      field: 'subject',
      message: 'Título deve ter pelo menos 3 caracteres',
      value: subject,
    });
  } else if (subject.length > 200) {
    errors.push({
      field: 'subject',
      message: 'Título deve ter no máximo 200 caracteres',
      value: subject,
    });
  }

  // Validar pipelineId (obrigatório)
  const pipelineId = sanitizeString(ticket.pipelineId);

  if (!pipelineId) {
    errors.push({
      field: 'pipelineId',
      message: 'Pipeline é obrigatória',
      value: ticket.pipelineId,
    });
  }

  // Validar pipelineStageId (obrigatório)
  const pipelineStageId = sanitizeString(ticket.pipelineStageId);

  if (!pipelineStageId) {
    errors.push({
      field: 'pipelineStageId',
      message: 'Estágio da pipeline é obrigatório',
      value: ticket.pipelineStageId,
    });
  }

  // Validar priority
  const priorityResult = validatePriority(ticket.priority || 'MEDIUM');

  if (!priorityResult.success) {
    errors.push({
      field: 'priority',
      message: priorityResult.error || 'Prioridade inválida',
      value: ticket.priority,
    });
  }

  // Validar status
  const statusResult = validateStatus(ticket.status || 'NEW');

  if (!statusResult.success) {
    errors.push({
      field: 'status',
      message: statusResult.error || 'Status inválido',
      value: ticket.status,
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `${errors.length} erro(s) de validação encontrado(s)`,
      errors,
    };
  }

  // Construir objeto validado
  const validTicket: CreateTicketData = {
    subject,
    content: sanitizeString(ticket.content) || undefined,
    priority: priorityResult.data!,
    status: statusResult.data!,
    category: sanitizeString(ticket.category) || undefined,
    pipelineId,
    pipelineStageId,
    hubspotOwnerId: sanitizeString(ticket.hubspotOwnerId) || undefined,
    sourceType: sanitizeString(ticket.sourceType) || 'API',
    tags: sanitizeArray(ticket.tags),
  };

  return { success: true, data: validTicket };
}

// Validação para atualização de tickets
export function validateUpdateTicket(
  data: unknown
): ValidationResult<UpdateTicketData> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: 'Dados de atualização devem ser um objeto válido',
    };
  }

  const updates = data as Record<string, unknown>;
  const validUpdates: Partial<UpdateTicketData> = {};

  // Validar campos opcionais
  if (updates.subject !== undefined) {
    const subject = sanitizeString(updates.subject);

    if (subject && subject.length >= 3 && subject.length <= 200) {
      validUpdates.subject = subject;
    } else if (subject) {
      errors.push({
        field: 'subject',
        message: 'Título deve ter entre 3 e 200 caracteres',
        value: updates.subject,
      });
    }
  }

  if (updates.priority !== undefined) {
    const priorityResult = validatePriority(updates.priority);

    if (priorityResult.success) {
      validUpdates.priority = priorityResult.data;
    } else {
      errors.push({
        field: 'priority',
        message: priorityResult.error || 'Prioridade inválida',
        value: updates.priority,
      });
    }
  }

  if (updates.status !== undefined) {
    const statusResult = validateStatus(updates.status);

    if (statusResult.success) {
      validUpdates.status = statusResult.data;

      // Auto-definir closedAt se status for CLOSED
      if (statusResult.data === 'CLOSED' && !updates.closedAt) {
        validUpdates.closedAt = new Date().toISOString();
      }
    } else {
      errors.push({
        field: 'status',
        message: statusResult.error || 'Status inválido',
        value: updates.status,
      });
    }
  }

  // Outros campos opcionais
  if (updates.content !== undefined) {
    validUpdates.content = sanitizeString(updates.content) || undefined;
  }

  if (updates.category !== undefined) {
    validUpdates.category = sanitizeString(updates.category) || undefined;
  }

  if (updates.tags !== undefined) {
    validUpdates.tags = sanitizeArray(updates.tags);
  }

  if (updates.closedAt !== undefined && typeof updates.closedAt === 'string') {
    if (validateISODate(updates.closedAt)) {
      validUpdates.closedAt = updates.closedAt;
    } else {
      errors.push({
        field: 'closedAt',
        message: 'Data de fechamento deve estar no formato ISO válido',
        value: updates.closedAt,
      });
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `${errors.length} erro(s) de validação encontrado(s)`,
      errors,
    };
  }

  return { success: true, data: validUpdates as UpdateTicketData };
}

// Validação de filtros de busca
export function validateTicketFilters(
  data: unknown
): ValidationResult<TicketFilters> {
  if (!data || typeof data !== 'object') {
    return { success: true, data: {} };
  }

  const filters = data as Record<string, unknown>;
  const validFilters: TicketFilters = {};

  // Validar campos de filtro
  if (filters.status !== undefined) {
    const statusResult = validateStatus(filters.status);

    if (statusResult.success) {
      validFilters.status = statusResult.data;
    }
  }

  if (filters.priority !== undefined) {
    const priorityResult = validatePriority(filters.priority);

    if (priorityResult.success) {
      validFilters.priority = priorityResult.data;
    }
  }

  if (filters.search !== undefined) {
    const search = sanitizeString(filters.search);

    if (search) {
      validFilters.search = search;
    }
  }

  if (filters.category !== undefined) {
    const category = sanitizeString(filters.category);

    if (category) {
      validFilters.category = category;
    }
  }

  // Datas
  if (filters.dateFrom !== undefined && typeof filters.dateFrom === 'string') {
    if (validateISODate(filters.dateFrom)) {
      validFilters.dateFrom = filters.dateFrom;
    }
  }

  if (filters.dateTo !== undefined && typeof filters.dateTo === 'string') {
    if (validateISODate(filters.dateTo)) {
      validFilters.dateTo = filters.dateTo;
    }
  }

  return { success: true, data: validFilters };
}

// Função para sanitizar entrada geral
export function sanitizeTicketInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeTicketInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeTicketInput(value);
    }

    return sanitized;
  }

  return input;
}
