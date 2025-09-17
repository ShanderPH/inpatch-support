import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 TEST: Simulating page load and useEffect execution...');

    // Test what happens when the page loads
    const { useProjectStore } = await import('@/lib/store');

    // Get initial state
    const initialState = useProjectStore.getState();

    console.log('📊 Initial store state:', {
      projects: initialState.projects.length,
      loading: initialState.loading,
      error: initialState.error,
    });

    // Simulate what the useEffect should do
    console.log('🚀 Simulating useEffect: calling fetchProjects...');

    try {
      await initialState.fetchProjects();
      console.log('✅ fetchProjects completed successfully');
    } catch (fetchError) {
      console.error('❌ fetchProjects failed:', fetchError);
    }

    // Get final state
    const finalState = useProjectStore.getState();

    console.log('📊 Final store state:', {
      projects: finalState.projects.length,
      loading: finalState.loading,
      error: finalState.error,
      lastUpdated: finalState.lastUpdated,
    });

    return NextResponse.json({
      success: true,
      simulation: {
        initial: {
          projects: initialState.projects.length,
          loading: initialState.loading,
          error: initialState.error,
        },
        final: {
          projects: finalState.projects.length,
          loading: finalState.loading,
          error: finalState.error,
          lastUpdated: finalState.lastUpdated,
          sampleProjects: finalState.projects.slice(0, 3).map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
          })),
        },
      },
    });
  } catch (error) {
    console.error('❌ Page load simulation failed:', error);

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
