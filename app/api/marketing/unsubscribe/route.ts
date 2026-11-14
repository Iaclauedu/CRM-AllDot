import { NextRequest, NextResponse } from 'next/server';
import { registrarDescadastroPorToken } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const resultado = token ? await registrarDescadastroPorToken(token) : { sucesso: false };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Descadastramento de E-mails</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; max-width: 480px; width: 100%; padding: 32px; box-shadow: 0 10px 25px rgba(15,23,42,0.06); text-align: center; }
    h1 { font-size: 20px; margin: 0 0 10px; }
    p { font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #ecfdf5; color: #047857; margin-bottom: 14px; }
    .err { background: #fef2f2; color: #b91c1c; }
  </style>
</head>
<body>
  <div class="card">
    ${
      resultado.sucesso
        ? `<div class="badge">Descadastramento Confirmado</div>
           <h1>Você não receberá mais nossas campanhas</h1>
           <p>O endereço <strong>${resultado.email || 'informado'}</strong> foi removido da lista de disparos de marketing conforme solicitado.</p>`
        : `<div class="badge err">Link inválido ou expirado</div>
           <h1>Não foi possível localizar este envio</h1>
           <p>Caso continue recebendo mensagens, responda ao e-mail solicitando a remoção manual.</p>`
    }
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const resultado = token ? await registrarDescadastroPorToken(token) : { sucesso: false };
  return NextResponse.json(resultado);
}
