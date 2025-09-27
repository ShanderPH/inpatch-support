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

    // Teste 3: Count de tickets
    const ticketCount = await prisma.ticket.count();

    console.log('✅ Count tickets:', ticketCount);

    // Teste 4: FindMany simples
    const tickets = await prisma.ticket.findMany({
      take: 5,
    });

    console.log('✅ FindMany tickets:', tickets.length);

    return NextResponse.json({
      success: true,
      data: {
        database: rawResult,
        ticketCount,
        tickets: tickets.length,
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
