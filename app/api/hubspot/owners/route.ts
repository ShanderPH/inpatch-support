/**
 * API Route para HubSpot Owners/Users
 * Busca usuários/técnicos disponíveis
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

import { hubspotApi } from '@/lib/services/hubspot-api';

// GET /api/hubspot/owners - Buscar apenas os técnicos autorizados
export async function GET(_request: NextRequest) {
  try {
    console.log('👥 GET /api/hubspot/owners - Apenas técnicos autorizados');

    // Buscar apenas os técnicos autorizados (mais eficiente)
    const ownersResponse = await hubspotApi.getAuthorizedOwners();

    // Transformar dados para formato mais amigável
    const owners = ownersResponse.results.map(owner => ({
      ...owner,
      fullName:
        owner.firstName && owner.lastName
          ? `${owner.firstName} ${owner.lastName}`
          : owner.email,
    }));

    const response = {
      success: true,
      data: owners,
      message: `${owners.length} técnicos autorizados encontrados`,
      authorizedOwners: {
        'Felipe Teixeira': { id: '1514631054', role: 'Analista N2 Eventos' },
        'Tiago Triani': { id: '360834054', role: 'Analista N2' },
        'Guilherme Souza': { id: '1727693927', role: 'Analista N2' },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ GET /api/hubspot/owners error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar técnicos autorizados',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
