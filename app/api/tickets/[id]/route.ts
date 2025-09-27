/**
 * API Routes para Ticket Individual - HubSpot Integration
 * CRUD operations para ticket específico
 *
 * @author inPatch Team
 * @version 1.0.0
 */

import type { UpdateTicketData } from '@/types/ticket';

import { NextRequest, NextResponse } from 'next/server';

import { hubspotApi } from '@/lib/services/hubspot-api';
import { transformHubSpotToLocal } from '@/types/ticket';

// GET /api/tickets/[id] - Buscar ticket por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ticketId: string | undefined;

  try {
    const { id } = await params;

    ticketId = id;

    console.log(`🎫 GET /api/tickets/${ticketId}`);

    // Buscar ticket no HubSpot
    const hubspotTicket = await hubspotApi.getTicketById(ticketId);

    // Transformar para formato local
    const ticket = transformHubSpotToLocal(hubspotTicket);

    const response = {
      success: true,
      data: ticket,
      message: 'Ticket encontrado',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ GET /api/tickets/${ticketId || 'unknown'} error:`, error);

    // Se o ticket não foi encontrado
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket não encontrado',
          details: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar ticket',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] - Atualizar ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ticketId: string | undefined;

  try {
    const { id } = await params;

    ticketId = id;
    const body = await request.json();

    console.log(`🎫 PATCH /api/tickets/${ticketId} - Body:`, body);

    const updateData: UpdateTicketData = {
      subject: body.subject,
      content: body.content,
      priority: body.priority,
      status: body.status,
      category: body.category,
      pipelineStageId: body.pipelineStageId,
      hubspotOwnerId: body.hubspotOwnerId,
      sourceType: body.sourceType,
      tags: body.tags,
      closedAt: body.closedAt,
    };

    // Remover campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateTicketData] === undefined) {
        delete updateData[key as keyof UpdateTicketData];
      }
    });

    // Preparar dados para HubSpot
    const hubspotProperties: any = {};

    if (updateData.subject) hubspotProperties.subject = updateData.subject;
    if (updateData.content !== undefined)
      hubspotProperties.content = updateData.content;
    if (updateData.priority)
      hubspotProperties.hs_ticket_priority = updateData.priority.toUpperCase();
    if (updateData.category !== undefined)
      hubspotProperties.hs_ticket_category = updateData.category;
    if (updateData.pipelineStageId)
      hubspotProperties.hs_pipeline_stage = updateData.pipelineStageId;
    if (updateData.hubspotOwnerId !== undefined)
      hubspotProperties.hubspot_owner_id = updateData.hubspotOwnerId;
    if (updateData.sourceType !== undefined)
      hubspotProperties.source_type = updateData.sourceType;
    if (updateData.tags) hubspotProperties.tags = updateData.tags.join(', ');
    if (updateData.closedAt)
      hubspotProperties.closedate = new Date(updateData.closedAt).getTime();

    // Atualizar ticket no HubSpot
    const hubspotTicket = await hubspotApi.updateTicket(ticketId, {
      properties: hubspotProperties,
    });

    // Transformar para formato local
    const ticket = transformHubSpotToLocal(hubspotTicket);

    const response = {
      success: true,
      data: ticket,
      message: 'Ticket atualizado com sucesso',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `❌ PATCH /api/tickets/${ticketId || 'unknown'} error:`,
      error
    );

    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket não encontrado',
          details: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao atualizar ticket',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Deletar ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ticketId: string | undefined;

  try {
    const { id } = await params;

    ticketId = id;

    console.log(`🎫 DELETE /api/tickets/${ticketId}`);

    // Deletar ticket no HubSpot
    await hubspotApi.deleteTicket(ticketId);

    const response = {
      success: true,
      message: 'Ticket deletado com sucesso',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `❌ DELETE /api/tickets/${ticketId || 'unknown'} error:`,
      error
    );

    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ticket não encontrado',
          details: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao deletar ticket',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
