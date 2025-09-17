import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing direct store access...');

    // Try to import and use the store directly
    const { useProjectStore } = await import('@/lib/store');

    console.log('✅ Store imported successfully');

    // Get the store instance
    const store = useProjectStore.getState();

    console.log('📊 Current store state:', {
      projects: store.projects.length,
      loading: store.loading,
      error: store.error,
      lastUpdated: store.lastUpdated,
    });

    // Call fetchProjects manually
    console.log('🔄 Calling fetchProjects...');
    await store.fetchProjects();

    // Get updated state
    const updatedStore = useProjectStore.getState();

    console.log('📊 Updated store state:', {
      projects: updatedStore.projects.length,
      loading: updatedStore.loading,
      error: updatedStore.error,
      lastUpdated: updatedStore.lastUpdated,
    });

    return NextResponse.json({
      success: true,
      before: {
        projects: store.projects.length,
        loading: store.loading,
        error: store.error,
        lastUpdated: store.lastUpdated,
      },
      after: {
        projects: updatedStore.projects.length,
        loading: updatedStore.loading,
        error: updatedStore.error,
        lastUpdated: updatedStore.lastUpdated,
        sampleProjects: updatedStore.projects.slice(0, 3).map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Store test failed:', error);

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
