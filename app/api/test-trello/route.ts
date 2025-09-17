import { NextRequest, NextResponse } from 'next/server';

import { trelloApi } from '@/lib/trello';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 API Test: Testing Trello integration...');

    // Test 1: Get board cards
    const cards = await trelloApi.getBoardCards();

    console.log(`✅ API Test: Fetched ${cards.length} cards`);

    // Test 2: Transform cards
    const projects = trelloApi.transformCardsToProjects(cards);

    console.log(`✅ API Test: Transformed to ${projects.length} projects`);

    // Test 3: Status distribution
    const statusCounts = projects.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;

        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      cardCount: cards.length,
      projectCount: projects.length,
      statusCounts,
      sampleCard: cards[0] || null,
      sampleProject: projects[0] || null,
      projects: projects.slice(0, 5), // First 5 projects for preview
    });
  } catch (error) {
    console.error('❌ API Test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
