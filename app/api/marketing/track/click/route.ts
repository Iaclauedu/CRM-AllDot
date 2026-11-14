import { NextRequest, NextResponse } from 'next/server';
import { registrarCliquePorToken } from '@/lib/supabase/service';
import {
  urlDestinoSegura,
  verificarAssinaturaLink,
} from '@/lib/security/tracking-hmac';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const url = req.nextUrl.searchParams.get('url');
  const sig = req.nextUrl.searchParams.get('sig');

  // Previne Open Redirect e esquemas perigosos (javascript:, data:, etc.)
  if (!token || !url || !urlDestinoSegura(url) || !verificarAssinaturaLink(token, url, sig)) {
    return NextResponse.redirect(new URL('/', req.url), { status: 302 });
  }

  const ua = req.headers.get('user-agent') || undefined;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined;

  registrarCliquePorToken(token, url, ua, ip).catch((e) =>
    console.warn('Erro ao registrar clique de campanha:', e)
  );

  return NextResponse.redirect(url, { status: 302 });
}
