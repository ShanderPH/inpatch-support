/**
 * Edge Function para processar webhooks do Trello
 * Integração com MCP para sincronização em tempo real
 * Seguindo padrões de Vibe Coding e segurança enterprise
 */

// @ts-ignore - Deno runtime imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - Deno runtime imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos para webhook do Trello
interface TrelloWebhookPayload {
  action: {
    type: string;
    data: {
      card?: {
        id: string;
        name: string;
        desc: string;
        due: string | null;
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
        }>;
        checklists?: Array<{
          checkItems: Array<{
            state: 'complete' | 'incomplete';
          }>;
        }>;
      };
      list?: {
        id: string;
        name: string;
      };
      board?: {
        id: string;
        name: string;
      };
    };
  };
  model: {
    id: string;
    name: string;
  };
}

interface ProcessedProject {
  title: string;
  description: string;
  progress: number;
  platforms: string[];
  responsible: string[];
  status: string;
  priority: string;
  trelloCardId: string;
  labels: string[];
  estimatedEndDate: string;
}

/**
 * Processa webhook do Trello e transforma em projeto
 */
function processWebhookData(
  payload: TrelloWebhookPayload
): ProcessedProject | null {
  const { action } = payload;

  // Só processa eventos de cards
  if (!action.data.card) {
    // Webhook ignorado: não é evento de card
    return null;
  }

  const card = action.data.card;

  try {
    // Mapeamento de status baseado na lista
    const statusMapping: Record<string, string> = {
      planning: 'a-fazer',
      backlog: 'a-fazer',
      'to do': 'a-fazer',
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
    };

    // Mapeamento de plataformas
    const platformMapping: Record<string, string> = {
      n8n: 'N8N',
      jira: 'Jira',
      hubspot: 'Hubspot',
      backoffice: 'Backoffice',
      'google workspace': 'Google Workspace',
      google: 'Google Workspace',
    };

    // Mapeamento de membros
    const memberMapping: Record<string, string> = {
      'guilherme souza': 'Guilherme Souza',
      guilherme: 'Guilherme Souza',
      'felipe braat': 'Felipe Braat',
      felipe: 'Felipe Braat',
      'tiago triani': 'Tiago Triani',
      tiago: 'Tiago Triani',
    };

    // Extrai plataformas dos labels
    const platforms = card.labels
      .map(label => {
        const labelName = label.name.toLowerCase();

        return platformMapping[labelName];
      })
      .filter((platform): platform is string => Boolean(platform));

    // Extrai responsáveis dos membros
    const responsible = card.members.map(member => {
      const memberName = member.fullName.toLowerCase();

      return memberMapping[memberName] || member.fullName;
    });

    // Calcula progresso baseado em checklists
    let progress = 0;

    if (card.checklists && card.checklists.length > 0) {
      const allItems = card.checklists.flatMap(
        checklist => checklist.checkItems
      );
      const completedItems = allItems.filter(item => item.state === 'complete');

      progress =
        allItems.length > 0
          ? Math.round((completedItems.length / allItems.length) * 100)
          : 0;
    } else {
      // Progresso baseado no status se não há checklists
      const listName = card.list.name.toLowerCase();

      if (statusMapping[listName] === 'a-fazer') progress = 5;
      else if (statusMapping[listName] === 'em-andamento') progress = 45;
      else if (statusMapping[listName] === 'concluido') progress = 100;
    }

    // Determina prioridade baseada em labels vermelhos/amarelos
    let priority = 'medium';
    const hasRedLabel = card.labels.some(label => label.color === 'red');
    const hasYellowLabel = card.labels.some(label => label.color === 'yellow');
    const hasGreenLabel = card.labels.some(label => label.color === 'green');

    if (hasRedLabel) priority = 'high';
    else if (hasGreenLabel) priority = 'low';
    else if (hasYellowLabel) priority = 'medium';

    const processedProject: ProcessedProject = {
      title: sanitizeString(card.name),
      description: sanitizeString(card.desc || ''),
      progress,
      platforms: platforms.length > 0 ? platforms : ['Backoffice'],
      responsible: responsible.length > 0 ? responsible : ['Guilherme Souza'],
      status: statusMapping[card.list.name.toLowerCase()] || 'a-fazer',
      priority,
      trelloCardId: card.id,
      labels: card.labels.map(label => label.name).filter(Boolean),
      estimatedEndDate:
        card.due ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return processedProject;
  } catch (error) {
    // Log error silently in production
    if ((globalThis as any).Deno?.env?.get?.('NODE_ENV') === 'development') {
      console.error('Erro ao processar dados do webhook:', error);
    }

    return null;
  }
}

/**
 * Sanitiza strings para segurança
 */
function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 255); // Limita tamanho
}

/**
 * Valida assinatura do webhook (segurança)
 */
function validateWebhookSignature(request: Request, _body: string): boolean {
  const signature = request.headers.get('x-trello-webhook');

  // Access Deno environment variables properly
  const secret = (globalThis as any).Deno?.env?.get?.('TRELLO_WEBHOOK_SECRET');

  if (!signature || !secret) {
    // Webhook sem assinatura ou secret não configurado
    return false;
  }

  // Implementar validação HMAC aqui se necessário
  // Por enquanto, aceita qualquer webhook com header
  return true;
}

/**
 * Handler principal da Edge Function
 */
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.text();

    // Valida assinatura do webhook
    if (!validateWebhookSignature(req, body)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders,
      });
    }

    const payload: TrelloWebhookPayload = JSON.parse(body);

    // Processa apenas eventos relevantes
    const relevantEvents = [
      'createCard',
      'updateCard',
      'deleteCard',
      'moveCardToBoard',
      'moveCardFromBoard',
    ];

    if (!relevantEvents.includes(payload.action.type)) {
      return new Response('Event ignored', {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Processa dados do webhook
    const processedProject = processWebhookData(payload);

    if (!processedProject) {
      return new Response('No project data', {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Conecta ao Supabase
    const supabaseUrl = (globalThis as any).Deno?.env?.get?.('SUPABASE_URL')!;
    const supabaseKey = (globalThis as any).Deno?.env?.get?.(
      'SUPABASE_SERVICE_ROLE_KEY'
    )!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert do projeto no banco
    const { data, error } = await supabase.from('projects').upsert(
      {
        title: processedProject.title,
        description: processedProject.description,
        progress: processedProject.progress,
        platforms: processedProject.platforms,
        responsible: processedProject.responsible,
        status: processedProject.status,
        priority: processedProject.priority,
        trello_card_id: processedProject.trelloCardId,
        labels: processedProject.labels,
        estimated_end_date: processedProject.estimatedEndDate,
        start_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'trello_card_id',
      }
    );

    if (error) {
      return new Response('Database error', {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Log de sucesso no histórico de sync
    await supabase.from('sync_history').insert({
      project_id: data?.[0]?.id || 'unknown',
      action: payload.action.type === 'createCard' ? 'CREATED' : 'UPDATED',
      source: 'trello-webhook',
      success: true,
      details: {
        webhookType: payload.action.type,
        cardId: processedProject.trelloCardId,
        timestamp: new Date().toISOString(),
      },
    });

    // Projeto sincronizado via webhook silentemente

    return new Response(
      JSON.stringify({
        success: true,
        project: processedProject.title,
        action: payload.action.type,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
