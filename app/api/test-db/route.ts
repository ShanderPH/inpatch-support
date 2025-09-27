import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('🧪 Testando conexão do banco no Next.js...');

    // Teste 1: Conexão
    await prisma.$connect();
    console.log('✅ Conexão estabelecida');

    // Teste 2: Query raw
    const rawResult =
      await prisma.$queryRaw`SELECT current_database(), current_user`;

    console.log('✅ Query raw:', rawResult);

    // Teste 3: Count de projetos
    const projectCount = await prisma.project.count();

    console.log('✅ Count projects:', projectCount);

    // Teste 4: FindMany simples
    const projects = await prisma.project.findMany({
      take: 5,
    });

    console.log('✅ FindMany projects:', projects.length);

    return NextResponse.json({
      success: true,
      data: {
        database: rawResult,
        projectCount,
        projects: projects.length,
        message: 'Conexão funcionando perfeitamente!',
      },
    });
  } catch (error) {
    console.error('❌ Erro no teste:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
