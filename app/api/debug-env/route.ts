import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envInfo = {
      DATABASE_URL: process.env.DATABASE_URL
        ? 'SET (length: ' + process.env.DATABASE_URL.length + ')'
        : 'NOT SET',
      DIRECT_URL: process.env.DIRECT_URL
        ? 'SET (length: ' + process.env.DIRECT_URL.length + ')'
        : 'NOT SET',
      HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN
        ? 'SET (length: ' + process.env.HUBSPOT_ACCESS_TOKEN.length + ')'
        : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_URL.length + ')'
        : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? 'SET (length: ' +
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length +
          ')'
        : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      // Mostrar apenas os primeiros e últimos caracteres da DATABASE_URL para debug
      DATABASE_URL_PREVIEW: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 30) +
          '...' +
          process.env.DATABASE_URL.substring(
            process.env.DATABASE_URL.length - 30
          )
        : 'NOT SET',
    };

    return NextResponse.json({
      success: true,
      env: envInfo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
