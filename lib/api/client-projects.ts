import type { Project } from '@/types/project';

export async function createProject(
  input: Pick<Project, 'title' | 'description' | 'status' | 'estimatedEndDate'>
) {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok)
    throw new Error((await res.json()).error || 'Falha ao criar projeto');

  return (await res.json()) as { project: Project };
}

export async function updateProject(
  input: Partial<Project> & { id?: string; trelloCardId?: string }
) {
  const res = await fetch('/api/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok)
    throw new Error((await res.json()).error || 'Falha ao atualizar projeto');

  return (await res.json()) as { project: Project };
}

export async function deleteProject(cardId: string) {
  const params = new URLSearchParams({ trelloCardId: cardId });
  const res = await fetch(`/api/projects?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!res.ok)
    throw new Error((await res.json()).error || 'Falha ao apagar projeto');

  return (await res.json()) as { success: boolean };
}
