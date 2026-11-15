import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function verificarAutorizacaoApi(
  req: NextRequest,
  opcoes?: { permitirCronSecret?: boolean }
): Promise<{ autorizado: boolean; motivo?: string }> {
  // Em desenvolvimento local sem ENFORCE_API_AUTH=true, permite operar sem sessão obrigatória; em produção exige sessão sempre
  if (process.env.NODE_ENV !== 'production' && process.env.ENFORCE_API_AUTH !== 'true') {
    return { autorizado: true };
  }

  if (opcoes?.permitirCronSecret && process.env.CRON_SECRET) {
    const authHeader = req.headers.get('authorization');
    const cronHeader = req.headers.get('x-cron-secret');
    if (
      cronHeader === process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`
    ) {
      return { autorizado: true };
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return { autorizado: false, motivo: 'Configuração Supabase ausente no servidor.' };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // read-only in route auth check
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { autorizado: false, motivo: 'Sessão autenticada obrigatória.' };
  }

  return { autorizado: true };
}
