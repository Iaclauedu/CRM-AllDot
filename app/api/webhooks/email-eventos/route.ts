import { NextRequest, NextResponse } from 'next/server';
import {
  registrarAberturaPorToken,
  registrarCliquePorToken,
  registrarDescadastroPorToken,
} from '@/lib/supabase/service';

/**
 * Webhook genérico pronto para receber eventos de provedores de API
 * (Resend, SendGrid, Amazon SES, Mailgun, Postmark) no futuro.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.EMAIL_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        req.headers.get('x-webhook-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (provided !== secret) {
        return NextResponse.json({ sucesso: false, erro: 'Assinatura de webhook inválida.' }, { status: 401 });
      }
    }

    const body = await req.json();
    const eventos = Array.isArray(body) ? body : [body];
    let processados = 0;

    for (const ev of eventos) {
      const tipo = String(ev.type || ev.event || '').toLowerCase();
      const token = ev.tracking_token || ev.token || ev.tags?.tracking_token;
      if (!token) continue;

      if (tipo.includes('open')) {
        await registrarAberturaPorToken(token);
        processados++;
      } else if (tipo.includes('click')) {
        await registrarCliquePorToken(token, ev.url || 'https://alldotcrm');
        processados++;
      } else if (tipo.includes('unsub') || tipo.includes('spam') || tipo.includes('complain')) {
        await registrarDescadastroPorToken(token, `Evento webhook: ${tipo}`);
        processados++;
      }
    }

    return NextResponse.json({ sucesso: true, processados });
  } catch (err) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: err instanceof Error ? err.message : 'Erro ao processar webhook de eventos.',
      },
      { status: 400 }
    );
  }
}
