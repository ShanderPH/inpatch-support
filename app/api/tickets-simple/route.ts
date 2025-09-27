import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Retornar dados mock para testar se o endpoint funciona sem Prisma
    const mockTickets = [
      {
        id: '1',
        hubspotId: 'mock-1',
        subject: 'Ticket de Teste 1',
        content: 'Conteúdo do ticket de teste',
        priority: 'MEDIUM',
        status: 'NEW',
        category: 'teste',
        pipelineId: 'test-pipeline',
        pipelineStageId: 'test-stage',
        hubspotOwnerId: null,
        sourceType: 'api',
        tags: ['teste'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        closedAt: null,
        hubspotCreatedAt: null,
        hubspotUpdatedAt: null,
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        tickets: mockTickets,
        total: mockTickets.length,
        hasMore: false,
        nextCursor: undefined,
        lastUpdated: new Date().toISOString(),
      },
      message: `${mockTickets.length} tickets encontrados (dados mock)`,
    });
  } catch (error) {
    console.error('❌ GET /api/tickets-simple error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar tickets',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
