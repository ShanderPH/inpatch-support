/**
 * Teste direto da API Trello para debug
 * Este arquivo será removido após identificar o problema
 */

import { trelloApi } from '@/lib/trello';

export async function testTrelloDirectly() {
  console.log('🧪 Testing Trello API directly...');

  try {
    // Test 1: Get board cards
    console.log('📋 Fetching board cards...');
    const cards = await trelloApi.getBoardCards();

    console.log(`✅ Fetched ${cards.length} cards`);
    console.log('Sample card:', cards[0]);

    // Test 2: Transform cards
    console.log('🔄 Transforming cards to projects...');
    const projects = trelloApi.transformCardsToProjects(cards);

    console.log(`✅ Transformed to ${projects.length} projects`);
    console.log('Sample project:', projects[0]);

    // Test 3: Check status mapping
    console.log('📊 Status distribution:');
    const statusCounts = projects.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;

        return acc;
      },
      {} as Record<string, number>
    );

    console.log(statusCounts);

    return {
      success: true,
      cardCount: cards.length,
      projectCount: projects.length,
      statusCounts,
      sampleCard: cards[0],
      sampleProject: projects[0],
    };
  } catch (error) {
    console.error('❌ Trello test failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Test function to be called from browser console
if (typeof window !== 'undefined') {
  (window as any).testTrello = testTrelloDirectly;
}
