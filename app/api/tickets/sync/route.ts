/**
 * API Route para Sincronização Manual de Tickets
 * Força sincronização entre HubSpot e banco local
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

import { ticketDatabaseService } from '@/lib/services/ticket-database';

// POST /api/tickets/sync - Forçar sincronização manual
export async function POST(_request: NextRequest) {
  try {
    console.log('🔄 POST /api/tickets/sync - Sincronização manual iniciada');

    // Executar sincronização completa
    const syncStats = await ticketDatabaseService.syncFromHubSpot();

    const response = {
      success: true,
      data: {
        stats: syncStats,
        timestamp: new Date().toISOString(),
      },
      message: `Sincronização concluída: ${syncStats.synced} tickets processados`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ POST /api/tickets/sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro na sincronização',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

// GET /api/tickets/sync - Verificar status da sincronização
export async function GET(_request: NextRequest) {
  try {
    console.log('📊 GET /api/tickets/sync - Verificando status');

    // Tentar buscar tickets locais para verificar se há dados
    const localTickets = await ticketDatabaseService.getLocalTickets();

    const response = {
      success: true,
      data: {
        localTicketsCount: localTickets.length,
        lastCheck: new Date().toISOString(),
        hasLocalData: localTickets.length > 0,
      },
      message: `${localTickets.length} tickets no banco local`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ GET /api/tickets/sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao verificar status',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
