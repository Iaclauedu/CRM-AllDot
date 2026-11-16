import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { verificarAutorizacaoApi } from '@/lib/security/api-auth';

function temServiceRoleConfigurada() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    serviceRoleKey &&
      !serviceRoleKey.includes('sua-chave') &&
      !serviceRoleKey.includes('placeholder')
  );
}

function criarClienteDados(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) return null;

  if (temServiceRoleConfigurada() && serviceRoleKey) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey);
  }

  if (!anonKey) return null;

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // read-only inside route handler
      },
    },
  });
}

// DELETE /api/negocios?id=...
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verificarAutorizacaoApi(request);
    if (!auth.autorizado) {
      return NextResponse.json({ erro: auth.motivo }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let negocioId = searchParams.get('id') || '';

    if (!negocioId) {
      try {
        const body = await request.json();
        negocioId = typeof body?.id === 'string' ? body.id.trim() : '';
      } catch {
        // ignore body parse error
      }
    }

    if (!negocioId) {
      return NextResponse.json(
        { erro: 'ID do negócio é obrigatório para exclusão.' },
        { status: 400 }
      );
    }

    const supabase = criarClienteDados(request);
    if (!supabase) {
      return NextResponse.json({ erro: 'Serviço indisponível' }, { status: 500 });
    }

    // 1. Remove dependências vinculadas (produtos, atividades, histórico)
    await supabase.from('negocios_produtos').delete().eq('negocio_id', negocioId);
    await supabase.from('atividades').delete().eq('negocio_id', negocioId);
    await supabase.from('historico_etapas').delete().eq('negocio_id', negocioId);

    // 2. Remove o negócio
    const { error: errNegocio } = await supabase
      .from('negocios')
      .delete()
      .eq('id', negocioId);

    if (errNegocio) {
      console.error('Erro ao excluir negócio no Supabase:', errNegocio);
      return NextResponse.json({ erro: errNegocio.message }, { status: 500 });
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Negócio excluído com sucesso do banco de dados.',
      id: negocioId,
    });
  } catch (err: any) {
    console.error('Erro na rota DELETE /api/negocios:', err);
    return NextResponse.json({ erro: err?.message || 'Erro interno' }, { status: 500 });
  }
}
