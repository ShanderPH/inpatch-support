import { NextRequest, NextResponse } from 'next/server';

import { trelloSyncService } from '@/lib/services/trello-sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate webhook payload
    if (!body.action || !body.model) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Log webhook data for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.log('Trello webhook received:', {
        action: body.action.type,
        card: body.action.data?.card?.name,
        list: body.action.data?.list?.name,
        member: body.action.memberCreator?.fullName,
      });
    }

    // Filter relevant actions
    const relevantActions = [
      'createCard',
      'updateCard',
      'deleteCard',
      'moveCardFromBoard',
      'moveCardToBoard',
      'addChecklistToCard',
      'updateCheckItemStateOnCard',
    ];

    if (relevantActions.includes(body.action.type)) {
      // Trigger sync in background
      setTimeout(async () => {
        try {
          await trelloSyncService.syncFromTrello();
          // Sync completed successfully
        } catch {
          // Handle sync errors silently in production
        }
      }, 1000); // Small delay to ensure Trello data is consistent
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log errors only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Webhook processing error:', error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  // Handle Trello webhook verification
  return NextResponse.json({ message: 'Trello webhook endpoint active' });
}
