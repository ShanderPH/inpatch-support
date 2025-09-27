/**
 * API Route para HubSpot Pipelines
 * Busca pipelines e stages de tickets
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

import { hubspotApi } from '@/lib/services/hubspot-api';

// GET /api/hubspot/pipelines - Buscar apenas a pipeline específica do sistema
export async function GET(_request: NextRequest) {
  try {
    console.log(
      '🚰 GET /api/hubspot/pipelines - Sistema específico (634240100)'
    );

    // Buscar apenas a pipeline específica do sistema (mais eficiente)
    const systemPipeline = await hubspotApi.getSystemPipeline();

    const response = {
      success: true,
      data: [systemPipeline], // Retornar como array para manter compatibilidade
      message: 'Pipeline do sistema encontrada',
      systemInfo: {
        pipelineId: '634240100',
        description: 'Pipeline específica para tickets do sistema inPatch',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ GET /api/hubspot/pipelines error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar pipeline do sistema',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
