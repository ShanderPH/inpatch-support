import type { Project, ProjectStatus } from '@/types/project';

import { NextRequest, NextResponse } from 'next/server';

import { trelloApi } from '@/lib/trello';

// Helper to map status -> listId using current board lists
async function getListIdForStatus(
  status: ProjectStatus
): Promise<string | null> {
  const lists = (await trelloApi.getBoardLists()) as Array<{
    id: string;
    name: string;
    pos: number;
  }>;
  const statusToListCandidates: Record<ProjectStatus, string[]> = {
    'a-fazer': [
      'planning',
      'backlog',
      'to-do',
      'todo',
      'fazer',
      'a fazer',
      'pendente',
      'novo',
    ],
    'em-andamento': [
      'development',
      'doing',
      'in progress',
      'progress',
      'andamento',
      'em andamento',
      'desenvolvimento',
      'trabalhando',
      'ativo',
    ],
    concluido: [
      'done',
      'completed',
      'concluido',
      'concluído',
      'finalizado',
      'pronto',
      'finished',
    ],
  };

  const candidates = statusToListCandidates[status].map(s => s.toLowerCase());

  // Try direct/partial matches
  for (const list of lists) {
    const lname = list.name.toLowerCase();

    if (candidates.includes(lname)) return list.id;
    if (candidates.some(c => lname.includes(c))) return list.id;
  }
  // Fallbacks by position
  const sorted = [...lists].sort((a, b) => a.pos - b.pos);

  if (sorted.length === 0) return null;
  if (status === 'a-fazer') return sorted[0].id;
  if (status === 'concluido') return sorted[sorted.length - 1].id;

  return sorted[Math.floor(sorted.length / 2)].id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description = '',
      status = 'a-fazer',
      estimatedEndDate,
    }: Partial<Project> = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Título é obrigatório' },
        { status: 400 }
      );
    }

    const listId = await getListIdForStatus(status as ProjectStatus);

    if (!listId) {
      return NextResponse.json(
        {
          error:
            'Não foi possível identificar a lista do Trello para o status informado.',
        },
        { status: 400 }
      );
    }

    const newCard = await trelloApi.createCard(listId, {
      title,
      description,
      progress: 0,
      platforms: ['Backoffice'],
      responsible: ['Guilherme Souza'],
      startDate: new Date().toISOString(),
      estimatedEndDate:
        estimatedEndDate ||
        new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      status: status as ProjectStatus,
      priority: 'medium',
      labels: [],
      trelloCardId: undefined,
      imageUrl: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      id: '' as any, // omitted by signature
    } as Omit<Project, 'id'>);

    const project = trelloApi.transformCardsToProjects([newCard])[0];

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar projeto' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, trelloCardId, ...updates }: Partial<Project> = body;
    const cardId = trelloCardId || id;

    if (!cardId) {
      return NextResponse.json(
        { error: 'ID do card do Trello é obrigatório' },
        { status: 400 }
      );
    }

    const updatedCard = await trelloApi.updateCard(cardId, updates);
    const project = trelloApi.transformCardsToProjects([updatedCard])[0];

    return NextResponse.json({ project }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar projeto' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const trelloCardId = searchParams.get('trelloCardId');
    const cardId = trelloCardId || id;

    if (!cardId) {
      return NextResponse.json(
        { error: 'ID do card do Trello é obrigatório' },
        { status: 400 }
      );
    }

    await trelloApi.deleteCard(cardId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao deletar projeto' },
      { status: 500 }
    );
  }
}
