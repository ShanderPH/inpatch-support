/**
 * Teste básico para validar integração Prisma
 * Arquivo temporário para validar a estrutura durante a migração
 */

import type { TrelloCard } from '@/lib/utils/transformers';

import { DatabaseService } from './prisma';

import { transformTrelloCardToPrismaProject } from '@/lib/utils/transformers';

/**
 * Teste básico de CRUD operations
 */
export async function testDatabaseOperations() {
  const db = new DatabaseService();

  try {
    console.log('🧪 Iniciando testes do DatabaseService...');

    // Teste 1: Buscar projetos (deve retornar array vazio inicialmente)
    const projects = await db.getProjects();

    console.log(
      '✅ Teste 1 - getProjects():',
      projects.length,
      'projetos encontrados'
    );

    // Teste 2: Estatísticas (deve retornar zeros inicialmente)
    const stats = await db.getProjectStats();

    console.log('✅ Teste 2 - getProjectStats():', stats);

    // Teste 3: Histórico de sincronização
    const history = await db.getSyncHistory(10);

    console.log(
      '✅ Teste 3 - getSyncHistory():',
      history.length,
      'entradas encontradas'
    );

    console.log('🎉 Todos os testes básicos passaram!');

    return true;
  } catch (error) {
    console.error('❌ Erro nos testes:', error);

    return false;
  } finally {
    await db.disconnect();
  }
}

/**
 * Teste de transformação de dados Trello
 */
export function testTrelloTransformation() {
  console.log('🧪 Testando transformação de dados Trello...');

  // Mock de um card do Trello
  const mockTrelloCard: TrelloCard = {
    id: 'test-card-123',
    name: 'Projeto de Teste - Integração N8N',
    desc: 'Descrição do projeto de teste para validar a transformação de dados',
    due: '2024-12-31T23:59:59.000Z',
    dateLastActivity: '2024-01-15T10:30:00.000Z',
    list: {
      id: 'list-123',
      name: 'Em andamento',
    },
    labels: [
      { id: 'label-1', name: 'N8N', color: 'purple' },
      { id: 'label-2', name: 'Alta Prioridade', color: 'red' },
    ],
    members: [
      { id: 'member-1', fullName: 'Guilherme Souza', username: 'guilherme' },
    ],
    checklists: [
      {
        id: 'checklist-1',
        name: 'Tarefas',
        checkItems: [
          { id: 'item-1', name: 'Configurar webhook', state: 'complete' },
          { id: 'item-2', name: 'Testar integração', state: 'incomplete' },
          { id: 'item-3', name: 'Documentar processo', state: 'incomplete' },
        ],
      },
    ],
  };

  try {
    const transformedProject =
      transformTrelloCardToPrismaProject(mockTrelloCard);

    console.log('✅ Transformação bem-sucedida:');
    console.log('  - Título:', transformedProject.title);
    console.log('  - Status:', transformedProject.status);
    console.log('  - Progresso:', transformedProject.progress + '%');
    console.log('  - Plataformas:', transformedProject.platforms);
    console.log('  - Responsáveis:', transformedProject.responsible);
    console.log('  - Prioridade:', transformedProject.priority);
    console.log('  - Labels:', transformedProject.labels);

    // Validações básicas
    if (transformedProject.title.length === 0) {
      throw new Error('Título não pode estar vazio');
    }

    if (transformedProject.progress < 0 || transformedProject.progress > 100) {
      throw new Error('Progresso deve estar entre 0 e 100');
    }

    if (transformedProject.platforms.length === 0) {
      throw new Error('Deve ter pelo menos uma plataforma');
    }

    if (transformedProject.responsible.length === 0) {
      throw new Error('Deve ter pelo menos um responsável');
    }

    console.log('🎉 Teste de transformação passou!');

    return true;
  } catch (error) {
    console.error('❌ Erro na transformação:', error);

    return false;
  }
}

/**
 * Executa todos os testes
 */
export async function runAllTests() {
  console.log('🚀 Executando suite de testes da Fase 1...\n');

  const transformationTest = testTrelloTransformation();
  const databaseTest = await testDatabaseOperations();

  const allPassed = transformationTest && databaseTest;

  console.log('\n📊 Resultado dos Testes:');
  console.log(
    '  - Transformação Trello:',
    transformationTest ? '✅ PASSOU' : '❌ FALHOU'
  );
  console.log(
    '  - Operações Database:',
    databaseTest ? '✅ PASSOU' : '❌ FALHOU'
  );
  console.log(
    '  - Status Geral:',
    allPassed ? '🎉 TODOS PASSARAM' : '⚠️ ALGUNS FALHARAM'
  );

  return allPassed;
}

// Exporta função para uso em desenvolvimento
// Apenas no servidor/Node.js
export const devTest =
  typeof window === 'undefined' ? () => runAllTests() : undefined;
