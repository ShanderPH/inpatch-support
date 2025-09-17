import { NextRequest, NextResponse } from 'next/server';

import { syncOrchestrator } from '@/lib/services/sync-orchestrator-v2';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Checking SyncOrchestrator status...');

    // Force initialization
    await syncOrchestrator.initialize();

    // Test full sync
    const result = await syncOrchestrator.performFullSync();

    // Get system status
    const systemStatus = syncOrchestrator.getSystemStatus();

    return NextResponse.json({
      success: true,
      result: {
        projectCount: result.projects.length,
        sampleProjects: result.projects.slice(0, 3).map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          platforms: p.platforms,
          responsible: p.responsible,
        })),
        metrics: result.metrics,
      },
      systemStatus,
    });
  } catch (error) {
    console.error('❌ DEBUG: SyncOrchestrator test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
