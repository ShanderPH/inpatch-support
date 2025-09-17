import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 FINAL TEST: Testing complete integration...');

    // Import the store
    const { useProjectStore } = await import('@/lib/store');

    // Test the store directly
    console.log('📊 Testing store fetchProjects...');
    const store = useProjectStore.getState();

    console.log('📊 Initial state:', {
      projects: store.projects.length,
      loading: store.loading,
      error: store.error,
    });

    // Call fetchProjects
    await store.fetchProjects();

    // Get updated state
    const updatedStore = useProjectStore.getState();

    console.log('📊 Final state:', {
      projects: updatedStore.projects.length,
      loading: updatedStore.loading,
      error: updatedStore.error,
      lastUpdated: updatedStore.lastUpdated,
    });

    // Get filtered and grouped data as the UI would
    const filteredProjects = updatedStore.getFilteredProjects();
    const groupedProjects = updatedStore.getGroupedProjects();
    const stats = updatedStore.getProjectStats();

    console.log('📊 UI Data:', {
      filteredCount: filteredProjects.length,
      grouped: {
        'em-andamento': groupedProjects['em-andamento'].length,
        'a-fazer': groupedProjects['a-fazer'].length,
        concluido: groupedProjects.concluido.length,
      },
      stats,
    });

    return NextResponse.json({
      success: true,
      message: 'Integration test completed successfully!',
      data: {
        totalProjects: updatedStore.projects.length,
        filteredProjects: filteredProjects.length,
        grouped: {
          'em-andamento': groupedProjects['em-andamento'].length,
          'a-fazer': groupedProjects['a-fazer'].length,
          concluido: groupedProjects.concluido.length,
        },
        stats,
        sampleProjects: filteredProjects.slice(0, 5).map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          platforms: p.platforms,
          responsible: p.responsible,
        })),
        lastUpdated: updatedStore.lastUpdated,
      },
    });
  } catch (error) {
    console.error('❌ Final test failed:', error);

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
