import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const ORG_PADRAO_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

function temServiceRoleConfigurada() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    serviceRoleKey &&
      !serviceRoleKey.includes('sua-chave') &&
      !serviceRoleKey.includes('placeholder')
  );
}

function criarClienteSessao(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });
}

function criarClienteDados(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) return null;

  if (temServiceRoleConfigurada() && serviceRoleKey) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey);
  }

  return criarClienteSessao(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseSessao = criarClienteSessao(request);
    const supabase = criarClienteDados(request);
    if (!supabaseSessao || !supabase) {
      return NextResponse.json(
        { erro: 'Serviço indisponível no momento.' },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authErr,
    } = await supabaseSessao.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { erro: 'Sessão autenticada obrigatória para remover membros.' },
        { status: 401 }
      );
    }

    // Garante que apenas usuários Admin da organização possam remover membros
    const { data: vinculoSolicitante, error: errSolicitante } = await supabase
      .from('membros_organizacao')
      .select('cargo')
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .maybeSingle();

    if (errSolicitante || vinculoSolicitante?.cargo !== 'admin') {
      return NextResponse.json(
        { erro: 'Acesso negado: apenas usuários Admin podem remover membros da organização.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const membroId = searchParams.get('id')?.trim();

    if (!membroId) {
      return NextResponse.json(
        { erro: 'ID do membro não informado.' },
        { status: 400 }
      );
    }

    if (membroId === user.id) {
      return NextResponse.json(
        { erro: 'Você não pode remover a si mesmo da organização.' },
        { status: 400 }
      );
    }

    // 1. Remove ou desativa o vínculo na organização
    const { error: errMembro } = await supabase
      .from('membros_organizacao')
      .delete()
      .eq('organizacao_id', ORG_PADRAO_ID)
      .eq('perfil_id', membroId);

    if (errMembro) {
      return NextResponse.json(
        { erro: `Não foi possível remover o vínculo do membro: ${errMembro.message}` },
        { status: 500 }
      );
    }

    // 2. Se for cliente privilegiado, tenta limpar o perfil e o auth.users caso o usuário não tenha outros vínculos
    if (temServiceRoleConfigurada()) {
      const { data: outrosVinculos } = await supabase
        .from('membros_organizacao')
        .select('id')
        .eq('perfil_id', membroId);

      if (!outrosVinculos || outrosVinculos.length === 0) {
        // Desassocia de registros para evitar quebra de foreign keys que não estejam com CASCADE
        await supabase
          .from('empresas')
          .update({ responsavel_id: null })
          .eq('responsavel_id', membroId);

        await supabase
          .from('contatos')
          .update({ responsavel_id: null })
          .eq('responsavel_id', membroId);

        await supabase
          .from('negocios')
          .update({ responsavel_id: null })
          .eq('responsavel_id', membroId);

        await supabase
          .from('perfis')
          .delete()
          .eq('id', membroId);

        try {
          await supabase.auth.admin.deleteUser(membroId);
        } catch (e) {
          console.warn('Usuário auth não existia ou já foi removido:', e);
        }
      }
    }

    return NextResponse.json({
      sucesso: true,
      membroId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao remover membro.';
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
