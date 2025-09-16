import { Project } from '@/types/project';

export const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Automação de Tickets Jira',
    description:
      'Integração automatizada entre N8N e Jira para criação e atualização de tickets de suporte, reduzindo tempo manual de processamento.',
    progress: 75,
    platforms: ['N8N', 'Jira'],
    responsible: ['Guilherme Souza'],
    startDate: '2024-01-15',
    estimatedEndDate: '2024-02-28',
    status: 'em-andamento',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Dashboard Analytics Hubspot',
    description:
      'Criação de dashboard personalizado no Backoffice integrando métricas do Hubspot para acompanhamento de leads e conversões.',
    progress: 45,
    platforms: ['Hubspot', 'Backoffice'],
    responsible: ['Felipe Braat'],
    startDate: '2024-01-20',
    estimatedEndDate: '2024-03-15',
    status: 'em-andamento',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Sync Google Workspace',
    description:
      'Sincronização automática de usuários entre Google Workspace e sistemas internos, mantendo dados sempre atualizados.',
    progress: 90,
    platforms: ['Google Workspace', 'Backoffice'],
    responsible: ['Tiago Triani'],
    startDate: '2024-01-10',
    estimatedEndDate: '2024-02-10',
    status: 'concluido',
    priority: 'high',
  },
  {
    id: '4',
    title: 'Workflow de Aprovações',
    description:
      'Sistema de aprovações automatizado via N8N integrando com Jira e notificações por email para streamline de processos.',
    progress: 30,
    platforms: ['N8N', 'Jira', 'Google Workspace'],
    responsible: ['Guilherme Souza'],
    startDate: '2024-02-01',
    estimatedEndDate: '2024-03-30',
    status: 'em-andamento',
    priority: 'medium',
  },
  {
    id: '5',
    title: 'CRM Integration Hub',
    description:
      'Central de integração unificada conectando Hubspot, Jira e Backoffice para visão 360° do cliente e automação de processos.',
    progress: 15,
    platforms: ['Hubspot', 'Jira', 'Backoffice'],
    responsible: ['Felipe Braat'],
    startDate: '2024-02-10',
    estimatedEndDate: '2024-04-15',
    status: 'a-fazer',
    priority: 'high',
  },
  {
    id: '6',
    title: 'Monitoring & Alertas',
    description:
      'Sistema de monitoramento proativo com alertas automáticos via N8N para identificar e resolver problemas antes que afetem usuários.',
    progress: 60,
    platforms: ['N8N', 'Google Workspace'],
    responsible: ['Tiago Triani'],
    startDate: '2024-01-25',
    estimatedEndDate: '2024-03-10',
    status: 'em-andamento',
    priority: 'high',
  },
];

// Função que simula uma futura integração com Trello API
export const fetchProjectsFromTrello = async (): Promise<Project[]> => {
  // TODO: Implementar integração real com Trello API
  // Esta função será substituída pela integração real no futuro
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockProjects);
    }, 500);
  });
};
