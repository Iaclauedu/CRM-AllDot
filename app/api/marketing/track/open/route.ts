import { NextRequest, NextResponse } from 'next/server';
import { registrarAberturaPorToken } from '@/lib/supabase/service';

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token) {
    registrarAberturaPorToken(token).catch((e) =>
      console.warn('Erro ao registrar abertura de campanha:', e)
    );
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
